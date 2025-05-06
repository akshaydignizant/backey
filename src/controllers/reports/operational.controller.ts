// operational.controller.ts
import { NextFunction, Request, Response } from 'express';
import prisma from '../../util/prisma';
import { buildDateFilter } from '../report.controller';
import { ReportParams } from '../../types/types';
import httpError from '../../util/httpError';

export const getOrderFulfillmentReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { workspaceId } = req.params;

  try {
    const workspaceIdNum = parseInt(workspaceId, 10);

    if (isNaN(workspaceIdNum)) {
      return httpError(next, Error('Invalid workspaceId'), req, 400);
    }

    // 1. Get order status distribution
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: {
        workspaceId: workspaceIdNum,
      },
    });

    // 2. Get average processing time in hours (from placedAt to DELIVERED status creation)
    const avgProcessingResult = await prisma.$queryRawUnsafe<{ avg_hours: number }[]>(`
      SELECT AVG(EXTRACT(EPOCH FROM (osh."createdAt" - o."placedAt")) / 3600) AS avg_hours
      FROM "Order" o
      JOIN "OrderStatusHistory" osh ON o.id = osh."orderId"
      WHERE o."workspaceId" = ${workspaceIdNum}
        AND o."status" = 'DELIVERED'
        AND osh."status" = 'DELIVERED'
    `);

    const averageProcessingTime = avgProcessingResult[0]?.avg_hours || 0;

    res.json({
      statusDistribution: statusCounts,
      averageProcessingTime,
    });
  } catch (error) {
    console.error('[Order Fulfillment Report Error]', error);
    res.status(500).json({ error: 'Failed to generate order fulfillment report' });
  }
};

export const getShippingReport = async (req: Request, res: Response) => {
  const { workspaceId } = req.params;

  try {
    const shippingData = await prisma.order.groupBy({
      by: ['shippingAddressId'],
      _count: { _all: true },
      where: { workspaceId: Number(workspaceId) },
    });

    const shippingAddresses = await prisma.address.findMany({
      where: {
        id: { in: shippingData.map(data => data.shippingAddressId) },
      },
      select: {
        id: true,
        city: true,
        region: true,
      },
    });

    const enrichedShippingData = shippingData.map(data => ({
      ...data,
      shippingAddress: shippingAddresses.find(address => address.id === data.shippingAddressId),
    }));

    res.json(shippingData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate shipping report' });
  }
};

export const generateWorkspaceActivityReport = async ({ workspaceId, filters }: ReportParams) => {
  // 1. Get basic workspace info
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          products: true,
          orders: true,
        },
      },
    },
  });

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  // 2. Get date-filtered metrics
  const dateFilter = buildDateFilter(filters);

  const [
    recentOrders,
    activeUsers,
    newSignups,
    productActivity,
    orderStatusCounts,
    revenueData,
  ] = await Promise.all([
    // Recent orders
    prisma.order.findMany({
      where: {
        workspaceId,
        placedAt: dateFilter,
      },
      orderBy: {
        placedAt: 'desc',
      },
      take: 5,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        placedAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),

    // Active users (users with orders)
    prisma.user.count({
      where: {
        workspaces: {
          some: { id: workspaceId },
        },
        orders: {
          some: {
            workspaceId,
            placedAt: dateFilter,
          },
        },
      },
    }),

    // New signups
    prisma.user.count({
      where: {
        workspaces: {
          some: { id: workspaceId },
        },
        createdAt: dateFilter,
      },
    }),

    // Product activity
    prisma.productVariant.findMany({
      where: {
        product: { workspaceId },
        orderItems: {
          some: {
            order: {
              placedAt: dateFilter,
            },
          },
        },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            orderItems: {
              where: {
                order: {
                  placedAt: dateFilter,
                },
              },
            },
          },
        },
      },
      orderBy: {
        orderItems: {
          _count: 'desc',
        },
      },
      take: 5,
    }),

    // Order status counts
    prisma.order.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
      where: {
        workspaceId,
        placedAt: dateFilter,
      },
    }),

    // Revenue data
    prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        workspaceId,
        placedAt: dateFilter,
      },
    }),
  ]);

  // 3. Format the report data
  return {
    workspaceInfo: {
      name: workspace.name,
      createdAt: workspace.createdAt,
      totalUsers: workspace._count.users,
      totalProducts: workspace._count.products,
      totalOrders: workspace._count.orders,
    },
    activityMetrics: {
      startDate: filters.startDate,
      endDate: filters.endDate,
      activeUsers,
      newSignups,
      totalRevenue: revenueData._sum.totalAmount || 0,
      orderStatuses: orderStatusCounts,
    },
    recentActivity: {
      orders: recentOrders.map(order => ({
        id: order.id,
        customer: `${order.user.firstName} ${order.user.lastName}`,
        amount: order.totalAmount,
        status: order.status,
        date: order.placedAt,
      })),
      topProducts: productActivity.map(variant => ({
        id: variant.id,
        name: variant.product.name,
        variant: variant.title,
        orders: variant._count.orderItems,
      })),
    },
    charts: {
      dailyRevenue: await getDailyRevenueData(workspaceId, dateFilter),
      userActivity: await getUserActivityData(workspaceId, dateFilter),
    },
  };
};

// Helper functions for chart data
const getDailyRevenueData = async (workspaceId: number, dateFilter: any) => {
  const dailyData = await prisma.order.groupBy({
    by: ['placedAt'],
    _sum: {
      totalAmount: true,
    },
    where: {
      workspaceId,
      placedAt: dateFilter,
    },
    orderBy: {
      placedAt: 'asc',
    },
  });

  return dailyData.map(day => ({
    date: day.placedAt.toISOString().split('T')[0],
    revenue: day._sum.totalAmount || 0,
  }));
};

const getUserActivityData = async (workspaceId: number, dateFilter: any) => {
  const userActivity = await prisma.user.groupBy({
    by: ['createdAt'],
    _count: {
      _all: true,
    },
    where: {
      workspaces: {
        some: { id: workspaceId },
      },
      createdAt: dateFilter,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return userActivity.map(day => ({
    date: day.createdAt.toISOString().split('T')[0],
    newUsers: day._count._all,
  }));
};