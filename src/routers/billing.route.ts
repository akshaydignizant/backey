import { Router } from 'express';
import { billController } from '../controllers/billing.controller';
import { Role } from '@prisma/client';
import roleRestriction from '../middleware/roleRestriction';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Create a new bill
router.post(
  '/',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]),
  billController.createBill
);

// Get all bills (with pagination)
router.get(
  '/',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  billController.getAllBills
);

// Get a specific bill by ID
router.get(
  '/:billId',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]),
  billController.getBillById
);

// Update a bill
router.put(
  '/:billId',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  billController.updateBill
);

// Delete a bill
router.delete(
  '/:billId',
  authMiddleware,
  roleRestriction([Role.ADMIN]),
  billController.deleteBill
);

// Update the status of a bill
router.patch(
  '/:billId/status',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  billController.updateBillStatus
);

// Get all bills for a specific user
router.get(
  '/users/:userId/bills',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]),
  billController.getBillsByUser
);

/**
 * Bill Items Routes
 */

// Get all items associated with a bill
router.get(
  '/:billId/items',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER, Role.STAFF]),
  billController.getBillItemsByBill
);

// Add items to a bill
router.post(
  '/:billId/items',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  billController.addItemsToBill
);

// Update a bill item
router.put(
  '/:billId/items/:itemId',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  billController.updateBillItem
);

// Delete a bill item
router.delete(
  '/:billId/items/:itemId',
  authMiddleware,
  roleRestriction([Role.ADMIN, Role.MANAGER]),
  billController.deleteBillItem
);

export default router;