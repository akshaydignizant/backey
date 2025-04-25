import { Router } from 'express';
import { Role } from '@prisma/client';

import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';
import { validateStockUpdate } from '../middleware/stock.validation';

import {
    getInventory,
    addInventoryItem,
    updateInventoryItem,
    getLowStockItems,
    createInventoryTransfer,
    getVariantStock,
    updateStock,
    getLowStock,
    listStock,
} from '../controllers/inventory.controller';

const router = Router();

/**
 * Inventory Item Routes
 */
router.get(
    '/:workspaceId/inventory',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]),
    getInventory
);

router.post(
    '/:workspaceId/inventory/items',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER]),
    addInventoryItem
);

router.put(
    '/:workspaceId/inventory/items/:itemId',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER]),
    updateInventoryItem
);

router.get(
    '/:workspaceId/inventory/low-stock',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]),
    getLowStockItems
);

router.post(
    '/:workspaceId/inventory/transfers',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER]),
    createInventoryTransfer
);

/**
 * Stock Routes
 */
router.get(
    '/stock/:variantId',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]),
    getVariantStock
);

router.put(
    '/stock/:variantId',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]),
    validateStockUpdate,
    updateStock
);

router.get(
    '/stocks',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]),
    listStock
);

router.get(
    '/low-stock',
    authMiddleware,
    roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]),
    getLowStock
);

export default router;
