// router.post('/:workspaceId/products', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createProduct);
// router.get('/:workspaceId/products', authMiddleware, getProductsInWorkspace);
// router.put('/:workspaceId/products/:productId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateProduct);
// router.delete('/:workspaceId/products/:productId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), deleteProduct);

// Workspace Product Categories:
// router.post('/:workspaceId/categories', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createCategory);
// router.get('/:workspaceId/categories', authMiddleware, getCategoriesInWorkspace);
// router.put('/:workspaceId/categories/:categoryId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateCategory);
// router.delete('/:workspaceId/categories/:categoryId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), deleteCategory);
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createProduct, deleteProduct, getProductsInWorkspace, updateProduct } from '../controllers/product.controller';
import { Role } from '@prisma/client';
import roleRestriction from '../middleware/roleRestriction';

const router = Router();

// /routes/productRoutes.ts
router.post('/:workspaceId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createProduct);
router.get('/:workspaceId', authMiddleware, getProductsInWorkspace);
router.put('/:workspaceId/:productId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateProduct);
router.delete('/:workspaceId/:productId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), deleteProduct);

export default router;