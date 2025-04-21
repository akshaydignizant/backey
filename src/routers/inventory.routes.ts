import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import roleRestriction from '../middleware/roleRestriction';
import { Role } from '@prisma/client';
import {
    getInventory,
    addInventoryItem,
    updateInventoryItem,
    getLowStockItems,
    createInventoryTransfer,
} from '../controllers/inventory.controller';

const router = Router();

// Inventory Routes
router.get('/:workspaceId/inventory', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]), getInventory);
router.post('/:workspaceId/inventory/items', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), addInventoryItem);
router.put('/:workspaceId/inventory/items/:itemId', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), updateInventoryItem);
router.get('/:workspaceId/inventory/low-stock', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]), getLowStockItems);
router.post('/:workspaceId/inventory/transfers', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), createInventoryTransfer);

export default router;