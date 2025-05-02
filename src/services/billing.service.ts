import { PrismaClient, PaymentMethod, BillStatus, BillItem as PrismaBillItem, Prisma } from '@prisma/client';
import logger from '../util/logger';
import { ApiError } from '../error/ApiError';
import { calculateTotalAmount } from '../util/billing';
import { inventoryService } from './inventory.service';

const prisma = new PrismaClient({
    log: [
        { level: 'warn', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'error', emit: 'event' },
    ],
});

// Log Prisma events
prisma.$on('warn', (e) => logger.warn(e));
prisma.$on('info', (e) => logger.info(e));
prisma.$on('error', (e) => logger.error(e));

export const billService = {
    /**
     * Create a new bill with transaction handling
     */
    createBill: async (userId: string, paymentMethod: PaymentMethod, items: PrismaBillItem[]) => {
        if (!items || items.length === 0) {
            throw new ApiError(400, 'Bill items cannot be empty');
        }

        try {
            return await prisma.$transaction(async (tx) => {
                // 🔒 Validate user exists
                const user = await tx.user.findUnique({
                    where: { id: userId },
                });
                if (!user) {
                    throw new ApiError(400, 'Invalid user ID. User does not exist.');
                }

                // 1. Validate all variants exist and have sufficient stock
                const variantIds = items.map(item => item.variantId);
                const variants = await tx.productVariant.findMany({
                    where: { id: { in: variantIds } },
                    select: { id: true, stock: true, price: true }
                });

                if (variants.length !== variantIds.length) {
                    throw new ApiError(404, 'One or more product variants not found');
                }

                // 2. Check stock availability
                const stockIssues = items.filter(item => {
                    const variant = variants.find(v => v.id === item.variantId);
                    return !variant || variant.stock < item.quantity;
                });

                if (stockIssues.length > 0) {
                    throw new ApiError(400, 'Insufficient stock for one or more items');
                }

                // 3. Calculate total amount
                const totalAmount = calculateTotalAmount(items, variants);

                // 4. Create the bill
                const bill = await tx.bill.create({
                    data: {
                        userId,
                        paymentMethod,
                        totalAmount,
                        status: 'PENDING',
                        items: {
                            create: items.map(item => ({
                                variantId: item.variantId,
                                quantity: item.quantity,
                                price: variants.find(v => v.id === item.variantId)!.price,
                            })),
                        },
                    },
                    include: { items: true },
                });

                // 5. Update inventory asynchronously
                Promise.all(items.map(item =>
                    inventoryService.adjustStock(item.variantId, -item.quantity, `Bill ${bill.id}`)
                )).catch(err => logger.error('Failed to update inventory', err));

                return bill;
            });
        } catch (error) {
            logger.error('Failed to create bill', { userId, error });
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to create bill');
        }
    },

    /**
     * Get all bills with pagination and filtering
     */
    getAllBills: async (params: {
        userId?: string;
        status?: BillStatus;
        page?: number;
        limit?: number;
        fromDate?: Date;
        toDate?: Date;
    }) => {
        try {
            const { userId, status, page = 1, limit = 20, fromDate, toDate } = params;
            const skip = (page - 1) * limit;

            const where: Prisma.BillWhereInput = {
                isDeleted: false,
                ...(userId && { userId }),
                ...(status && { status }),
                ...(fromDate && toDate && {
                    createdAt: {
                        gte: fromDate,
                        lte: toDate,
                    },
                }),
            };

            const [bills, total] = await Promise.all([
                prisma.bill.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        items: {
                            include: {
                                variant: {
                                    select: {
                                        title: true,
                                        sku: true,
                                        product: {
                                            select: {
                                                name: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                }),
                prisma.bill.count({ where }),
            ]);

            return {
                data: bills,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            logger.error('Failed to fetch bills', { params, error });
            throw new ApiError(500, 'Failed to fetch bills');
        }
    },

    /**
     * Get bill by ID with detailed information
     */
    getBillById: async (billId: string) => {
        try {
            const bill = await prisma.bill.findUnique({
                where: { id: billId, isDeleted: false },
                include: {
                    items: {
                        include: {
                            variant: {
                                include: {
                                    product: {
                                        select: {
                                            name: true,
                                            description: true,
                                            images: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            });

            if (!bill) {
                throw new ApiError(404, 'Bill not found');
            }

            return bill;
        } catch (error) {
            logger.error('Failed to fetch bill', { billId, error });
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to fetch bill');
        }
    },

    /**
     * Update bill information
     */
    updateBill: async (billId: string, userId: string, data: Prisma.BillUpdateInput) => {
        try {
            const existingBill = await prisma.bill.findUnique({
                where: { id: billId, isDeleted: false },
            });

            if (!existingBill) {
                throw new ApiError(404, 'Bill not found');
            }

            // Prevent certain fields from being updated
            const { totalAmount, items, ...updateData } = data;

            return await prisma.bill.update({
                where: { id: billId },
                data: updateData,
            });
        } catch (error) {
            logger.error('Failed to update bill', { billId, error });
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to update bill');
        }
    },

    /**
     * Soft delete a bill
     */
    deleteBill: async (billId: string) => {
        try {
            const existingBill = await prisma.bill.findUnique({
                where: { id: billId, isDeleted: false },
            });

            if (!existingBill) {
                throw new ApiError(404, 'Bill not found');
            }

            return await prisma.bill.update({
                where: { id: billId },
                data: { isDeleted: true },
            });
        } catch (error) {
            logger.error('Failed to delete bill', { billId, error });
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to delete bill');
        }
    },

    /**
     * Get bills by user with pagination
     */
    getBillsByUser: async (userId: string, page: number = 1, limit: number = 20) => {
        try {
            const skip = (page - 1) * limit;

            const [bills, total] = await Promise.all([
                prisma.bill.findMany({
                    where: { userId, isDeleted: false },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        items: {
                            include: {
                                variant: {
                                    select: {
                                        title: true,
                                        sku: true,
                                    },
                                },
                            },
                        },
                    },
                }),
                prisma.bill.count({ where: { userId, isDeleted: false } }),
            ]);

            return {
                data: bills,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            logger.error('Failed to fetch user bills', { userId, error });
            throw new ApiError(500, 'Failed to fetch user bills');
        }
    },

    /**
     * Get bill items with variant details
     */
    getBillItemsByBill: async (billId: string) => {
        try {
            const items = await prisma.billItem.findMany({
                where: { billId },
                include: {
                    variant: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    description: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!items || items.length === 0) {
                throw new ApiError(404, 'No items found for this bill');
            }

            return items;
        } catch (error) {
            logger.error('Failed to fetch bill items', { billId, error });
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to fetch bill items');
        }
    },

    /**
     * Add items to an existing bill with transaction
     */
    addItemsToBill: async (billId: string, items: Array<{ variantId: string; quantity: number }>) => {
        if (!items || items.length === 0) {
            throw new ApiError(400, 'Items cannot be empty');
        }

        try {
            return await prisma.$transaction(async (tx) => {
                // 1. Verify bill exists and is not deleted
                const bill = await tx.bill.findUnique({
                    where: { id: billId, isDeleted: false },
                });

                if (!bill) {
                    throw new ApiError(404, 'Bill not found');
                }

                // 2. Validate all variants exist and have sufficient stock
                const variantIds = items.map(item => item.variantId);
                const variants = await tx.productVariant.findMany({
                    where: { id: { in: variantIds } },
                    select: { id: true, stock: true, price: true }
                });

                if (variants.length !== variantIds.length) {
                    throw new ApiError(404, 'One or more product variants not found');
                }

                // 3. Check stock availability
                const stockIssues = items.filter(item => {
                    const variant = variants.find(v => v.id === item.variantId);
                    return !variant || variant.stock < item.quantity;
                });

                if (stockIssues.length > 0) {
                    throw new ApiError(400, 'Insufficient stock for one or more items');
                }

                // 4. Create bill items
                const createdItems = await tx.billItem.createMany({
                    data: items.map(item => ({
                        billId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        price: variants.find(v => v.id === item.variantId)!.price,
                    })),
                });

                // 5. Recalculate and update total amount
                const allItems = await tx.billItem.findMany({
                    where: { billId },
                    select: { quantity: true, price: true },
                });

                const newTotalAmount = allItems.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                );

                await tx.bill.update({
                    where: { id: billId },
                    data: { totalAmount: newTotalAmount },
                });

                // 6. Update inventory (async)
                // In your billing service method
                const inventoryUpdates = items.map(item =>
                    inventoryService.adjustStock(
                        item.variantId,
                        -item.quantity,
                        `Bill ${billId}`
                    ).catch(err => {
                        logger.error(`Failed to adjust stock for variant ${item.variantId} in bill ${billId}`, err);
                        // Return void to continue Promise.all
                        return Promise.resolve();
                    })
                );

                // Fire and forget - errors already logged
                Promise.all(inventoryUpdates)
                    .then(() => logger.info(`Inventory updated for bill ${billId}`))
                    .catch(err => logger.error('Unexpected error in inventory updates', err));

                return createdItems;
            });
        } catch (error) {
            logger.error('Failed to add items to bill', { billId, error });
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to add items to bill');
        }
    },

    /**
     * Update a bill item
     */
    updateBillItem: async (itemId: string, data: { quantity?: number }) => {
        if (!data.quantity || data.quantity <= 0) {
            throw new ApiError(400, 'Quantity must be a positive number');
        }

        try {
            return await prisma.$transaction(async (tx) => {
                // 1. Get the existing item
                const item = await tx.billItem.findUnique({
                    where: { id: itemId },
                    include: { bill: true },
                });

                if (!item || item.bill.isDeleted) {
                    throw new ApiError(404, 'Bill item not found');
                }

                // 2. Get the variant to check stock
                const variant = await tx.productVariant.findUnique({
                    where: { id: item.variantId },
                    select: { stock: true, price: true },
                });

                if (!variant) {
                    throw new ApiError(404, 'Product variant not found');
                }

                // 3. Calculate stock difference
                const quantityDifference = data.quantity! - item.quantity;
                if (variant.stock < quantityDifference) {
                    throw new ApiError(400, 'Insufficient stock');
                }

                // 4. Update the item
                const updatedItem = await tx.billItem.update({
                    where: { id: itemId },
                    data: { quantity: data.quantity },
                });

                // 5. Recalculate total amount
                const allItems = await tx.billItem.findMany({
                    where: { billId: item.billId },
                    select: { quantity: true, price: true },
                });

                const newTotalAmount = allItems.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                );

                await tx.bill.update({
                    where: { id: item.billId },
                    data: { totalAmount: newTotalAmount },
                });

                // 6. Update inventory (async)
                inventoryService.adjustStock(
                    item.variantId,
                    -quantityDifference,
                    `Bill ${item.billId} update`
                ).catch(err => logger.error('Failed to update inventory', err));

                return updatedItem;
            });
        } catch (error) {
            logger.error('Failed to update bill item', { itemId, error });
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to update bill item');
        }
    },

    /**
     * Delete a bill item
     */
    deleteBillItem: async (itemId: string) => {
        try {
            return await prisma.$transaction(async (tx) => {
                // 1. Get the existing item
                const item = await tx.billItem.findUnique({
                    where: { id: itemId },
                    include: { bill: true },
                });

                if (!item || item.bill.isDeleted) {
                    throw new ApiError(404, 'Bill item not found');
                }

                // 2. Delete the item
                await tx.billItem.delete({
                    where: { id: itemId },
                });

                // 3. Recalculate total amount
                const remainingItems = await tx.billItem.findMany({
                    where: { billId: item.billId },
                    select: { quantity: true, price: true },
                });

                const newTotalAmount = remainingItems.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                );

                await tx.bill.update({
                    where: { id: item.billId },
                    data: { totalAmount: newTotalAmount },
                });

                // 4. Restock inventory (async)
                inventoryService.adjustStock(
                    item.variantId,
                    item.quantity,
                    `Bill ${item.billId} item removal`
                ).catch(err => logger.error('Failed to update inventory', err));

                return { success: true };
            });
        } catch (error) {
            logger.error('Failed to delete bill item', { itemId, error });
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to delete bill item');
        }
    },

    /**
     * Update bill status with validation
     */
    updateBillStatus: async (billId: string, status: BillStatus) => {
        try {
            const validTransitions: Record<BillStatus, BillStatus[]> = {
                PENDING: ['PROCESSING', 'CANCELLED'],
                PROCESSING: ['PAID', 'CANCELLED'],
                PAID: [],
                CANCELLED: [],
            };

            const bill = await prisma.bill.findUnique({
                where: { id: billId, isDeleted: false },
            });

            if (!bill) {
                throw new ApiError(404, 'Bill not found');
            }

            // Check if status transition is valid
            if (!validTransitions[bill.status].includes(status)) {
                throw new ApiError(400, `Invalid status transition from ${bill.status} to ${status}`);
            }

            const updatedBill = await prisma.bill.update({
                where: { id: billId },
                data: { status },
            });

            // If cancelled, restock items (async)
            if (status === 'CANCELLED') {
                const items = await prisma.billItem.findMany({
                    where: { billId },
                    select: { variantId: true, quantity: true },
                });

                Promise.all(items.map(item =>
                    inventoryService.adjustStock(item.variantId, item.quantity, `Bill ${billId} cancellation`)
                )).catch(err => logger.error('Failed to restock items', err));
            }

            return updatedBill;
        } catch (error) {
            logger.error('Failed to update bill status', { billId, status, error });
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to update bill status');
        }
    },
};