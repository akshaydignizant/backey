// /routes/categoryRoutes.ts

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';
import { Role } from '@prisma/client';
import { createCategory, deleteCategory, getCategoriesInWorkspace, updateCategory } from '../controllers/category.controller';
const router = Router();
router.post('/:workspaceId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createCategory);
router.get('/:workspaceId', authMiddleware, getCategoriesInWorkspace);
router.put('/:workspaceId/:categoryId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateCategory);
router.delete('/:workspaceId/:categoryId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), deleteCategory);

export default router;