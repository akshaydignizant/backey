
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { bulkDeleteProducts, bulkUploadProducts, checkSlugAvailability, createProduct, deleteProduct, getProductById, getProductBySlug, getProductsInWorkspace, getProductStats, getProductVariants, searchProducts, toggleProductStatus, updateProduct, updateVariants } from '../controllers/product.controller';
import { Role } from '@prisma/client';
import roleRestriction from '../middleware/roleRestriction';
import variantController from '../controllers/variant.controller';

const router = Router();

// /routes/productRoutes.ts
router.post('/:workspaceId/:categoryId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createProduct);
router.get('/:workspaceId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]), getProductsInWorkspace);
router.put('/:workspaceId/:productId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateProduct);
router.delete('/products/:workspaceId', authMiddleware, roleRestriction([Role.ADMIN]), bulkDeleteProducts);
router.delete('/:workspaceId/:productId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), deleteProduct);
// router.patch('/:workspaceId/products/:productId/stock', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]), updateStockLevel);
// router.get('/:workspaceId/products/category/:categoryId', authMiddleware, getProductsByCategory);
router.get('/single/:productId', authMiddleware, getProductById);
router.get('/slug/:slug', authMiddleware, getProductBySlug);
router.patch('/:workspaceId/:productId/status', authMiddleware, roleRestriction([Role.ADMIN]), toggleProductStatus);
router.get('/:workspaceId/stats', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), getProductStats);
router.patch('/:workspaceId/:productId/variants', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateVariants);
router.post('/:workspaceId/bulk', authMiddleware, roleRestriction([Role.ADMIN]), bulkUploadProducts);
router.get('/:workspaceId/search', authMiddleware, searchProducts);
router.get('/:workspaceId/check-slug/:slug', authMiddleware, checkSlugAvailability);
router.get('/:workspaceId/:productId/variants', authMiddleware, getProductVariants);

router.post('/:workspaceId/products/:productId/variants', roleRestriction([Role.ADMIN, Role.MANAGER]), variantController.addVariants);
router.put('/:productId/variants/:variantId', roleRestriction([Role.ADMIN, Role.MANAGER]), variantController.updateVariants);
router.delete('/:productId/variants/:variantId', roleRestriction([Role.ADMIN, Role.MANAGER]), variantController.deleteVariant);
router.get('/variants/:productId', roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]), variantController.getVariantsByProduct);

export default router;