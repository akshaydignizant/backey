import { Prisma, PrismaClient } from '@prisma/client';
import winston from 'winston';
import { ProductInput, ProductStatsRaw, VariantStatsRaw } from '../types/product';
import redisClient from '../cache/redisClient';
import { customAlphabet } from 'nanoid';
import { generateSlug } from '../util/slugGenerator';
import { deleteImageFromCloudinary, extractPublicIdFromCloudinaryUrl } from '../util/deleteCloudinary';

const prisma = new PrismaClient();

// Set up winston logger
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});


const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 4);

const getUniqueSlug = async (baseSlug: string): Promise<string> => {
  let slug = baseSlug;
  let exists = await prisma.product.findUnique({ where: { slug } });

  while (exists) {
    slug = `${baseSlug}-${nanoid()}`;
    exists = await prisma.product.findUnique({ where: { slug } });
  }

  return slug;
};
export const productService = {
  createProduct: async (workspaceId: number, categoryId: string, data: ProductInput) => {
    try {
      if (!workspaceId) throw new Error('Invalid workspaceId');
      if (!categoryId) throw new Error('Invalid categoryId');
      if (!data.name?.trim()) throw new Error('Invalid product name');

      const baseSlug = generateSlug(data.name);
      const slug = await getUniqueSlug(baseSlug);
      const { variants = [], ...productData } = data;

      // Create product
      const createdProduct = await prisma.product.create({
        data: {
          ...productData,
          workspaceId,
          categoryId,
          slug,
          images: Array.isArray(productData.images) ? productData.images : [],
        },
      });

      // Create variants
      if (variants.length > 0) {
        await prisma.productVariant.createMany({
          data: variants.map((variant) => ({
            ...variant,
            productId: createdProduct.id,
          })),
        });
      }

      // Return product with variants
      const fullProduct = await prisma.product.findUnique({
        where: { id: createdProduct.id },
        include: {
          category: { select: { id: true, name: true } },
          variants: true,
        },
      });

      return fullProduct;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw new Error('Failed to create product');
    }
  },

  getProductsInWorkspace: async (workspaceId: number, page: number = 1, pageSize: number = 10) => {
    try {
      if (!workspaceId || workspaceId <= 0) {
        throw new Error('Invalid workspaceId');
      }

      logger.info(`Fetching active products for workspaceId: ${workspaceId}, Page: ${page}, PageSize: ${pageSize}`);

      const products = await prisma.product.findMany({
        where: {
          workspaceId,
          isActive: true,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          variants: true,
          _count: {
            select: {
              variants: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!products || products.length === 0) {
        logger.warn(`No active products found for workspaceId: ${workspaceId}`);
      }

      return products.map(product => ({
        ...product,
        variantCount: product._count.variants,
      }));
    } catch (error) {
      logger.error(`Error fetching active products for workspaceId: ${workspaceId}. Error: ${error}`);
      throw new Error('Failed to fetch products');
    }
  },

  updateProduct: async (workspaceId: number, productId: string, data: Partial<ProductInput>) => {
    try {
      if (!workspaceId || !productId) throw new Error('Invalid workspaceId or productId');

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true },
      });

      if (!product) throw new Error(`Product with ID ${productId} not found`);

      // Extract variants if any
      const { variants, ...productData } = data;

      const updateData: Prisma.ProductUpdateInput = {
        name: productData.name,
        description: productData.description,
        category: productData.categoryId
          ? { connect: { id: productData.categoryId } }
          : undefined,
        images: productData.images,
        updatedAt: new Date(),
      };

      // Update the product
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: updateData,
      });

      // Replace all existing variants if new variants provided
      if (variants && Array.isArray(variants)) {
        // Delete old variants
        await prisma.productVariant.deleteMany({
          where: { productId },
        });

        // Create new variants
        if (variants.length > 0) {
          await prisma.productVariant.createMany({
            data: variants.map((variant) => ({
              ...variant,
              productId,
            })),
          });
        }
      }

      // Return product with category and variants
      return await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: { select: { id: true, name: true } },
          variants: true,
        },
      });

    } catch (error) {
      logger.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  },
  deleteProduct: async (workspaceId: number, productId: string) => {
    try {
      // Validate input
      if (!workspaceId || !productId || typeof productId !== 'string') {
        throw new Error('Invalid workspaceId or productId');
      }

      // Fetch the product
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
        },
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // Soft-delete: Mark product and its variants as inactive
      await prisma.product.update({
        where: { id: productId },
        data: {
          isActive: false,
          updatedAt: new Date(),
          variants: {
            updateMany: {
              where: {},
              data: { isAvailable: false },
            },
          },
        },
      });

      return { message: 'Product soft-deleted successfully' };
    } catch (error) {
      logger.error('Error deleting product: ', error);
      throw new Error('Failed to delete product');
    }
  },
  bulkDeleteProducts: async (workspaceId: number, productIds: string[]) => {
    try {
      if (!workspaceId || !Array.isArray(productIds) || productIds.length === 0) {
        throw new Error('Invalid workspaceId or productIds');
      }

      // Verify products exist and belong to the workspace
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          workspaceId,
        },
        select: { id: true },
      });

      if (products.length === 0) {
        throw new Error('No products found or products do not belong to the workspace');
      }

      // Soft-delete variants
      await prisma.productVariant.updateMany({
        where: {
          productId: { in: productIds },
        },
        data: {
          isAvailable: false,
        },
      });

      // Soft-delete products
      const updatedProducts = await prisma.product.updateMany({
        where: {
          id: { in: productIds },
          workspaceId,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return updatedProducts;
    } catch (error) {
      logger.error('Error soft-deleting products: ', error);
      throw new Error('Failed to soft-delete products');
    }
  },

  getProductById: async (productId: string) => {
    try {
      if (!productId) throw new Error('Invalid productId');

      return await prisma.product.findUnique({
        where: { id: productId, isActive: true },  // Ensure the product is active
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          variants: true,
        },
      });
    } catch (error) {
      logger.error('Error fetching product by ID:', error);
      throw new Error('Failed to fetch product by ID');
    }
  },
  getProductBySlug: async (slug: string) => {
    try {
      if (!slug) throw new Error('Invalid slug');

      return await prisma.product.findUnique({
        where: { slug },
        include: {
          category: {
            select: {
              id: true,  // Only include id and name in the category
              name: true,
            },
          },
          variants: true,
        },
      });
    }
    catch (error) {
      logger.error('Error fetching product by slug:', error);
      throw new Error('Failed to fetch product by slug');
    }
  },

  toggleProductStatus: async (productId: string) => {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    return await prisma.product.update({
      where: { id: productId },
      data: { isActive: !product.isActive },
    });
  },

  getProductStats: async (workspaceId: number) => {
    // Cache key for Redis
    const cacheKey = `product_stats:${workspaceId}`;
    const cachedStats = await redisClient.get(cacheKey);

    if (cachedStats) {
      logger.info(`Cache hit for product stats: ${cacheKey}`);
      return JSON.parse(cachedStats);
    }

    // Check if workspace exists (minimal query)
    const workspaceExists = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspaceExists) {
      throw new Error('Workspace not found');
    }

    // Batch product and variant counts in a single transaction
    const [productStats, variantStats] = await prisma.$transaction([
      // Product counts (total, active, inactive)
      prisma.$queryRaw<ProductStatsRaw[]>`
        SELECT
          COUNT(*) FILTER (WHERE "isActive" IS TRUE) AS active,
          COUNT(*) FILTER (WHERE "isActive" IS FALSE) AS inactive,
          COUNT(*) AS total
        FROM "Product"
        WHERE "workspaceId" = ${workspaceId}
      `,
      // Variant counts (total, available, out-of-stock)
      prisma.$queryRaw<VariantStatsRaw[]>`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE "isAvailable" IS TRUE) AS available,
          COUNT(*) FILTER (WHERE "stock" = 0) AS out_of_stock
        FROM "ProductVariant"
        WHERE "productId" IN (
          SELECT "id" FROM "Product" WHERE "workspaceId" = ${workspaceId}
        )
      `,
    ]);

    // Parse raw query results
    const { total: totalProducts, active: activeProducts, inactive: inactiveProducts } =
      productStats[0];
    const { total: totalVariants, available: availableVariants, out_of_stock: outOfStockVariants } =
      variantStats[0];

    // Category breakdown (optimized to fetch only necessary fields)
    const categoryStats = await prisma.category.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        _count: { select: { products: true } },
      },
    });
    const categoryBreakdown = categoryStats.map((cat) => ({
      categoryId: cat.id,
      name: cat.name,
      productCount: cat._count.products,
    }));

    // Sales stats (using aggregate for PostgreSQL)
    const salesStats = await prisma.orderItem.aggregate({
      where: {
        order: { workspaceId, status: 'DELIVERED' },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    // Calculate total revenue using a raw query for precision
    const revenueStats = await prisma.$queryRaw<{ total_revenue: number }[]>`
      SELECT SUM(oi.quantity * oi.price) AS total_revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      WHERE o."workspaceId" = ${workspaceId} AND o.status = 'DELIVERED'
    `;

    const sales = {
      totalRevenue: revenueStats[0]?.total_revenue || 0,
      totalItemsSold: salesStats._sum.quantity || 0,
      totalOrders: salesStats._count.id || 0,
    };

    // Top-selling products (optimized with limit and single query)
    const topProducts = await prisma.orderItem.groupBy({
      by: ['variantId'],
      where: {
        order: { workspaceId, status: 'DELIVERED' },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProductsDetails = await prisma.productVariant.findMany({
      where: { id: { in: topProducts.map((item) => item.variantId) } },
      select: {
        id: true,
        title: true,
        product: { select: { name: true } },
      },
    });

    const topProductsMapped = topProducts.map((item) => {
      const variant = topProductsDetails.find((v) => v.id === item.variantId);
      return {
        productName: variant?.product.name || 'Unknown',
        variantTitle: variant?.title || 'Unknown',
        quantitySold: item._sum.quantity || 0,
      };
    });

    // Stock stats (single aggregation + low-stock in one query)
    const stockStats = await prisma.productVariant.aggregate({
      where: { product: { workspaceId } },
      _sum: { stock: true },
    });

    const lowStockVariants = await prisma.productVariant.findMany({
      where: {
        product: { workspaceId },
        stock: { lte: 10 },
      },
      select: {
        id: true,
        title: true,
        stock: true,
        product: { select: { name: true } },
      },
      take: 10,
      orderBy: { stock: 'asc' },
    });

    const stats = {
      products: {
        total: Number(totalProducts),
        active: Number(activeProducts),
        inactive: Number(inactiveProducts),
      },
      variants: {
        total: Number(totalVariants),
        available: Number(availableVariants),
        outOfStock: Number(outOfStockVariants),
      },
      categories: categoryBreakdown,
      sales: {
        totalRevenue: sales.totalRevenue,
        totalItemsSold: sales.totalItemsSold,
        totalOrders: sales.totalOrders,
        topProducts: topProductsMapped,
      },
      stock: {
        totalStock: stockStats._sum.stock || 0,
        lowStock: lowStockVariants.map((v) => ({
          productName: v.product.name,
          variantTitle: v.title,
          stock: v.stock,
        })),
      },
    };

    // Cache stats (expire in 5 minutes)
    const cacheTtl = 300;
    await redisClient.setEx(cacheKey, cacheTtl, JSON.stringify(stats));
    logger.info(`Cached product stats: ${cacheKey}`);

    return stats;
  },

  updateVariants: async (productId: string, variants: any[]) => {
    await prisma.productVariant.deleteMany({ where: { productId } });

    return await prisma.product.update({
      where: { id: productId },
      data: {
        variants: {
          create: variants,
        },
      },
      include: { variants: true },
    });
  },

  bulkUploadProducts: async (
    workspaceId: number,
    products: (ProductInput & { categoryId: string })[]
  ) => {
    const created = await Promise.all(
      products.map((p) =>
        productService.createProduct(workspaceId, p.categoryId, p)
      )
    );
    return created;
  },

  getProducts: async (workspaceId: number, page: number, limit: number) => {
    const skip = (page - 1) * limit;

    // Confirm workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Fetch products with pagination
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          workspaceId,
          isActive: true,
        },
        include: {
          variants: true,
          category: true,
        },
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.product.count({
        where: {
          workspaceId,
          isActive: true,
        },
      }),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
  checkSlugAvailability: async (slug: string, workspaceId: number) => {
    const product = await prisma.product.findFirst({ where: { slug, workspaceId } });
    return !product;
  },

  getProductVariants: async (productId: string) => {
    return await prisma.productVariant.findMany({
      where: { productId },
    });
  },

};
