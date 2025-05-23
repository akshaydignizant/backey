import { NextFunction, Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import httpResponse from '../util/httpResponse';
import httpError from '../util/httpError';

// Create Category
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { workspaceId } = req.params;
  try {
    // Ensure workspaceId is a valid number
    const parsedWorkspaceId = Number(workspaceId);
    if (isNaN(parsedWorkspaceId)) {
      return httpResponse(req, res, 400, 'Invalid workspaceId');
    }

    const category = await categoryService.createCategory(parsedWorkspaceId, req.body);
    return httpResponse(req, res, 201, 'Category created successfully', category);
  } catch (err) {
    return httpError(next, err, req);
  }
};

// Get Categories in a Workspace
export const getCategoriesInWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { workspaceId } = req.params;
  try {
    const parsedWorkspaceId = Number(workspaceId);
    if (isNaN(parsedWorkspaceId)) {
      return httpResponse(req, res, 400, 'Invalid workspaceId');
    }

    const categories = await categoryService.getCategoriesInWorkspace(parsedWorkspaceId);
    return httpResponse(req, res, 200, 'Categories fetched successfully', categories);
  } catch (err) {
    return httpError(next, err, req);
  }
};

// Update Category
export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { categoryId, workspaceId } = req.params;

  try {
    if (!categoryId || !workspaceId) {
      return httpResponse(req, res, 400, 'Invalid categoryId or workspaceId');
    }

    const updatedCategory = await categoryService.updateCategory(categoryId, Number(workspaceId), req.body);
    return httpResponse(req, res, 200, 'Category updated successfully', updatedCategory);
  } catch (err) {
    return httpError(next, err, req);
  }
};


// Delete Category
export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { categoryId, workspaceId } = req.params;
  try {
    if (!categoryId || !workspaceId) {
      return httpResponse(req, res, 400, 'Invalid categoryId or workspaceId');
    }

    const deletedCategory = await categoryService.deleteCategory(categoryId, Number(workspaceId));
    return httpResponse(req, res, 200, 'Category deleted successfully', deletedCategory);
  } catch (err) {
    return httpError(next, err, req);
  }
};

