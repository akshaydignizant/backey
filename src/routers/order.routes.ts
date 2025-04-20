import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { createOrder, getOrder, getOrders, updateOrder, deleteOrder, addOrderItem, removeOrderItem, updateOrderStatus, getOrdersByStatus, getOrdersByUser, reorder, getOrderSummary, updatePaymentStatus, downloadInvoice, bulkUpdateOrders, assignDeliveryPartner, cloneOrder, notifyOrderStatus, getOrderHistory, searchOrders, exportOrders, getOrdersByDateRangeController } from '../controllers/order.controller';

const router = Router();

router.post('/workspaces/:workspaceId/orders', authMiddleware, createOrder);
router.get('/workspaces/:workspaceId/orders', authMiddleware, getOrders);
router.get('/workspaces/:workspaceId/orders/:orderId', authMiddleware, getOrder);
router.patch('/workspaces/:workspaceId/orders/:orderId/status', authMiddleware, updateOrderStatus);

router.get('/workspaces/:workspaceId/orders/status/:status', authMiddleware, getOrdersByStatus);

router.get('/workspaces/:workspaceId/users/:userId/orders', authMiddleware, getOrdersByUser);
// POST /workspaces/:workspaceId/orders/:orderId/reorder
router.post('/workspaces/:workspaceId/orders/:orderId/reorder', authMiddleware, reorder);
// GET /workspaces/:workspaceId/orders/summary
router.get('/workspaces/:workspaceId/orders/summary', authMiddleware, getOrderSummary);

// Update an order
router.patch('/workspaces/:workspaceId/orders/:orderId', authMiddleware, updateOrder);

// Delete an order
router.delete('/workspaces/:workspaceId/orders/:orderId', authMiddleware, deleteOrder);

// Add an item to an order
router.post('/workspaces/:workspaceId/orders/:orderId/items', authMiddleware, addOrderItem);

// Remove an item from an order
router.delete('/workspaces/:workspaceId/orders/:orderId/items/:itemId', authMiddleware, removeOrderItem);
// PATCH /workspaces/:workspaceId/orders/:orderId/payment-status
router.patch('/workspaces/:workspaceId/orders/:orderId/payment-status', authMiddleware, updatePaymentStatus);
// GET /workspaces/:workspaceId/orders/:orderId/invoice
router.get('/workspaces/:workspaceId/orders/:orderId/invoice', authMiddleware, downloadInvoice);

// GET /workspaces/:workspaceId/orders/date-range
router.get('/workspaces/:workspaceId/orders/date-range', authMiddleware, getOrdersByDateRangeController);

// PATCH /workspaces/:workspaceId/orders/bulk-update
router.patch('/workspaces/:workspaceId/orders/bulk-update', authMiddleware, bulkUpdateOrders);
// PATCH /workspaces/:workspaceId/orders/:orderId/assign-delivery
router.patch('/workspaces/:workspaceId/orders/:orderId/assign-delivery', authMiddleware, assignDeliveryPartner);
// POST /workspaces/:workspaceId/orders/:orderId/clone
router.post('/workspaces/:workspaceId/orders/:orderId/clone', authMiddleware, cloneOrder);
// POST /workspaces/:workspaceId/orders/:orderId/notify
router.post('/workspaces/:workspaceId/orders/:orderId/notify', authMiddleware, notifyOrderStatus);
// GET /workspaces/:workspaceId/orders/:orderId/history
router.get('/workspaces/:workspaceId/orders/:orderId/history', authMiddleware, getOrderHistory);
// GET /workspaces/:workspaceId/orders/search
router.get('/workspaces/:workspaceId/orders/search', authMiddleware, searchOrders);
// GET /workspaces/:workspaceId/orders/export
router.get('/workspaces/:workspaceId/orders/export', authMiddleware, exportOrders);


export default router;