import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import sendEmail from '../util/sendEmail';
import { generateLowStockEmailHtml } from '../emailTemplate/lowStockEmail';
import CronJobManager from './CronjobManager';

// Initialize Prisma Client
const prisma = new PrismaClient({ log: ['error'] });

// Validation schema for options
const optionsSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
}).strict();

// Get Low-Stock Items: List variants with stock below threshold and send alerts
export async function getLowStockItems(workspaceId: number, options: { limit: number; offset: number }) {
  const { limit, offset } = optionsSchema.parse(options);
  const lowStockThreshold = 10;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });
  if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

  const [variants, totalLowStock] = await Promise.all([
    prisma.productVariant.findMany({
      where: {
        product: { workspaceId },
        stock: { lte: lowStockThreshold },
        isAvailable: true,
      },
      select: {
        id: true,
        title: true,
        sku: true,
        stock: true,
        price: true,
        size: true,
        product: {
          select: { name: true, slug: true, category: { select: { name: true } } },
        },
      },
      orderBy: { stock: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.productVariant.count({
      where: {
        product: { workspaceId },
        stock: { lte: lowStockThreshold },
        isAvailable: true,
      },
    }),
  ]);

  // Fetch recipients (admins, managers)
  const recipients = await prisma.user.findMany({
    where: {
      UserRole: { some: { workspaceId, role: { in: ['ADMIN', 'MANAGER'] } } },
    },
    select: { email: true },
  });

  // Generate the email HTML
  const emailHtml = generateLowStockEmailHtml(workspaceId, totalLowStock, variants);

  // Send email to each recipient concurrently
  const emailPromises = recipients.map(r =>
    sendEmail({
      to: r.email,
      subject: `⚠️ Low Stock Alert for Workspace ${workspaceId}`,
      html: emailHtml,
    }).catch(err => {
      console.error(`Failed to send email to ${r.email}:`, err);
      return { email: r.email, status: 'failed', error: err.message };
    })
  );

  // Wait for all email promises to resolve and collect results
  const emailResults = await Promise.all(emailPromises);

  // Log email failures for monitoring
  const failedEmails = emailResults.filter(r =>
    'status' in r && r.status === 'failed'
  );
  if (failedEmails.length > 0) {
    console.warn(`Failed to send ${failedEmails.length} low stock alert emails for workspace ${workspaceId}`);
  }

  return {
    workspaceId,
    totalLowStock,
    items: variants,
    pagination: { limit, offset },
    emailStatus: {
      totalSent: recipients.length,
      failed: failedEmails.length,
    },
  };
}

// Register the cron job with CronJobManager
CronJobManager.scheduleJob('0 0 * * *', 'Low Stock Alert', async () => {
  const workspaces = await prisma.workspace.findMany({ select: { id: true } });
  const limit = 50; // Configurable limit for pagination
  const offset = 0; // Initial offset

  for (const workspace of workspaces) {
    let currentOffset = offset;
    try {
      console.log(`Checking low stock for workspace ${workspace.id}`);
      while (true) {
        const result = await getLowStockItems(workspace.id, { limit, offset: currentOffset });
        console.log(`Workspace ${workspace.id}: ${result.totalLowStock} low stock items found, ${result.emailStatus.totalSent - result.emailStatus.failed}/${result.emailStatus.totalSent} emails sent`);

        // Break if no items or fewer than limit (end of pagination)
        if (result.items.length === 0 || result.items.length < limit) {
          break;
        }

        currentOffset += limit;
      }
    } catch (error) {
      console.error(`Error checking low stock for workspace ${workspace.id}:`, error);
    }
  }
});

// Graceful Prisma Client shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});