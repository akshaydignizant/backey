
import { NextFunction, Request, Response } from 'express';
import { productService } from '../services/product.service';
import httpError from '../util/httpError';
import httpResponse from '../util/httpResponse';
import { ProductInput, ProductVariantInput } from '../types/product';
import prisma from '../util/prisma';

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { categoryId } = req.params;
  const workspaceId = parseInt(req.params.workspaceId);
  const { name, description } = req.body;
  const images = req.files ? (req.files as Express.Multer.File[]).map((file) => file.path) : [];
  let parsedVariants: ProductVariantInput[] = [];
  try {
    parsedVariants = typeof req.body.variants === 'string'
      ? JSON.parse(req.body.variants)
      : Array.isArray(req.body.variants)
        ? req.body.variants
        : [];
  } catch (e) {
    return httpResponse(req, res, 400, 'Invalid variants JSON format');
  }

  if (isNaN(workspaceId)) {
    return httpResponse(req, res, 400, 'Invalid workspaceId');
  }

  try {
    if (!name?.trim()) {
      return httpResponse(req, res, 400, 'Product name is required');
    }
    if (!description?.trim()) {
      return httpResponse(req, res, 400, 'Product description is required');
    }

    const productInput: ProductInput = {
      name,
      description,
      isActive: true,
      images,
      variants: parsedVariants
    };

    const product = await productService.createProduct(workspaceId, categoryId, productInput);

    return httpResponse(req, res, 201, 'Product created', product);
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};

export const getProductsInWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { workspaceId } = req.params;
  const page = parseInt(req.query.page as string) || 1;  // Default to page 1
  const pageSize = parseInt(req.query.pageSize as string) || 10;  // Default to 10 products per page

  try {
    const products = await productService.getProductsInWorkspace(Number(workspaceId), page, pageSize);
    return httpResponse(req, res, 200, 'Products fetched', products);
  } catch (err) {
    return httpError(next, err, req);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { workspaceId, productId } = req.params;
  try {
    const updatedProduct = await productService.updateProduct(Number(workspaceId), productId, req.body);
    httpResponse(req, res, 200, 'Product updated', updatedProduct);
  } catch (err) {
    httpError(next, err, req, 400);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { workspaceId, productId } = req.params;
  try {
    const deletedProduct = await productService.deleteProduct(Number(workspaceId), productId);
    return httpResponse(req, res, 204, 'Product deleted', deletedProduct);
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};

export const bulkDeleteProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { workspaceId } = req.params;
  const { productIds } = req.body;  // Expecting an array of product IDs in the body

  try {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return httpError(next, new Error('Product IDs array is required'), req, 400);
    }

    await productService.bulkDeleteProducts(Number(workspaceId), productIds);
    return httpResponse(req, res, 204, 'Products deleted successfully');
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};


export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId } = req.params;
    const product = await productService.getProductById(productId);
    return httpResponse(req, res, 200, 'Product fetched', product);
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};

export const getProductBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;
    const product = await productService.getProductBySlug(slug);
    return httpResponse(req, res, 200, 'Product by slug fetched', product);
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};

export const toggleProductStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId } = req.params;
    // const product = await findProductById(productId);

    // if (!product) {
    //   return httpError(next, 'Product not found', req, 404);
    // }

    const updatedProduct = await productService.toggleProductStatus(productId);
    return httpResponse(req, res, 200, 'Product status toggled', updatedProduct);
  } catch (err) {
    return httpError(next, err, req);
  }
};

export const getProductStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const stats = await productService.getProductStats(Number(workspaceId));
    return httpResponse(req, res, 200, 'Product stats fetched', stats);
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};

export const updateVariants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    const updated = await productService.updateVariants(productId, req.body.variants);
    return httpResponse(req, res, 200, 'Variants updated', updated);
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};

export const bulkUploadProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { workspaceId } = req.params;

  try {
    const numericWorkspaceId = Number(workspaceId);

    if (isNaN(numericWorkspaceId)) {
      throw new Error('workspaceId must be a number');
    }

    const products = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Product list is empty or invalid');
    }

    const createdProducts = await productService.bulkUploadProducts(
      numericWorkspaceId,
      products
    );

    httpResponse(req, res, 201, 'Products uploaded successfully', createdProducts);
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};


export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const parsedWorkspaceId = parseInt(workspaceId, 10);
    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);

    console.log({ parsedWorkspaceId, parsedPage, parsedLimit });

    if (!parsedWorkspaceId || !parsedPage || !parsedLimit) {
      return httpError(next, new Error('Invalid input'), req, 400);
    }

    const skip = (parsedPage - 1) * parsedLimit;

    const products = await prisma.product.findMany({
      where: { workspaceId: parsedWorkspaceId },
      skip,
      take: parsedLimit,
    });

    const total = await prisma.product.count({
      where: { workspaceId: parsedWorkspaceId },
    });

    return httpResponse(req, res, 200, 'Products fetched', products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};


export const checkSlugAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug, workspaceId } = req.params;
    const isAvailable = await productService.checkSlugAvailability(slug, Number(workspaceId));
    return httpResponse(req, res, 200, 'Slug availability checked', { isAvailable });
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};

export const getProductVariants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId } = req.params;
    const variants = await productService.getProductVariants(productId);
    return httpResponse(req, res, 200, 'Product variants fetched', variants);
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};
