// financial.controller.ts
import { Request, Response } from 'express';
import prisma from '../../util/prisma';
import { ReportParams } from '../../types/types';
import { buildDateFilter } from '../report.controller';

export const getFinancialSummaryReport = async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const whereClause = {
      workspaceId: Number(workspaceId),
      createdAt: {
        gte: startDate ? new Date(startDate as string) : undefined,
        lte: endDate ? new Date(endDate as string) : undefined,
      },
    };

    const [totalRevenue, totalOrders, paymentStatusCounts, paymentMethodStats] = await Promise.all([
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
        where: whereClause,
      }),
    ]);

    res.json({
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalOrders,
      paymentStatuses: paymentStatusCounts,
      paymentMethods: paymentMethodStats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate financial summary report' });
  }
};

export const getPaymentMethodReport = async (req: Request, res: Response) => {
  const { workspaceId } = req.params;

  try {
    const paymentMethods = await prisma.order.groupBy({
      by: ['paymentMethod'],
      _count: { _all: true },
      _sum: { totalAmount: true },
      where: { workspaceId: Number(workspaceId) },
    });

    res.json(paymentMethods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate payment method report' });
  }
};

export const generateTaxReport = async ({ workspaceId, filters }: ReportParams) => {
  // Assuming tax is stored as a field in Order or calculated as percentage
  const orders = await prisma.order.findMany({
    where: {
      workspaceId,
      placedAt: buildDateFilter(filters),
    },
    select: {
      id: true,
      totalAmount: true,
      paymentStatus: true,
      placedAt: true,
      paymentDetails: true, // Assuming tax info might be here
    },
  });

  // Example tax calculation (adjust based on your business logic)
  const taxRate = 0.08; // 8% tax rate example
  const reportData = orders.map(order => {
    const taxAmount = order.totalAmount * taxRate;
    return {
      orderId: order.id,
      date: order.placedAt,
      subtotal: order.totalAmount / (1 + taxRate),
      taxAmount,
      total: order.totalAmount,
      paymentStatus: order.paymentStatus,
    };
  });

  return {
    summary: {
      totalTax: reportData.reduce((sum, o) => sum + o.taxAmount, 0),
      totalSales: reportData.reduce((sum, o) => sum + o.subtotal, 0),
      totalTransactions: reportData.length,
    },
    transactions: reportData,
  };
};