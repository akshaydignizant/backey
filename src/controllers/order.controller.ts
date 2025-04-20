import { Request, Response, NextFunction } from 'express';
import * as orderService from '../services/order.service';
import { OrderStatus, PaymentMethod, Role } from '@prisma/client';
import { generatePDF } from '../util/pdfGenerator';
import { sendNotification } from '../util/notification';
import { exportToCSV } from '../util/exportCsv';
import { AuthRequest } from '../types/types';
import httpResponse from '../util/httpResponse';
import httpError from '../util/httpError';
import { prisma } from '../app';


export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const authUserId = req.user?.userId;

  const {
    shippingAddressId,
    billingAddressId,
    shippingAddress,
    billingAddress,
    paymentMethod,
    items,
    notes,
  } = req.body;

  if (
    isNaN(workspaceId) ||
    !authUserId ||
    !paymentMethod ||
    !Array.isArray(items) ||
    items.length === 0 ||
    (!shippingAddressId && !shippingAddress) ||
    (!billingAddressId && !billingAddress)
  ) {
    return httpResponse(req, res, 400, 'Invalid input data');
  }

  try {
    let finalShippingAddressId = shippingAddressId;
    let finalBillingAddressId = billingAddressId;

    // Create shipping address if object provided
    if (!finalShippingAddressId && shippingAddress) {
      const createdShipping = await prisma.address.create({
        data: { ...shippingAddress, userId: authUserId },
      });
      finalShippingAddressId = createdShipping.id;
    }

    // Create billing address if object provided
    if (!finalBillingAddressId && billingAddress) {
      const createdBilling = await prisma.address.create({
        data: { ...billingAddress, userId: authUserId },
      });
      finalBillingAddressId = createdBilling.id;
    }

    // Proceed with order creation
    const order = await orderService.createOrder(
      workspaceId,
      {
        userId: authUserId,
        shippingAddressId: finalShippingAddressId,
        billingAddressId: finalBillingAddressId,
        paymentMethod,
        items,
        notes,
      },
      authUserId
    );

    return httpResponse(req, res, 201, 'Order created successfully', order);
  } catch (error) {
    return httpError(next, error, req);
  }
};


export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or user ID');
  }

  try {
    const orders = await orderService.getOrders(workspaceId, authUserId);
    return httpResponse(req, res, 200, 'Orders retrieved successfully', orders);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const getOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or order ID');
  }

  try {
    const order = await orderService.getOrder(workspaceId, orderId, authUserId);
    return httpResponse(req, res, 200, 'Order retrieved successfully', order);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const updateOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const { shippingAddressId, billingAddressId, paymentMethod, notes } = req.body;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or order ID');
  }

  try {
    const order = await orderService.updateOrder(workspaceId, orderId, { shippingAddressId, billingAddressId, paymentMethod, notes }, authUserId);
    return httpResponse(req, res, 200, 'Order updated successfully', order);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or order ID');
  }

  try {
    await orderService.deleteOrder(workspaceId, orderId, authUserId);
    return httpResponse(req, res, 200, 'Order deleted successfully');
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const addOrderItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const { variantId, quantity, price } = req.body;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !variantId || !quantity || !price || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid input data');
  }

  try {
    const orderItem = await orderService.addOrderItem(workspaceId, orderId, { variantId, quantity, price }, authUserId);
    return httpResponse(req, res, 201, 'Order item added successfully', orderItem);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const removeOrderItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const itemId = req.params.itemId;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !itemId || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID, order ID, or item ID');
  }

  try {
    await orderService.removeOrderItem(workspaceId, orderId, itemId, authUserId);
    return httpResponse(req, res, 200, 'Order item removed successfully');
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const { status } = req.body;
  const authUserId = req.user?.userId;
  if (isNaN(workspaceId) || !orderId || !status || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID, order ID, or status');
  }

  try {
    const order = await orderService.updateOrderStatus(workspaceId, orderId, status, authUserId);
    return httpResponse(req, res, 200, 'Order status updated successfully', order);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const { paymentMethod } = req.body;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !paymentMethod || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID, order ID, or payment method');
  }

  try {
    const order = await orderService.updatePaymentStatus(workspaceId, orderId, paymentMethod, authUserId);
    return httpResponse(req, res, 200, 'Payment status updated successfully', order);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const getOrdersByStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const status = req.params.status as OrderStatus;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !status || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or status');
  }

  try {
    const orders = await orderService.getOrdersByStatus(workspaceId, status, authUserId);
    return httpResponse(req, res, 200, 'Orders retrieved successfully', orders);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const getOrdersByUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const userId = req.params.userId;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !userId || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or user ID');
  }

  try {
    const orders = await orderService.getOrdersByUser(workspaceId, userId, authUserId);
    return httpResponse(req, res, 200, 'Orders retrieved successfully', orders);
  } catch (error) {
    return httpError(next, error, req);
  }
};

// Controller
export const getOrdersByDateRangeController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const { startDate, endDate } = req.query;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !startDate || !endDate || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or date range');
  }

  const start = new Date(startDate as string);
  const end = new Date(new Date(endDate as string).setHours(23, 59, 59, 999)); // extend end date to full day

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return httpResponse(req, res, 400, 'Invalid date format. Please use a valid ISO date string.');
  }

  try {
    const orders = await orderService.getOrdersByDateRange(workspaceId, start, end, authUserId);
    return httpResponse(req, res, 200, 'Orders retrieved successfully', orders);
  } catch (error) {
    return httpError(next, error, req);
  }
};


export const bulkUpdateOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const { orderIds, status } = req.body;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderIds || !status || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID, order IDs, or status');
  }

  try {
    await orderService.bulkUpdateOrders(workspaceId, orderIds, status, authUserId);
    return httpResponse(req, res, 200, 'Orders updated successfully');
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const assignDeliveryPartner = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const { deliveryPartnerId } = req.body;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !deliveryPartnerId || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID, order ID, or delivery partner ID');
  }

  try {
    const order = await orderService.assignDeliveryPartner(workspaceId, orderId, deliveryPartnerId, authUserId);
    return httpResponse(req, res, 200, 'Delivery partner assigned successfully', order);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const cloneOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or order ID');
  }

  try {
    const order = await orderService.cloneOrder(workspaceId, orderId, authUserId);
    return httpResponse(req, res, 201, 'Order cloned successfully', order);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const reorder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const authUserId = req.user?.userId;

  // Validate inputs
  if (!authUserId || !orderId || isNaN(workspaceId)) {
    return httpResponse(req, res, 400, 'Invalid workspace ID, order ID, or user credentials.');
  }

  try {
    const newOrder = await orderService.reorder(workspaceId, orderId, authUserId);
    return httpResponse(req, res, 201, 'Order re-created successfully', newOrder);
  } catch (error) {
    return httpError(next, error, req);
  }
};


export const notifyOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const { message } = req.body;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !message || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID, order ID, or message');
  }

  try {
    await orderService.notifyOrderStatus(workspaceId, orderId, message, authUserId);
    return httpResponse(req, res, 200, 'Notification sent successfully');
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const getOrderHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or order ID');
  }

  try {
    const history = await orderService.getOrderHistory(workspaceId, orderId, authUserId);
    return httpResponse(req, res, 200, 'Order history retrieved successfully', history);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const getOrderSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or unauthorized access');
  }

  try {
    const summary = await orderService.getOrderSummary(workspaceId, authUserId);
    return httpResponse(req, res, 200, 'Order summary retrieved successfully', summary);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const searchOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const workspaceId = Number(req.params.workspaceId);
  const { query } = req.query;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !query || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or query');
  }

  try {
    const orders = await orderService.searchOrders(workspaceId, query as string, authUserId);
    return httpResponse(req, res, 200, 'Orders retrieved successfully', orders);
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const exportOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const workspaceId = Number(req.params.workspaceId);
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID');
  }

  try {
    const csv = await orderService.exportOrders(workspaceId, authUserId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csv);
    return
  } catch (error) {
    return httpError(next, error, req);
  }
};

export const downloadInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const workspaceId = Number(req.params.workspaceId);
  const orderId = req.params.orderId;
  const authUserId = req.user?.userId;

  if (isNaN(workspaceId) || !orderId || !authUserId) {
    return httpResponse(req, res, 400, 'Invalid workspace ID or order ID');
  }

  try {
    const pdfBuffer = await orderService.downloadInvoice(workspaceId, orderId, authUserId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
    res.send(pdfBuffer);
    return
  } catch (error) {
    return httpError(next, error, req);
  }
};