// report.service.ts
import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import prisma from '../util/prisma';
import { ReportType, DateRangeFilter, PaginationFilter, SortFilter } from '../types/types';

type ReportParams = {
    workspaceId: number;
    filters: DateRangeFilter & PaginationFilter & SortFilter & {
        lastOrders?: string;
        status?: OrderStatus | OrderStatus[];
        paymentStatus?: PaymentStatus | PaymentStatus[];
        threshold?: number;
        hours?: number;
        categoryId?: string;
        productId?: string;
        userId?: string;
    };
};


export const generateReportData = async (
    type: ReportType,
    params: ReportParams
) => {
    switch (type) {
        case 'sales':
            return generateSalesReport(params);
        case 'inventory':
            return generateInventoryReport(params);
        case 'customer':
            return generateCustomerReport(params);
        case 'employee-performance':
            return generateEmployeePerformanceReport(params);
        case 'financial-summary':
            return generateFinancialSummaryReport(params);
        case 'product-performance':
            return generateProductPerformanceReport(params);
        case 'order-fulfillment':
            return generateOrderFulfillmentReport(params);
        case 'shipping':
            return generateShippingReport(params);
        case 'low-stock':
            return generateLowStockReport(params);
        case 'abandoned-carts':
            return generateAbandonedCartsReport(params);
        case 'payment-methods':
            return generatePaymentMethodsReport(params);
        case 'category-performance':
            return generateCategoryPerformanceReport(params);
        case 'user-signups':
            return generateUserSignupsReport(params);
        default:
            throw new Error(`Invalid report type: ${type}`);
    }
};

// ================== Helper Functions ==================
export const buildDateFilter = (filters: DateRangeFilter) => ({
    gte: filters.startDate ? new Date(filters.startDate) : undefined,
    lte: filters.endDate ? new Date(filters.endDate) : undefined,
});

export const buildOrderWhereClause = (params: ReportParams): Prisma.OrderWhereInput => ({
    workspaceId: params.workspaceId,
    placedAt: buildDateFilter(params.filters),
    status: params.filters.status
        ? { in: Array.isArray(params.filters.status) ? params.filters.status : [params.filters.status] }
        : undefined,
    paymentStatus: params.filters.paymentStatus
        ? { in: Array.isArray(params.filters.paymentStatus) ? params.filters.paymentStatus : [params.filters.paymentStatus] }
        : undefined,
});

export const applySorting = <T>(data: T[], sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): T[] => {
    if (!sortBy) return data;

    return [...data].sort((a: any, b: any) => {
        if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
};

export const paginateData = <T>(data: T[], page?: number, pageSize?: number): T[] => {
    if (!page || !pageSize) return data;
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
};

// ================== Report Generators ==================
export const generateSalesReport = async ({ workspaceId, filters }: ReportParams) => {
    const whereClause = buildOrderWhereClause({ workspaceId, filters });

    const [orders, products, categories] = await Promise.all([
        prisma.order.findMany({
            where: whereClause,
            include: {
                items: {
                    include: {
                        variant: {
                            select: {
                                productId: true,
                                price: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.product.findMany({
            where: { workspaceId },
            select: { id: true, name: true },
        }),
        prisma.category.findMany({
            where: { workspaceId },
            select: { id: true, name: true },
        }),
    ]);

    // Process order data
    const dailySales: Record<string, number> = {};
    const productSales: Record<string, { quantity: number; revenue: number }> = {};
    const categorySales: Record<string, number> = {};

    orders.forEach(order => {
        // Daily sales
        const dateKey = order.placedAt.toISOString().split('T')[0];
        dailySales[dateKey] = (dailySales[dateKey] || 0) + order.totalAmount;

        // Product and category sales
        order.items.forEach(item => {
            const product = products.find(p => p.id === item.variant.productId);
            if (product) {
                productSales[product.id] = productSales[product.id] || { quantity: 0, revenue: 0 };
                productSales[product.id].quantity += item.quantity;
                productSales[product.id].revenue += item.price * item.quantity;
            }
        });
    });

    // Process category sales (would need product-category mapping)
    products.forEach(product => {
        // This assumes a simple one-to-one category relationship
        // Adjust based on your actual category relationships
    });

    return {
        summary: {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
            averageOrderValue: orders.length ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0,
        },
        dailySales: Object.entries(dailySales).map(([date, amount]) => ({ date, amount })),
        productSales: Object.entries(productSales).map(([productId, stats]) => ({
            productId,
            productName: products.find(p => p.id === productId)?.name || 'Unknown',
            ...stats,
        })),
        categorySales: Object.entries(categorySales).map(([categoryId, revenue]) => ({
            categoryId,
            categoryName: categories.find(c => c.id === categoryId)?.name || 'Unknown',
            revenue,
        })),
    };
};

export const generateInventoryReport = async ({ workspaceId, filters }: ReportParams) => {
    const products = await prisma.product.findMany({
        where: {
            workspaceId,
            categoryId: filters.categoryId || undefined,
        },
        include: {
            variants: {
                include: {
                    _count: {
                        select: { orderItems: true },
                    },
                },
            },
            category: true,
        },
    });

    const inventoryData = products.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category?.name,
        variants: product.variants.length,
        totalStock: product.variants.reduce((sum, v) => sum + v.stock, 0),
        totalSold: product.variants.reduce((sum, v) => sum + (v._count?.orderItems || 0), 0),
        inventoryValue: product.variants.reduce((sum, v) => sum + (v.price * v.stock), 0),
    }));

    const sortedData = applySorting(
        inventoryData,
        filters.sortBy,
        filters.sortOrder as 'asc' | 'desc'
    );

    return paginateData(sortedData, filters.page, filters.pageSize);
};

export const generateCustomerReport = async ({ workspaceId, filters }: ReportParams) => {
    const whereClause = {
        orders: {
            some: {
                workspaceId,
                placedAt: buildDateFilter(filters),
            },
        },
    };

    const customers = await prisma.user.findMany({
        where: whereClause,
        include: {
            _count: {
                select: { orders: true },
            },
            orders: {
                where: { workspaceId },
                select: { totalAmount: true, placedAt: true },
                orderBy: { placedAt: 'desc' },
                take: filters.lastOrders ? parseInt(filters.lastOrders as string) : undefined,
            },
        },
    });

    const customerData = customers.map(customer => ({
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        totalOrders: customer._count.orders,
        totalSpent: customer.orders.reduce((sum, o) => sum + o.totalAmount, 0),
        avgOrderValue: customer._count.orders
            ? customer.orders.reduce((sum, o) => sum + o.totalAmount, 0) / customer._count.orders
            : 0,
        lastOrderDate: customer.orders[0]?.placedAt || null,
    }));

    const sortedData = applySorting(
        customerData,
        filters.sortBy,
        filters.sortOrder as 'asc' | 'desc'
    );

    return paginateData(sortedData, filters.page, filters.pageSize);
};

export const generateEmployeePerformanceReport = async ({ workspaceId, filters }: ReportParams) => {
    const users = await prisma.user.findMany({
        where: {
            UserRole: {
                some: {
                    workspaceId,
                    role: { in: ['ADMIN', 'MANAGER', 'STAFF'] },
                },
            },
        },
        include: {
            _count: {
                select: { OrderStatusHistory: true },
            },
            OrderStatusHistory: {
                where: {
                    order: {
                        workspaceId,
                        placedAt: buildDateFilter(filters),
                    },
                },
                select: {
                    status: true,
                    createdAt: true,
                },
            },
        },
    });

    return users.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalActions: user._count.OrderStatusHistory,
        processedOrders: user.OrderStatusHistory.filter(
            h => h.status === 'PROCESSING'
        ).length,
        completedOrders: user.OrderStatusHistory.filter(
            h => h.status === 'DELIVERED'
        ).length,
        lastActivity: user.OrderStatusHistory[0]?.createdAt || null,
    }));
};

export const generateFinancialSummaryReport = async ({ workspaceId, filters }: ReportParams) => {
    const whereClause = buildOrderWhereClause({ workspaceId, filters });

    const [
        totalRevenue,
        totalOrders,
        paymentStatusCounts,
        paymentMethodStats,
        refunds,
    ] = await Promise.all([
        prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: whereClause,
        }),
        prisma.order.count({ where: whereClause }),
        prisma.order.groupBy({
            by: ['paymentStatus'],
            _count: { _all: true },
            where: whereClause,
        }),
        prisma.order.groupBy({
            by: ['paymentMethod'],
            _sum: { totalAmount: true },
            _count: { _all: true },
            where: whereClause,
        }),
        prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: {
                ...whereClause,
                paymentStatus: 'REFUNDED',
            },
        }),
    ]);

    return {
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalOrders,
        paymentStatuses: paymentStatusCounts,
        paymentMethods: paymentMethodStats,
        totalRefunds: refunds._sum.totalAmount || 0,
    };
};

export const generateProductPerformanceReport = async ({ workspaceId, filters }: ReportParams) => {
    const products = await prisma.product.findMany({
        where: {
            workspaceId,
            id: filters.productId || undefined,
            categoryId: filters.categoryId || undefined,
        },
        include: {
            variants: {
                include: {
                    orderItems: {
                        where: {
                            order: {
                                placedAt: buildDateFilter(filters),
                            },
                        },
                    },
                },
            },
            category: true,
        },
    });

    const productStats = products.map(product => {
        const stats = product.variants.reduce(
            (acc, variant) => {
                const variantSales = variant.orderItems.reduce(
                    (sum, item) => ({
                        quantity: sum.quantity + item.quantity,
                        revenue: sum.revenue + item.price * item.quantity,
                    }),
                    { quantity: 0, revenue: 0 }
                );

                return {
                    quantity: acc.quantity + variantSales.quantity,
                    revenue: acc.revenue + variantSales.revenue,
                    variants: acc.variants + 1,
                };
            },
            { quantity: 0, revenue: 0, variants: 0 }
        );

        return {
            productId: product.id,
            productName: product.name,
            category: product.category?.name,
            ...stats,
        };
    });

    const sortedData = applySorting(
        productStats,
        filters.sortBy,
        filters.sortOrder as 'asc' | 'desc'
    );

    return paginateData(sortedData, filters.page, filters.pageSize);
};

export const generateLowStockReport = async ({ workspaceId, filters }: ReportParams) => {
    const threshold = filters.threshold ? parseInt(filters.threshold.toString()) : 10;

    const variants = await prisma.productVariant.findMany({
        where: {
            product: { workspaceId },
            stock: { lte: threshold },
            isAvailable: true,
        },
        include: {
            product: {
                select: { name: true, category: true },
            },
        },
        orderBy: { stock: 'asc' },
    });

    return variants.map(variant => ({
        id: variant.id,
        name: variant.title,
        sku: variant.sku,
        stock: variant.stock,
        price: variant.price,
        productName: variant.product.name,
        category: variant.product.category?.name,
    }));
};

export const generateAbandonedCartsReport = async ({ workspaceId, filters }: ReportParams) => {
    const hours = filters.hours ? parseInt(filters.hours.toString()) : 24;
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    const cartItems = await prisma.cartItem.findMany({
        where: {
            updatedAt: { lte: cutoffDate },
            variant: { product: { workspaceId } },
        },
        include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            variant: {
                include: {
                    product: { select: { name: true } },
                },
            },
        },
        distinct: ['userId'],
    });

    return cartItems.map(item => ({
        userId: item.user.id,
        userName: `${item.user.firstName} ${item.user.lastName}`,
        userEmail: item.user.email,
        productName: item.variant.product.name,
        variantName: item.variant.title,
        price: item.variant.price,
        lastUpdated: item.updatedAt,
    }));
};

// ================== Additional Report Generators ==================
export const generateOrderFulfillmentReport = async ({ workspaceId, filters }: ReportParams) => {
    const statusCounts = await prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: {
            workspaceId,
            placedAt: buildDateFilter(filters),
        },
    });

    const avgProcessingTime = await prisma.$queryRaw<{ avg_hours: number }[]>`
    SELECT AVG(EXTRACT(EPOCH FROM (os.createdAt - o.placedAt)/3600) as avg_hours
    FROM "Order" o
    JOIN "OrderStatusHistory" os ON o.id = os.orderId
    WHERE o.workspaceId = ${workspaceId}
    AND os.status = 'DELIVERED'
    AND o.status = 'DELIVERED'
    ${filters.startDate ? Prisma.sql`AND o.placedAt >= ${new Date(filters.startDate)}` : Prisma.empty}
    ${filters.endDate ? Prisma.sql`AND o.placedAt <= ${new Date(filters.endDate)}` : Prisma.empty}
  `;

    return {
        statusDistribution: statusCounts,
        averageProcessingTime: avgProcessingTime[0]?.avg_hours || 0,
    };
};

export const generateShippingReport = async ({ workspaceId, filters }: ReportParams) => {
    const shippingData = await prisma.order.groupBy({
        by: ['shippingAddressId'],
        _count: { _all: true },
        _sum: { totalAmount: true },
        where: {
            workspaceId,
            placedAt: buildDateFilter(filters),
        },
    });

    const shippingAddresses = await prisma.address.findMany({
        where: {
            id: { in: shippingData.map(item => item.shippingAddressId) },
        },
        select: {
            id: true,
            city: true,
            region: true,
        },
    });

    return shippingData.map(item => {
        const address = shippingAddresses.find(addr => addr.id === item.shippingAddressId);
        return {
            city: address?.city || 'Unknown',
            region: address?.region || 'Unknown',
            orderCount: item._count._all,
            totalRevenue: item._sum.totalAmount,
        };
    });
};

export const generatePaymentMethodsReport = async ({ workspaceId, filters }: ReportParams) => {
    return await prisma.order.groupBy({
        by: ['paymentMethod'],
        _count: { _all: true },
        _sum: { totalAmount: true },
        where: {
            workspaceId,
            placedAt: buildDateFilter(filters),
        },
        orderBy: {
            _sum: {
                totalAmount: 'desc',
            },
        },
    });
};

export const generateCategoryPerformanceReport = async ({ workspaceId, filters }: ReportParams) => {
    const categories = await prisma.category.findMany({
        where: { workspaceId },
        include: {
            products: {
                include: {
                    variants: {
                        include: {
                            orderItems: {
                                where: {
                                    order: {
                                        placedAt: buildDateFilter(filters),
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    return categories.map(category => {
        const stats = category.products.reduce(
            (acc, product) => {
                const productStats = product.variants.reduce(
                    (sum, variant) => {
                        const variantSales = variant.orderItems.reduce(
                            (itemSum, item) => ({
                                quantity: itemSum.quantity + item.quantity,
                                revenue: itemSum.revenue + item.price * item.quantity,
                            }),
                            { quantity: 0, revenue: 0 }
                        );
                        return {
                            quantity: sum.quantity + variantSales.quantity,
                            revenue: sum.revenue + variantSales.revenue,
                            variants: sum.variants + 1,
                        };
                    },
                    { quantity: 0, revenue: 0, variants: 0 }
                );

                return {
                    quantity: acc.quantity + productStats.quantity,
                    revenue: acc.revenue + productStats.revenue,
                    products: acc.products + 1,
                    variants: acc.variants + productStats.variants,
                };
            },
            { quantity: 0, revenue: 0, products: 0, variants: 0 }
        );

        return {
            categoryId: category.id,
            categoryName: category.name,
            ...stats,
        };
    });
};

export const generateUserSignupsReport = async ({ workspaceId, filters }: ReportParams) => {
    const users = await prisma.user.findMany({
        where: {
            createdAt: buildDateFilter(filters),
            workspaces: {
                some: {
                    id: workspaceId,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return users.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        signupDate: user.createdAt,
        status: user.status,
        lastLogin: user.lastLogin,
    }));
};