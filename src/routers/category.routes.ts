import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';
import { Role } from '@prisma/client';
import {
  createCategory,
  deleteCategory,
  getCategoriesInWorkspace,
  updateCategory,
  // getCategoryHierarchy,
  // getChildCategories,
  // getCategoryBySlug,
  // bulkCreateCategories,
  // bulkUpdateCategories,
  // bulkDeleteCategories,
  // getCategoryProducts,
  // assignCategoryParent,
  // removeCategoryParent,
  // searchCategories,
  // exportCategories,
  // cloneCategory,
  // getCategoryHistory,
} from '../controllers/category.controller';

const router = Router();

// Existing Routes
router.post('/:workspaceId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createCategory);
router.get('/:workspaceId', authMiddleware, getCategoriesInWorkspace);
router.put('/:workspaceId/:categoryId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateCategory);
router.delete('/:workspaceId/:categoryId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), deleteCategory);

// Additional Routes
// router.get('/:workspaceId/hierarchy', authMiddleware, getCategoryHierarchy);
// router.get('/:workspaceId/:categoryId/children', authMiddleware, getChildCategories);
// router.get('/:workspaceId/slug/:slug', authMiddleware, getCategoryBySlug);
// router.post('/:workspaceId/bulk-create', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), bulkCreateCategories);
// router.patch('/:workspaceId/bulk-update', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), bulkUpdateCategories);
// router.delete('/:workspaceId/bulk-delete', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), bulkDeleteCategories);
// router.get('/:workspaceId/:categoryId/products', authMiddleware, getCategoryProducts);
// router.patch('/:workspaceId/:categoryId/assign-parent', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), assignCategoryParent);
// router.patch('/:workspaceId/:categoryId/remove-parent', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), removeCategoryParent);
// router.get('/:workspaceId/search', authMiddleware, searchCategories);
// router.get('/:workspaceId/export', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), exportCategories);
// router.post('/:workspaceId/:categoryId/clone', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), cloneCategory);
// router.get('/:workspaceId/:categoryId/history', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), getCategoryHistory);

export default router;