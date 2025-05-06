// customer.controller.ts
import { Request, Response } from 'express';
import prisma from '../../util/prisma';
import { ReportParams } from '../../types/types';
import { buildDateFilter } from '../report.controller';

export const getCustomerActivityReport = async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { days = 30 } = req.query;

  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - Number(days));

  try {
    const activeCustomers = await prisma.user.findMany({
      where: {
        orders: {
          some: {
            workspaceId: Number(workspaceId),
            placedAt: {
              gte: dateThreshold,
            },
          },
        },
      },
      include: {
        orders: {
          where: {
            workspaceId: Number(workspaceId),
            placedAt: {
              gte: dateThreshold,
            },
          },
          select: {
            id: true,
            totalAmount: true,
            placedAt: true,
          },
        },
      },
    });

    const customersWithStats = activeCustomers.map(customer => ({
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      orderCount: customer.orders.length,
      totalSpent: customer.orders.reduce((sum, order) => sum + order.totalAmount, 0),
      lastOrderDate: customer.orders.length > 0
        ? new Date(Math.max(...customer.orders.map(o => o.placedAt.getTime())))
        : null,
    }));

    res.json(customersWithStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate customer activity report' });
  }
};

export const getAbandonedCartsReport = async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { hours = 24 } = req.query;

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - Number(hours));

  try {
    const abandonedCarts = await prisma.cartItem.findMany({
      where: {
        user: {
          cart: {
            some: {
              updatedAt: {
                lte: cutoffDate,
              },
            },
          },
        },
        variant: {
          product: {
            workspaceId: Number(workspaceId),
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        variant: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      distinct: ['userId'],
    });

    res.json(abandonedCarts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate abandoned carts report' });
  }
};

export const generateCustomerLoyaltyReport = async ({ workspaceId, filters }: ReportParams) => {
  const customers = await prisma.user.findMany({
    where: {
      orders: {
        some: {
          workspaceId,
          placedAt: buildDateFilter(filters),
        },
      },
    },
    include: {
      orders: {
        where: {
          workspaceId,
          placedAt: buildDateFilter(filters),
        },
        select: {
          totalAmount: true,
          placedAt: true,
        },
      },
    },
  });

  return customers.map(customer => {
    const orderCount = customer.orders.length;
    const totalSpent = customer.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const firstOrder = customer.orders.reduce((min, o) =>
      o.placedAt < min ? o.placedAt : min, new Date()
    );
    const lastOrder = customer.orders.reduce((max, o) =>
      o.placedAt > max ? o.placedAt : max, new Date(0)
    );

    return {
      customerId: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      orderCount,
      totalSpent,
      avgOrderValue: orderCount ? totalSpent / orderCount : 0,
      firstOrderDate: firstOrder,
      lastOrderDate: lastOrder,
      daysSinceLastOrder: Math.floor(
        (new Date().getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)
      ),
    };
  });
};

export const generateCustomSalesReport = async ({ workspaceId, filters }: ReportParams) => {
  const whereClause = {
    workspaceId,
    placedAt: buildDateFilter(filters),
    ...(filters.status && { status: { in: Array.isArray(filters.status) ? filters.status : [filters.status] } }),
    ...(filters.paymentStatus && { paymentStatus: { in: Array.isArray(filters.paymentStatus) ? filters.paymentStatus : [filters.paymentStatus] } }),
  };

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      items: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return {
    summary: {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      avgOrderValue: orders.length ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length : 0,
    },
    orders: orders.map(o => ({
      id: o.id,
      customer: `${o.user.firstName} ${o.user.lastName}`,
      email: o.user.email,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalAmount: o.totalAmount,
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      date: o.placedAt,
    })),
  };
};