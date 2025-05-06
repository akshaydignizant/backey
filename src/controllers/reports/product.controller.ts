// product.controller.ts
import { Request, Response } from 'express';
import prisma from '../../util/prisma';
import { ReportFilters, ReportParams } from '../../types/types';

export const getProductPerformanceReport = async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { limit = 10, sortBy = 'quantity' } = req.query;

  try {
    const products = await prisma.product.findMany({
      where: { workspaceId: Number(workspaceId) },
      include: {
        variants: {
          include: {
            orderItems: true,
          },
        },
      },
    });

    const productStats = products.map(product => {
      const totalSold = product.variants.reduce((sum, variant) => {
        return sum + variant.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
      }, 0);

      const totalRevenue = product.variants.reduce((sum, variant) => {
        return sum + variant.orderItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
      }, 0);

      return {
        id: product.id,
        name: product.name,
        totalSold,
        totalRevenue,
        variants: product.variants.length,
      };
    });

    // Sort based on query param
    const sortedProducts = [...productStats].sort((a, b) => {
      if (sortBy === 'quantity') return b.totalSold - a.totalSold;
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
      return 0;
    }).slice(0, Number(limit));

    res.json(sortedProducts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate product performance report' });
  }
};

export const getLowStockReport = async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { threshold = 10 } = req.query;

  try {
    const lowStockVariants = await prisma.productVariant.findMany({
      where: {
        product: {
          workspaceId: Number(workspaceId),
        },
        stock: {
          lte: Number(threshold),
        },
        isAvailable: true,
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        stock: 'asc',
      },
    });

    res.json(lowStockVariants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate low stock report' });
  }
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
                    workspaceId,
                  },
                },
                select: {
                  quantity: true,
                  price: true,
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

function buildDateFilter(filters: ReportFilters): any {
  throw new Error('Function not implemented.');
}
