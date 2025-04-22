import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';
import { Role } from '@prisma/client';
import {
  createCategory,
  deleteCategory,
  getCategoriesInWorkspace,
  updateCategory,
} from '../controllers/category.controller';

const router = Router();

// Existing Routes
router.post('/:workspaceId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createCategory);
router.get('/:workspaceId', authMiddleware,roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]), getCategoriesInWorkspace);
router.put('/:workspaceId/:categoryId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateCategory);
router.delete('/:workspaceId/:categoryId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), deleteCategory);

export default router;