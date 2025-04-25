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
      // Validate inputs
      if (!workspaceId) throw new Error('Invalid workspaceId');
      if (!categoryId) throw new Error('Invalid categoryId');
      if (!data.name?.trim()) throw new Error('Invalid product name');

      // Generate a unique slug
      const baseSlug = generateSlug(data.name);
      const slug = await getUniqueSlug(baseSlug);

      // Extract variants from the input and remove them from product data
      const { variants, ...productData } = data;

      // Create the product without variants
      const createdProduct = await prisma.product.create({
        data: {
          ...productData,
          workspaceId,
          categoryId,
          slug,
          images: Array.isArray(productData.images) ? productData.images : [],
        },
        include: {
          category: {
            select: {
              id: true,  // Only include id and name in the category
              name: true,
            },
          },
        },
      });

      return {
        ...createdProduct,
      };
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

      // Add logging to indicate the start of the query and workspaceId
      logger.info(`Fetching products for workspaceId: ${workspaceId}, Page: ${page}, PageSize: ${pageSize}`);

      const products = await prisma.product.findMany({
        where: { workspaceId },
        include: {
          category: {
            select: {
              id: true,  // Only include id and name in the category
              name: true,
            },
          },
          // variants: true,
        },
        skip: (page - 1) * pageSize, // Pagination: skip products based on current page
        take: pageSize, // Limit the number of products per page
      });

      if (!products || products.length === 0) {
        logger.warn(`No products found for workspaceId: ${workspaceId}`);
      }

      return products;
    } catch (error) {
      // Log the error with more context
      logger.error(`Error fetching products for workspaceId: ${workspaceId}. Error: ${error}`);
      throw new Error('Failed to fetch products');
    }
  },


  updateProduct: async (workspaceId: number, productId: string, data: Partial<ProductInput>) => {
    try {
      if (!workspaceId || !productId) throw new Error('Invalid workspaceId or productId');

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error(`Product with ID ${productId} not found`);

      // Only allow updatable fields
      const updateData: Prisma.ProductUpdateInput = {
        name: data.name,
        description: data.description,
        category: data.categoryId
          ? { connect: { id: data.categoryId } }
          : undefined,
        images: data.images,
        updatedAt: new Date(),
      };

      return await prisma.product.update({
        where: { id: productId },
        data: updateData,
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
    } catch (error) {
      logger.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  },

  deleteProduct: async (workspaceId: number, productId: string) => {
    try {
      // Check for valid input
      if (!workspaceId || !productId || typeof productId !== 'string') {
        throw new Error('Invalid workspaceId or productId');
      }

      // Fetch the product details, including images and variants
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          images: true,
          variants: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // If no product found, throw error
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // Delete related images from Cloudinary if they exist
      if (product.images && Array.isArray(product.images)) {
        for (let imageUrl of product.images) {
          const publicId = extractPublicIdFromCloudinaryUrl(imageUrl);
          await deleteImageFromCloudinary(publicId); // Delete image from Cloudinary
        }
      }

      // Delete related variants from the database
      await prisma.productVariant.deleteMany({
        where: {
          productId: productId,
        },
      });

      // Finally, delete the product itself
      const deletedProduct = await prisma.product.delete({
        where: { id: productId },
      });

      return deletedProduct;
    } catch (error) {
      // Log the error for tracking
      logger.error('Error deleting product: ', error);
      throw new Error('Failed to delete product');
    }
  },
  bulkDeleteProducts: async (workspaceId: number, productIds: string[]) => {
    try {
      if (!workspaceId || !Array.isArray(productIds) || productIds.length === 0) {
        throw new Error('Invalid workspaceId or productIds');
      }

      // Fetch the products to ensure they exist and belong to the given workspace
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },  // Find products by the given productIds
          workspaceId: workspaceId, // Ensure they belong to the correct workspace
        },
        include: {
          variants: true,
          category: {
            select: {
              id: true,  // Only include id and name in the category
              name: true,
            },
          },
        },
      });

      if (products.length === 0) {
        throw new Error('No products found or products do not belong to the workspace');
      }

      // Delete all variants for the given products
      await prisma.productVariant.deleteMany({
        where: {
          productId: { in: productIds },
        },
      });

      // Delete the products
      const deletedProducts = await prisma.product.deleteMany({
        where: {
          id: { in: productIds },
          workspaceId: workspaceId,
        },
      });

      return deletedProducts;
    } catch (error) {
      logger.error('Error deleting products: ', error);
      throw new Error('Failed to delete products');
    }
  },

  getProductById: async (productId: string) => {
    try {
      if (!productId) throw new Error('Invalid productId');

      return await prisma.product.findUnique({
        where: { id: productId },
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

  searchProducts: async (workspaceId: number, keyword: string, page: number, limit: number) => {
    const skip = (page - 1) * limit;
    // Check if the workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }
    // Use pagination, sanitize the input, and perform case-insensitive search on the name.
    return await prisma.product.findMany({
      where: {
        workspaceId,
        name: { contains: keyword, mode: 'insensitive' },
      },
      include: {
        variants: true,
        category: true,
      },
      skip,   // Skip products based on page
      take: limit,  // Limit the number of results
      orderBy: {
        name: 'asc',  // You can choose the sort order based on your needs
      },
    });
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
