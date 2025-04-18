
import { NextFunction, Request, Response } from 'express';
import { productService } from '../services/product.service';
import httpError from '../util/httpError';
import httpResponse from '../util/httpResponse';

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { workspaceId } = req.params;
  try {
    const product = await productService.createProduct(Number(workspaceId), req.body);
    httpResponse(req, res, 201, 'Product created', product);
  } catch (err) {
    return httpError(next, err, req, 400);
  }
};

export const getProductsInWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { workspaceId } = req.params;
  try {
    const products = await productService.getProductsInWorkspace(Number(workspaceId));
    return httpResponse(req, res, 200, 'Product fetched', products);
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
    await productService.deleteProduct(Number(workspaceId), productId);
    return httpResponse(req, res, 204, 'Product deleted');
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

export const bulkUploadProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const products = await productService.bulkUploadProducts(Number(workspaceId), req.body.products);
    return httpResponse(req, res, 201, 'Bulk products created', products);
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
