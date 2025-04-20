import { PrismaClient, NotificationType } from '@prisma/client';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

// Initialize Prisma Client
const prisma = new PrismaClient({ log: ['error'] });

// Validation schemas
const optionsSchema = z.object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    type: z.enum(['LOW_STOCK', 'ORDER_UPDATE', 'INVITATION', 'SYSTEM']).optional(),
    isRead: z.boolean().optional(),
}).strict();

const createNotificationSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    title: z.string().min(1, 'Title is required').max(100),
    message: z.string().min(1, 'Message is required').max(500),
    type: z.enum(['LOW_STOCK', 'ORDER_UPDATE', 'INVITATION', 'SYSTEM']),
});

export const notificationService = {
    // Get Notifications: List user-specific notifications in a workspace
    async getNotifications(workspaceId: number, userId: string, options: {
        limit: number;
        offset: number;
        type?: NotificationType;
        isRead?: boolean;
    }) {
        const { limit, offset, type, isRead } = optionsSchema.parse(options);

        // Validate workspace and user
        const [workspace, user] = await Promise.all([
            prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }),
            prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
        ]);

        if (!workspace) {
            throw new Error('Workspace not found');
        }
        if (!user) {
            throw new Error('User not found');
        }

        // Fetch notifications
        const [notifications, totalNotifications] = await Promise.all([
            prisma.notification.findMany({
                where: {
                    workspaceId,
                    userId,
                    ...(type ? { type } : {}),
                    ...(isRead !== undefined ? { isRead } : {}),
                },
                select: {
                    id: true,
                    title: true,
                    message: true,
                    type: true,
                    isRead: true,
                    createdAt: true,
                    workspace: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.notification.count({
                where: {
                    workspaceId,
                    userId,
                    ...(type ? { type } : {}),
                    ...(isRead !== undefined ? { isRead } : {}),
                },
            }),
        ]);

        return {
            workspaceId,
            userId,
            totalNotifications,
            notifications,
            pagination: { limit, offset },
        };
    },

    // Create Notification: Add a new notification
    async createNotification(workspaceId: number, data: {
        userId: string;
        title: string;
        message: string;
        type: NotificationType;
    }) {
        const validatedData = createNotificationSchema.parse(data);

        // Validate workspace and user
        const [workspace, user] = await Promise.all([
            prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }),
            prisma.user.findUnique({ where: { id: validatedData.userId }, select: { id: true } }),
        ]);

        if (!workspace) {
            throw new Error('Workspace not found');
        }
        if (!user) {
            throw new Error('User not found');
        }

        // Create notification
        return prisma.notification.create({
            data: {
                id: uuid(),
                ...validatedData,
                workspaceId,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            select: {
                id: true,
                title: true,
                message: true,
                type: true,
                isRead: true,
                createdAt: true,
                user: { select: { email: true } },
                workspace: { select: { name: true } },
            },
        });
    },

    // Mark Notification as Read: Update notification status
    async markNotificationAsRead(workspaceId: number, notificationId: string, userId: string) {
        // Validate workspace, user, and notification
        const [workspace, user, notification] = await Promise.all([
            prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }),
            prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
            prisma.notification.findUnique({
                where: { id: notificationId },
                select: { id: true, userId: true, isRead: true },
            }),
        ]);

        if (!workspace) {
            throw new Error('Workspace not found');
        }
        if (!user) {
            throw new Error('User not found');
        }
        if (!notification) {
            throw new Error('Notification not found');
        }
        if (notification.userId !== userId) {
            throw new Error('Unauthorized: Notification belongs to another user');
        }
        if (notification.isRead) {
            throw new Error('Notification already marked as read');
        }

        // Update notification
        return prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true, updatedAt: new Date() },
            select: {
                id: true,
                title: true,
                message: true,
                type: true,
                isRead: true,
                createdAt: true,
                workspace: { select: { name: true } },
            },
        });
    },

    // Delete Notification: Remove a notification
    async deleteNotification(workspaceId: number, notificationId: string, userId: string) {
        // Validate workspace, user, and notification
        const [workspace, user, notification] = await Promise.all([
            prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }),
            prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
            prisma.notification.findUnique({
                where: { id: notificationId },
                select: { id: true, userId: true },
            }),
        ]);

        if (!workspace) {
            throw new Error('Workspace not found');
        }
        if (!user) {
            throw new Error('User not found');
        }
        if (!notification) {
            throw new Error('Notification not found');
        }
        if (notification.userId !== userId) {
            throw new Error('Unauthorized: Notification belongs to another user');
        }

        // Delete notification
        return prisma.notification.delete({
            where: { id: notificationId },
            select: {
                id: true,
                title: true,
                message: true,
                type: true,
                isRead: true,
                createdAt: true,
            },
        });
    },
};

// Graceful Prisma Client shutdown
process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});