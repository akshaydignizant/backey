import { PrismaClient, ProductVariant } from '@prisma/client';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

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

export const inventoryService = {
    // Get Inventory: List all variants in a workspace
    async getInventory(workspaceId: number, options: { limit: number; offset: number }) {
        const { limit, offset } = optionsSchema.parse(options);

        // Validate workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true },
        });
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Fetch variants
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

        // Validate workspace, product, and SKU
        const [workspace, product, skuExists] = await Promise.all([
            prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }),
            prisma.product.findUnique({
                where: { id: validatedData.productId },
                select: { id: true, workspaceId: true },
            }),
            prisma.productVariant.findUnique({ where: { sku: validatedData.sku }, select: { id: true } }),
        ]);

        if (!workspace) {
            throw new Error('Workspace not found');
        }
        if (!product || product.workspaceId !== workspaceId) {
            throw new Error('Product not found in workspace');
        }
        if (skuExists) {
            throw new Error('SKU already exists');
        }

        // Create variant
        return prisma.productVariant.create({
            data: {
                id: uuid(),
                ...validatedData,
                // createdAt is automatically handled by Prisma
                // updatedAt is automatically handled by Prisma
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
            // Validate variant and workspace
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

            // Check SKU uniqueness if updated
            if (validatedData.sku && validatedData.sku !== variant.sku) {
                const skuExists = await tx.productVariant.findUnique({
                    where: { sku: validatedData.sku },
                    select: { id: true },
                });
                if (skuExists) {
                    throw new Error('SKU already exists');
                }
            }

            // Update variant
            return tx.productVariant.update({
                where: { id: itemId },
                data: {
                    ...validatedData,
                    // updatedAt is automatically handled by Prisma
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
        });
    },

    // Get Low-Stock Items: List variants with stock below threshold
    async getLowStockItems(workspaceId: number, options: { limit: number; offset: number }) {
        const { limit, offset } = optionsSchema.parse(options);
        const lowStockThreshold = 10; // Configurable threshold

        // Validate workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true },
        });
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Fetch low-stock variants
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

        return {
            workspaceId,
            totalLowStock,
            items: variants,
            pagination: { limit, offset },
        };
    },

    // Create Inventory Transfer: Move stock between workspaces
    async createInventoryTransfer(workspaceId: number, data: {
        sourceWorkspaceId: number;
        destinationWorkspaceId: number;
        variantId: string;
        quantity: number;
    }) {
        const validatedData = transferSchema.parse(data);

        return prisma.$transaction(async (tx) => {
            // Validate workspaces and variant
            const [sourceWorkspace, destinationWorkspace, sourceVariant] = await Promise.all([
                tx.workspace.findUnique({
                    where: { id: validatedData.sourceWorkspaceId },
                    select: { id: true },
                }),
                tx.workspace.findUnique({
                    where: { id: validatedData.destinationWorkspaceId },
                    select: { id: true },
                }),
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
            if (!destinationWorkspace) {
                throw new Error('Destination workspace not found');
            }
            if (!sourceVariant || sourceVariant.product.workspaceId !== workspaceId) {
                throw new Error('Variant not found in source workspace');
            }
            if (sourceVariant.stock < validatedData.quantity) {
                throw new Error('Insufficient stock for transfer');
            }

            // Check if the product exists in the destination workspace
            let destinationProduct = await tx.product.findFirst({
                where: {
                    name: sourceVariant.product.name,
                    workspaceId: validatedData.destinationWorkspaceId,
                },
                select: { id: true },
            });

            // If product doesn't exist, create it in the destination workspace
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
                        // createdAt is automatically handled by Prisma
                        // updatedAt is automatically handled by Prisma
                    },
                    select: { id: true },
                });
            }

            // Check if variant exists in destination workspace
            let destinationVariant = await tx.productVariant.findFirst({
                where: {
                    productId: destinationProduct.id,
                    sku: sourceVariant.sku,
                },
                select: { id: true, stock: true },
            });

            // If variant doesn't exist, create it
            if (!destinationVariant) {
                destinationVariant = await tx.productVariant.create({
                    data: {
                        id: uuid(),
                        title: sourceVariant.title,
                        sku: `${sourceVariant.sku}-${uuid().slice(0, 8)}`, // Ensure unique SKU
                        price: sourceVariant.price,
                        stock: 0,
                        size: sourceVariant.size,
                        productId: destinationProduct.id,
                        isAvailable: true,
                        // updatedAt: new Date(),
                    },
                    select: { id: true, stock: true },
                });
            }

            // Update stock
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

            // Log transfer (simplified, could be a new model)
            return {
                transferId: uuid(),
                sourceWorkspaceId: validatedData.sourceWorkspaceId,
                destinationWorkspaceId: validatedData.destinationWorkspaceId,
                variantId: validatedData.variantId,
                quantity: validatedData.quantity,
                createdAt: new Date(),
            };
        });
    },
};

// Graceful Prisma Client shutdown
process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});