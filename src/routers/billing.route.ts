import { Router } from 'express';
import { billController } from '../controllers/billing.controller';

const router = Router();

/**
 * Bill Routes
 */

// Create a new bill
router.post('/', billController.createBill);

// Get all bills
router.get('/', billController.getAllBills);

// Get a specific bill by ID
router.get('/:billId', billController.getBillById);

// Update a bill
router.put('/:billId', billController.updateBill);

// Delete a bill
router.delete('/:billId', billController.deleteBill);

// Update the status of a bill (e.g., mark as paid)
router.patch('/:billId/status', billController.updateBillStatus);

// Get all bills for a specific user
router.get('/users/:userId/bills', billController.getBillsByUser);

/**
 * Bill Items Routes
 */

// Get all items associated with a bill
router.get('/:billId/items', billController.getBillItemsByBill);

// Add items to a bill
router.post('/:billId/items', billController.addItemsToBill);

// Update a bill item
router.put('/:billId/items/:itemId', billController.updateBillItem);

// Delete a bill item
router.delete('/:billId/items/:itemId', billController.deleteBillItem);

export default router;
