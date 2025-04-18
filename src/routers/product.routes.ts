
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { bulkUploadProducts, checkSlugAvailability, createProduct, deleteProduct, getProductById, getProductBySlug, getProductsInWorkspace, getProductStats, getProductVariants, searchProducts, toggleProductStatus, updateProduct, updateVariants } from '../controllers/product.controller';
import { Role } from '@prisma/client';
import roleRestriction from '../middleware/roleRestriction';

const router = Router();

// /routes/productRoutes.ts
router.post('/:workspaceId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createProduct);
router.get('/:workspaceId', authMiddleware, getProductsInWorkspace);
router.put('/:workspaceId/:productId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateProduct);
router.delete('/:workspaceId/:productId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), deleteProduct);

router.get('/single/:productId', authMiddleware, getProductById);
router.get('/slug/:slug', authMiddleware, getProductBySlug);
router.patch('/:workspaceId/:productId/status', authMiddleware, roleRestriction([Role.ADMIN]), toggleProductStatus);
router.get('/:workspaceId/stats', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), getProductStats);
router.patch('/:workspaceId/:productId/variants', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateVariants);
router.post('/:workspaceId/bulk', authMiddleware, roleRestriction([Role.ADMIN]), bulkUploadProducts);
router.get('/:workspaceId/search', authMiddleware, searchProducts);
router.get('/:workspaceId/check-slug/:slug', authMiddleware, checkSlugAvailability);
router.get('/:workspaceId/:productId/variants', authMiddleware, getProductVariants);

export default router;