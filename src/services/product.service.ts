import { PrismaClient } from '@prisma/client';
import winston from 'winston';

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
  createProduct: async (workspaceId: number, data: any) => {
    try {
      if (!workspaceId || !data.name || typeof data.name !== 'string') {
        throw new Error('Invalid workspaceId or product name');
      }
      const slug = data.name ? data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
      const createdProduct = await prisma.product.create({
        data: {
          ...data,
          workspaceId,
          slug,
        },
      });
      return createdProduct;
    } catch (error) {
      logger.error('Error creating product: ', error);
      throw new Error('Failed to create product');
    }
  },

  getProductsInWorkspace: async (workspaceId: number) => {
    try {
      if (!workspaceId || typeof workspaceId !== 'number') {
        throw new Error('Invalid workspaceId');
      }
      const products = await prisma.product.findMany({
        where: { workspaceId },
        include: {
          category: true,
          variants: true,
        },
      });
      return products;
    } catch (error) {
      logger.error('Error fetching products: ', error);
      throw new Error('Failed to fetch products');
    }
  },

  updateProduct: async (workspaceId: number, productId: string, data: any) => {
    try {
      if (!workspaceId || !productId || typeof productId !== 'string') {
        throw new Error('Invalid workspaceId or productId');
      }
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!existingProduct) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data,
      });
      return updatedProduct;
    } catch (error) {
      logger.error('Error updating product: ', error);
      throw new Error('Failed to update product');
    }
  },

  deleteProduct: async (workspaceId: number, productId: string) => {
    try {
      if (!workspaceId || !productId || typeof productId !== 'string') {
        throw new Error('Invalid workspaceId or productId');
      }
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!existingProduct) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      const deletedProduct = await prisma.product.delete({
        where: { id: productId },
      });
      return deletedProduct;
    } catch (error) {
      logger.error('Error deleting product: ', error);
      throw new Error('Failed to delete product');
    }
  },
};
