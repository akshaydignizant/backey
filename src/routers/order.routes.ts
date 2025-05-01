import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createOrder,
  getOrder,
  getOrders,
  updateOrder,
  deleteOrder,
  addOrderItem,
  removeOrderItem,
  updateOrderStatus,
  getOrdersByStatus,
  getOrdersByUser,
  reorder,
  getOrderSummary,
  updatePaymentStatus,
  downloadInvoice,
  bulkUpdateOrders,
  assignDeliveryPartner,
  cloneOrder,
  notifyOrderStatus,
  getOrderHistory,
  searchOrders,
  exportOrders,
  getOrdersByDateRangeController,
  getAllOrderItems,
  getOrdersAddress,
  cancelOrderController,
} from '../controllers/order.controller';
import { createCheckoutSession, orderConfirmation, paymentCancelled, paymentSuccess } from '../controllers/payment.controller';
import { handleStripeWebhook } from '../controllers/webhookController';
import express from 'express';
import roleRestriction from '../middleware/roleRestriction';
import { Role } from '@prisma/client';

const router = Router();

/**
 * Basic Order Operations
 */
router.post('/', authMiddleware, createOrder);
// Route to cancel an order
router.post('/:orderId/cancel', authMiddleware, roleRestriction([Role.ADMIN, Role.MANAGER]), cancelOrderController);
router.get('/ordersAddress', authMiddleware, getOrdersAddress); // Get all orders for a workspace

router.post('/checkout', createCheckoutSession); // Initiates Stripe Checkout
router.get('/payment-success', paymentSuccess);
router.get('/payment-cancelled', paymentCancelled);
router.get('/order-confirmation', orderConfirmation);

router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook); // Stripe Webhook
router.get('/workspaces/:workspaceId/orders', authMiddleware, getOrders);
router.get('/workspaces/:workspaceId/orders/:orderId', authMiddleware, getOrder);
router.patch('/workspaces/:workspaceId/orders/:orderId', authMiddleware, updateOrder);
router.delete('/workspaces/:workspaceId/orders/:orderId', authMiddleware, deleteOrder);

/**
 * Order Items
 */
router.post('/workspaces/:workspaceId/orders/:orderId/items', authMiddleware, addOrderItem);
router.delete('/workspaces/:workspaceId/orders/:orderId/items/:itemId', authMiddleware, removeOrderItem);
router.get('/workspaces/:workspaceId/order/items', authMiddleware, getAllOrderItems);

/**
 * Order Status & Payment
 */
router.patch('/workspaces/:workspaceId/orders/:orderId/status', authMiddleware, updateOrderStatus);
router.patch('/workspaces/:workspaceId/orders/:orderId/payment-status', authMiddleware, updatePaymentStatus);
router.get('/workspaces/:workspaceId/orders/status/:status', authMiddleware, getOrdersByStatus);

/**
 * Order by User & Reorder
 */
router.get('/users/:userId/orders', authMiddleware, getOrdersByUser);
router.post('/:orderId/reorder', authMiddleware, reorder);

/**
 * Summary, History, Invoice
 */
router.get('/workspaces/:workspaceId/orders/summary', authMiddleware, getOrderSummary);
router.get('/workspaces/:workspaceId/orders/:orderId/history', authMiddleware, getOrderHistory);
router.get('/workspaces/:workspaceId/orders/:orderId/invoice', authMiddleware, downloadInvoice);

/**
 * Bulk & Advanced Operations
 */
router.patch('/workspaces/:workspaceId/orders/bulk-update', authMiddleware, bulkUpdateOrders);
router.patch('/workspaces/:workspaceId/orders/:orderId/assign-delivery', authMiddleware, assignDeliveryPartner);
router.post('/workspaces/:workspaceId/orders/:orderId/clone', authMiddleware, cloneOrder);
router.post('/workspaces/:workspaceId/orders/:orderId/notify', authMiddleware, notifyOrderStatus);

/**
 * Search, Export, and Date Range Filters
 */
router.get('/workspaces/:workspaceId/orders/search', authMiddleware, searchOrders);
router.get('/workspaces/:workspaceId/orders/:orderId/export', authMiddleware, exportOrders);
router.get('/workspaces/:workspaceId/orders/date-range', authMiddleware, getOrdersByDateRangeController);

export default router;
