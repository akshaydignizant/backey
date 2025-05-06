import { PrismaClient, ProductVariant } from '@prisma/client';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { IProductVariant, IStockFilter, IStockUpdate } from '../types/products/stock.interface';
import sendEmail from '../util/sendEmail';
import { generateLowStockEmailHtml } from '../emailTemplate/lowStockEmail';

// Initialize Prisma Client
const prisma = new PrismaClient({ log: ['error'] });

// Validation schemas
const optionsSchema = z.object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
}).strict();

const addItemSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    title: z.string().min(1, 'Title is required').max(100),
    sku: z.string().min(1, 'SKU is required').max(50),
    price: z.number().positive('Price must be positive'),
    stock: z.number().int().nonnegative('Stock must be non-negative'),
    size: z.string().max(50).optional(),
    isAvailable: z.boolean().default(true),
});

const updateItemSchema = z.object({
    title: z.string().min(1).max(100).optional(),
    sku: z.string().min(1).max(50).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().nonnegative().optional(),
    size: z.string().max(50).optional(),
    isAvailable: z.boolean().optional(),
});

const transferSchema = z.object({
    sourceWorkspaceId: z.number().int().positive('Invalid source workspace ID'),
    destinationWorkspaceId: z.number().int().positive('Invalid destination workspace ID'),
    variantId: z.string().uuid('Invalid variant ID'),
    quantity: z.number().int().positive('Quantity must be positive'),
});

const stockUpdateSchema = z.object({
    variantId: z.string().uuid('Invalid variant ID'),
    action: z.enum(['increment', 'decrement', 'set']),
    quantity: z.number().int().nonnegative('Quantity must be non-negative'),
});

export const inventoryService = {
    // Get Inventory: List all variants in a workspace
    async getInventory(workspaceId: number, options: { limit: number; offset: number }) {
        const { limit, offset } = optionsSchema.parse(options);

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true },
        });
        if (!workspace) throw new Error('Workspace not found');

        const [variants, totalItems] = await Promise.all([
            prisma.productVariant.findMany({
                where: { product: { workspaceId } },
                select: {
                    id: true,
                    title: true,
                    sku: true,
                    stock: true,
                    price: true,
                    size: true,
                    isAvailable: true,
                    product: {
                        select: { name: true, slug: true, category: { select: { name: true } } },
                    },
                },
                orderBy: { title: 'asc' },
                take: limit,
                skip: offset,
            }),
            prisma.productVariant.count({ where: { product: { workspaceId } } }),
        ]);

        return {
            workspaceId,
            totalItems,
            items: variants,
            pagination: { limit, offset },
        };
    },

    // Add Inventory Item: Create a new product variant
    async addInventoryItem(workspaceId: number, data: {
        productId: string;
        title: string;
        sku: string;
        price: number;
        stock: number;
        size?: string;
        isAvailable: boolean;
    }) {
        const validatedData = addItemSchema.parse(data);

        const [workspace, product, skuExists] = await Promise.all([
            prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }),
            prisma.product.findUnique({
                where: { id: validatedData.productId },
                select: { id: true, workspaceId: true },
            }),
            prisma.productVariant.findUnique({ where: { sku: validatedData.sku }, select: { id: true } }),
        ]);

        if (!workspace) throw new Error('Workspace not found');
        if (!product || product.workspaceId !== workspaceId) throw new Error('Product not found in workspace');
        if (skuExists) throw new Error('SKU already exists');

        return prisma.productVariant.create({
            data: {
                id: uuid(),
                ...validatedData,
            },
            select: {
                id: true,
                title: true,
                sku: true,
                stock: true,
                price: true,
                size: true,
                isAvailable: true,
                product: { select: { name: true, slug: true } },
            },
        });
    },

    // Update Inventory Item: Modify a product variant
    async updateInventoryItem(workspaceId: number, itemId: string, data: {
        title?: string;
        sku?: string;
        price?: number;
        stock?: number;
        size?: string;
        isAvailable?: boolean;
    }) {
        const validatedData = updateItemSchema.parse(data);

        return prisma.$transaction(async (tx) => {
            const variant = await tx.productVariant.findUnique({
                where: { id: itemId },
                select: {
                    id: true,
                    sku: true,
                    product: { select: { workspaceId: true } },
                },
            });

            if (!variant || variant.product.workspaceId !== workspaceId) {
                throw new Error('Inventory item not found in workspace');
            }

            if (validatedData.sku && validatedData.sku !== variant.sku) {
                const skuExists = await tx.productVariant.findUnique({
                    where: { sku: validatedData.sku },
                    select: { id: true },
                });
                if (skuExists) throw new Error('SKU already exists');
            }

            return tx.productVariant.update({
                where: { id: itemId },
                data: validatedData,
                select: {
                    id: true,
                    title: true,
                    sku: true,
                    stock: true,
                    price: true,
                    size: true,
                    isAvailable: true,
                    product: { select: { name: true, slug: true } },
                },
            });
        });
    },

    // Get Low-Stock Items: List variants with stock below threshold
    async getLowStockItems(workspaceId: number, options: { limit: number; offset: number }) {
        const { limit, offset } = options; // Assuming optionsSchema.parse(options) is handled earlier
        const lowStockThreshold = 10;

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true },
        });
        if (!workspace) throw new Error('Workspace not found');

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

        // Fetch recipients (customize this as needed)
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
            })
                .catch(err => console.error(`Failed to send email to ${r.email}:`, err))
        );
        // Wait for all emails to be sent
        await Promise.all(emailPromises);

        return {
            workspaceId,
            totalLowStock,
            items: variants,
            pagination: { limit, offset },
        };
    },


    // Create Inventory Transfer: Move stock between workspaces
    async createInventoryTransfer(workspaceId: number, userId: string, data: {
        sourceWorkspaceId: number;
        destinationWorkspaceId: number;
        variantId: string;
        quantity: number;
    }) {
        const validatedData = transferSchema.parse(data);

        try {
            return await prisma.$transaction(async (tx) => {
                const [sourceWorkspace, destinationWorkspace, sourceVariant] = await Promise.all([
                    tx.workspace.findUnique({ where: { id: validatedData.sourceWorkspaceId }, select: { id: true } }),
                    tx.workspace.findUnique({ where: { id: validatedData.destinationWorkspaceId }, select: { id: true } }),
                    tx.productVariant.findUnique({
                        where: { id: validatedData.variantId },
                        select: {
                            id: true,
                            stock: true,
                            title: true,
                            sku: true,
                            price: true,
                            size: true,
                            productId: true,
                            product: { select: { workspaceId: true, name: true, categoryId: true } },
                        },
                    }),
                ]);

                if (!sourceWorkspace || sourceWorkspace.id !== workspaceId) {
                    throw new Error('Source workspace not found or invalid');
                }
                if (!destinationWorkspace) throw new Error('Destination workspace not found');
                if (!sourceVariant || sourceVariant.product.workspaceId !== workspaceId) throw new Error('Variant not found in source workspace');
                if (sourceVariant.stock < validatedData.quantity) throw new Error('Insufficient stock for transfer');

                let destinationProduct = await tx.product.findFirst({
                    where: { name: sourceVariant.product.name, workspaceId: validatedData.destinationWorkspaceId },
                    select: { id: true },
                });

                if (!destinationProduct) {
                    destinationProduct = await tx.product.create({
                        data: {
                            id: uuid(),
                            name: sourceVariant.product.name,
                            slug: `${sourceVariant.product.name.toLowerCase().replace(/\s+/g, '-')}-${uuid().slice(0, 8)}`,
                            description: `Transferred product: ${sourceVariant.product.name}`,
                            images: [],
                            isActive: true,
                            categoryId: sourceVariant.product.categoryId,
                            workspaceId: validatedData.destinationWorkspaceId,
                        },
                        select: { id: true },
                    });
                }

                let destinationVariant = await tx.productVariant.findFirst({
                    where: { productId: destinationProduct.id, sku: sourceVariant.sku },
                    select: { id: true, stock: true },
                });

                if (!destinationVariant) {
                    destinationVariant = await tx.productVariant.create({
                        data: {
                            id: uuid(),
                            title: sourceVariant.title,
                            sku: `${sourceVariant.sku}-${uuid().slice(0, 8)}`,
                            price: sourceVariant.price,
                            stock: validatedData.quantity,  // Set initial stock to transfer quantity
                            size: sourceVariant.size,
                            productId: destinationProduct.id,
                            isAvailable: true,
                        },
                        select: { id: true, stock: true },
                    });
                }

                await Promise.all([
                    tx.productVariant.update({
                        where: { id: validatedData.variantId },
                        data: { stock: { decrement: validatedData.quantity } },
                    }),
                    tx.productVariant.update({
                        where: { id: destinationVariant.id },
                        data: { stock: { increment: validatedData.quantity } },
                    }),
                ]);

                // Optional: Send a notification for successful transfer
                await tx.notification.create({
                    data: {
                        userId: userId,  // Replace with actual owner ID
                        workspaceId: validatedData.destinationWorkspaceId,
                        title: 'Inventory Transfer Completed',
                        message: `Successfully transferred ${validatedData.quantity} items of ${sourceVariant.title} to your workspace.`,
                        type: 'STOCK_TRANSFER',
                        isRead: false,
                    },
                });

                return {
                    transferId: uuid(),
                    sourceWorkspaceId: validatedData.sourceWorkspaceId,
                    destinationWorkspaceId: validatedData.destinationWorkspaceId,
                    variantId: validatedData.variantId,
                    quantity: validatedData.quantity,
                    createdAt: new Date(),
                };
            });
        } catch (error) {
            console.error('Error during inventory transfer: ', error);
            throw new Error('There was an error processing the inventory transfer.');
        }
    },

    // Get stock information for a specific variant
    async getVariantStock(variantId: string): Promise<IProductVariant | null> {
        z.string().uuid('Invalid variant ID').parse(variantId);
        return prisma.productVariant.findUnique({
            where: { id: variantId },
            select: {
                id: true,
                title: true,
                sku: true,
                price: true,
                stock: true,
                weight: true,
                dimensions: true,
                color: true,
                size: true,
                isAvailable: true,
                productId: true,
            },
        });
    },

    // Update stock for a variant
    async updateStock(data: IStockUpdate): Promise<IProductVariant> {
        const { variantId, quantity, action } = stockUpdateSchema.parse(data);

        const variant = await prisma.productVariant.findUnique({
            where: { id: variantId },
            select: { id: true, stock: true },
        });
        if (!variant) throw new Error('Variant not found');

        let updateData: { stock?: number | { increment: number } | { decrement: number }; isAvailable?: boolean } = {};

        if (action === 'increment') {
            updateData = { stock: { increment: quantity } };
        } else if (action === 'decrement') {
            if (variant.stock < quantity) throw new Error('Insufficient stock for decrement');
            updateData = { stock: { decrement: quantity } };
        } else {
            updateData = { stock: quantity };
        }

        return prisma.productVariant.update({
            where: { id: variantId },
            data: {
                ...updateData,
                isAvailable: updateData.stock !== undefined ? (typeof updateData.stock === 'number' ? updateData.stock > 0 : true) : undefined,
            },
            select: {
                id: true,
                title: true,
                sku: true,
                price: true,
                stock: true,
                weight: true,
                dimensions: true,
                color: true,
                size: true,
                isAvailable: true,
                productId: true,
            },
        });
    },

    // List variants with stock information based on filters
    async listStock(filters: IStockFilter): Promise<IProductVariant[]> {
        const where: any = {};

        // Parse productId if needed
        if (filters.productId) where.productId = filters.productId;

        // Coerce min/max stock to numbers
        const minStock = filters.minStock !== undefined ? Number(filters.minStock) : undefined;
        const maxStock = filters.maxStock !== undefined ? Number(filters.maxStock) : undefined;

        if (!isNaN(minStock ?? NaN) || !isNaN(maxStock ?? NaN)) {
            where.stock = {};
            if (!isNaN(minStock ?? NaN)) where.stock.gte = minStock;
            if (!isNaN(maxStock ?? NaN)) where.stock.lte = maxStock;
        }

        // Coerce isAvailable to boolean
        if (filters.isAvailable !== undefined) {
            if (typeof filters.isAvailable === 'string') {
                where.isAvailable = filters.isAvailable === 'true';
            } else {
                where.isAvailable = filters.isAvailable;
            }
        }

        return prisma.productVariant.findMany({
            where,
            select: {
                id: true,
                title: true,
                sku: true,
                price: true,
                stock: true,
                weight: true,
                dimensions: true,
                color: true,
                size: true,
                isAvailable: true,
                productId: true,
            },
            orderBy: { stock: 'asc' },
        });
    },

    // Get low stock items (below threshold)
    async getLowStock(threshold: number = 5): Promise<IProductVariant[]> {
        return prisma.productVariant.findMany({
            where: { stock: { lte: threshold } },
            select: {
                id: true,
                title: true,
                sku: true,
                price: true,
                stock: true,
                weight: true,
                dimensions: true,
                color: true,
                size: true,
                isAvailable: true,
                productId: true,
            },
            orderBy: { stock: 'asc' },
        });
    },
    adjustStock: async (
        variantId: string,
        quantityDelta: number,
        reason?: string
    ): Promise<void> => {
        try {
            await prisma.productVariant.update({
                where: { id: variantId },
                data: {
                    stock: {
                        increment: quantityDelta,
                    },
                },
            });

        } catch (error) {
            throw new Error('Failed to adjust inventory stock');
        }
    },
};

// Graceful Prisma Client shutdown
process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});