import { PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';

// Initialize Prisma Client
const prisma = new PrismaClient({ log: ['error'] });

// Validation schema for report options
const reportOptionsSchema = z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
}).strict();

export const reportService = {
    // Sales Report: Revenue, top products, and order trends
    async getSalesReport(workspaceId: number, options: { startDate?: Date; endDate?: Date; limit: number; offset: number }) {
        const { startDate, endDate, limit, offset } = reportOptionsSchema.parse(options);

        // Validate workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true },
        });
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Aggregate total revenue and order count
        const [totalRevenue, orderCount, topProducts] = await Promise.all([
            prisma.order.aggregate({
                where: {
                    workspaceId,
                    status: { in: ['PROCESSING', 'DELIVERED'] },
                    placedAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                _sum: { totalAmount: true },
                _count: { id: true },
            }),
            prisma.order.groupBy({
                by: ['status'],
                where: {
                    workspaceId,
                    placedAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                _count: { id: true },
            }),
            prisma.orderItem.groupBy({
                by: ['variantId'],
                where: {
                    order: {
                        workspaceId,
                        status: { in: ['PROCESSING', 'DELIVERED'] },
                        placedAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                },
                _sum: { quantity: true },
                _count: { id: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5,
            }).then(async (results) => {
                const variantIds = results.map((r) => r.variantId);
                const variants = await prisma.productVariant.findMany({
                    where: { id: { in: variantIds } },
                    select: {
                        id: true,
                        title: true,
                        product: { select: { name: true, slug: true } },
                    },
                });
                return results.map((result) => ({
                    variant: variants.find((v) => v.id === result.variantId),
                    totalQuantity: result._sum.quantity,
                    orderCount: result._count.id,
                }));
            }),
        ]);

        return {
            workspaceId,
            period: { startDate, endDate },
            totalRevenue: totalRevenue._sum.totalAmount || 0,
            totalOrders: totalRevenue._count.id || 0,
            orderStatusBreakdown: orderCount,
            topProducts,
            pagination: { limit, offset },
        };
    },

    // Inventory Report: Stock levels and low-stock alerts
    async getInventoryReport(workspaceId: number, options: { limit: number; offset: number }) {
        const { limit, offset } = reportOptionsSchema.parse(options);

        // Validate workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true },
        });
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Fetch variants with low stock (threshold: 10)
        const variants = await prisma.productVariant.findMany({
            where: {
                product: { workspaceId },
                isAvailable: true,
            },
            select: {
                id: true,
                title: true,
                sku: true,
                stock: true,
                price: true,
                product: { select: { name: true, slug: true, category: { select: { name: true } } } },
            },
            orderBy: { stock: 'asc' },
            take: limit,
            skip: offset,
        });

        const lowStockThreshold = 10;
        const lowStockItems = variants.filter((v) => v.stock <= lowStockThreshold);
        const totalItems = await prisma.productVariant.count({
            where: { product: { workspaceId }, isAvailable: true },
        });

        return {
            workspaceId,
            totalItems,
            lowStockCount: lowStockItems.length,
            lowStockItems,
            allItems: variants,
            pagination: { limit, offset },
        };
    },

    // Customer Report: Order frequency and top spenders
    async getCustomerReport(workspaceId: number, options: { startDate?: Date; endDate?: Date; limit: number; offset: number }) {
        const { startDate, endDate, limit, offset } = reportOptionsSchema.parse(options);

        // Validate workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true },
        });
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Aggregate customer data
        const customers = await prisma.user.findMany({
            where: {
                workspaces: { some: { id: workspaceId } },
                UserRole: {
                    some: {
                        workspaceId,
                        role: Role.CUSTOMER,
                    },
                },
                orders: {
                    some: {
                        workspaceId,
                        placedAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                orders: {
                    where: {
                        workspaceId,
                        placedAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    select: { id: true, totalAmount: true, placedAt: true },
                },
            },
            orderBy: { orders: { _count: 'desc' } },
            take: limit,
            skip: offset,
        });

        const totalCustomers = await prisma.user.count({
            where: {
                workspaces: { some: { id: workspaceId } },
                UserRole: {
                    some: {
                        workspaceId,
                        role: Role.CUSTOMER,
                    },
                },
            },
        });

        const customerSummary = customers.map((customer) => ({
            id: customer.id,
            name: `${customer.firstName} ${customer.lastName || ''}`.trim(),
            email: customer.email,
            orderCount: customer.orders.length,
            totalSpent: customer.orders.reduce((sum, order) => sum + order.totalAmount, 0),
            lastOrderDate: customer.orders[0]?.placedAt,
        }));

        return {
            workspaceId,
            totalCustomers,
            topCustomers: customerSummary,
            pagination: { limit, offset },
        };
    },

    // Employee Performance Report: Staff activity
    async getEmployeePerformanceReport(workspaceId: number, options: { startDate?: Date; endDate?: Date; limit: number; offset: number }) {
        const { startDate, endDate, limit, offset } = reportOptionsSchema.parse(options);

        // Validate workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true },
        });
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Fetch employees (ADMIN, MANAGER, STAFF)
        const employees = await prisma.user.findMany({
            where: {
                workspaces: { some: { id: workspaceId } },
                UserRole: {
                    some: {
                        workspaceId,
                        role: { in: [Role.ADMIN, Role.MANAGER, Role.STAFF] },
                    },
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                UserRole: {
                    where: { workspaceId },
                    select: { role: true },
                },
                invitationsSent: {
                    where: {
                        workspaceId,
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    select: { id: true, createdAt: true },
                },
                orders: {
                    where: {
                        workspaceId,
                        placedAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    select: { id: true, totalAmount: true },
                },
            },
            orderBy: { orders: { _count: 'desc' } },
            take: limit,
            skip: offset,
        });

        const totalEmployees = await prisma.user.count({
            where: {
                workspaces: { some: { id: workspaceId } },
                UserRole: {
                    some: {
                        workspaceId,
                        role: { in: [Role.ADMIN, Role.MANAGER, Role.STAFF] },
                    },
                }
            },
        });

        const employeeSummary = employees.map((employee) => ({
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName || ''}`.trim(),
            email: employee.email,
            // role: employee.role,
            roles: employee.UserRole.map((ur) => ur.role),
            orderCount: employee.orders.length,
            totalOrderValue: employee.orders.reduce((sum, order) => sum + order.totalAmount, 0),
            invitationsSent: employee.invitationsSent.length,
        }));

        return {
            workspaceId,
            totalEmployees,
            topEmployees: employeeSummary,
            pagination: { limit, offset },
        };
    },
};

// Graceful Prisma Client shutdown
process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});