// export.controller.ts
import { Request, Response } from 'express';
import { Parser } from 'json2csv';
import { ReportParams, ReportType } from '../../types/types';
import { buildDateFilter, generateReportData } from '../report.controller';
import prisma from '../../util/prisma';

export const exportReport = async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { type, format = 'csv' } = req.body;

  try {
    const data = await generateReportData(type as ReportType, { workspaceId: Number(workspaceId), filters: {} });

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`${type}-report-${Date.now()}.csv`);
      return res.send(csv);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export report' });
  }
};

export const generateStaffActivityReport = async ({ workspaceId, filters }: ReportParams) => {
  const staffMembers = await prisma.user.findMany({
    where: {
      UserRole: {
        some: {
          workspaceId,
          role: { in: ['ADMIN', 'MANAGER', 'STAFF'] },
        },
      },
    },
    include: {
      OrderStatusHistory: {
        where: {
          createdAt: buildDateFilter(filters),
          order: {
            workspaceId,
          },
        },
        select: {
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          OrderStatusHistory: {
            where: {
              createdAt: buildDateFilter(filters),
              order: {
                workspaceId,
              },
            },
          },
        },
      },
    },
  });

  return staffMembers.map(staff => ({
    id: staff.id,
    name: `${staff.firstName} ${staff.lastName}`,
    email: staff.email,
    totalActions: staff._count.OrderStatusHistory,
    processingCount: staff.OrderStatusHistory.filter(
      h => h.status === 'PROCESSING'
    ).length,
    completedCount: staff.OrderStatusHistory.filter(
      h => h.status === 'DELIVERED'
    ).length,
    lastActivity: staff.OrderStatusHistory[0]?.createdAt || null,
  }));
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
    include: {
      _count: {
        select: {
          orders: {
            where: {
              workspaceId,
            },
          },
        },
      },
    },
  });

  return users.map(user => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    signupDate: user.createdAt,
    status: user.status,
    lastLogin: user.lastLogin,
    orderCount: user._count.orders,
  }));
};

export const generateCustomProductReport = async ({ workspaceId, filters }: ReportParams) => {
  const products = await prisma.product.findMany({
    where: {
      workspaceId,
      categoryId: filters.categoryId || undefined,
      createdAt: buildDateFilter(filters),
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

  return products.map(product => {
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
      createdAt: product.createdAt,
      ...stats,
    };
  });
};