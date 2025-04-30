
import { NextFunction, Request, Response } from 'express';
import { productService } from '../services/product.service';
import httpError from '../util/httpError';
import httpResponse from '../util/httpResponse';
import { ProductInput } from '../types/product';

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { categoryId } = req.params;
  const workspaceId = parseInt(req.params.workspaceId);
  const { name, description, variants } = req.body;
  const images = req.files ? (req.files as Express.Multer.File[]).map((file) => file.path) : [];

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
      variants: Array.isArray(variants) ? variants : [], // safely cast
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
    const product = await productService.toggleProductStatus(productId);
    return httpResponse(req, res, 200, 'Product status toggled', product);
  } catch (err) {
    return httpError(next, err, req, 400);
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


export const searchProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { q, page = 1, limit = 10 } = req.query;  // Default pagination: page 1, limit 10

    // Validate workspaceId (must be a valid number)
    const parsedWorkspaceId = Number(workspaceId);
    if (isNaN(parsedWorkspaceId) || parsedWorkspaceId <= 0) {
      return httpResponse(req, res, 400, 'Invalid workspaceId');
    }

    // Sanitize and validate search keyword
    const keyword = String(q || '').trim();
    if (keyword.length < 3) {
      return httpResponse(req, res, 400, 'Search query must be at least 3 characters');
    }

    // Parse page and limit to integers and handle invalid values
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    if (isNaN(parsedPage) || parsedPage <= 0) {
      return httpResponse(req, res, 400, 'Invalid page number');
    }
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
      return httpResponse(req, res, 400, 'Invalid limit, should be between 1 and 50');
    }

    // Perform search with pagination
    const products = await productService.searchProducts(parsedWorkspaceId, keyword, parsedPage, parsedLimit);

    return httpResponse(req, res, 200, 'Products search results', products);
  } catch (err) {
    console.error('❌ Error searching products:', err);
    return httpError(next, err, req, 500);
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
