import { Prisma, PrismaClient } from '@prisma/client';
import winston from 'winston';
import { ProductInput } from '../types/product';

const prisma = new PrismaClient();

// Set up winston logger
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

export const productService = {
  createProduct: async (workspaceId: number, data: ProductInput) => {
    try {
      if (!workspaceId || !data.name?.trim()) {
        throw new Error('Invalid workspaceId or product name');
      }

      const slug = data.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const { variants, ...productData } = data;

      const createdProduct = await prisma.product.create({
        data: {
          ...productData,
          workspaceId,
          slug,
          images: productData.images ?? [],
          variants: variants?.length
            ? {
              create: variants.map((variant) => ({
                title: variant.title,
                sku: variant.sku,
                price: variant.price,
                stock: variant.stock,
                weight: variant.weight,
                dimensions: variant.dimensions,
                color: variant.color,
                size: variant.size,
              })),
            }
            : undefined,
        },
        include: {
          variants: true,
        },
      });

      return createdProduct;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw new Error('Failed to create product');
    }
  },
  getProductsInWorkspace: async (workspaceId: number) => {
    try {
      if (!workspaceId) throw new Error('Invalid workspaceId');

      return await prisma.product.findMany({
        where: { workspaceId },
        include: {
          category: true,
          variants: true,
        },
      });
    } catch (error) {
      logger.error('Error fetching products:', error);
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
      if (!workspaceId || !productId || typeof productId !== 'string') {
        throw new Error('Invalid workspaceId or productId');
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true },
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // First, delete related variants
      await prisma.productVariant.deleteMany({
        where: {
          productId: productId,
        },
      });

      // Then, delete the product
      const deletedProduct = await prisma.product.delete({
        where: { id: productId },
      });

      return deletedProduct;
    } catch (error) {
      logger.error('Error deleting product: ', error);
      throw new Error('Failed to delete product');
    }
  },
  getProductById: async (productId: string) => {
    try {
      if (!productId) throw new Error('Invalid productId');

      return await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
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
          category: true,
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
    const [total, active, inactive] = await Promise.all([
      prisma.product.count({ where: { workspaceId } }),
      prisma.product.count({ where: { workspaceId, isActive: true } }),
      prisma.product.count({ where: { workspaceId, isActive: false } }),
    ]);

    return { total, active, inactive };
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

  bulkUploadProducts: async (workspaceId: number, products: ProductInput[]) => {
    const created = await Promise.all(products.map((p) => productService.createProduct(workspaceId, p)));
    return created;
  },

  searchProducts: async (workspaceId: number, keyword: string) => {
    return await prisma.product.findMany({
      where: {
        workspaceId,
        name: { contains: keyword, mode: 'insensitive' },
      },
      include: { variants: true, category: true },
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
