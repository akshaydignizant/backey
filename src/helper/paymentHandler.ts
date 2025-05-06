import { Response, NextFunction } from 'express';
import * as orderService from '../services/order.service';
import { PaymentMethod } from '@prisma/client';
import { AuthRequest } from '../types/types';
import httpResponse from '../util/httpResponse';
import httpError from '../util/httpError';
import { prisma } from '../app';
import { stripe } from '../config/stripeService';
import logger from '../util/logger';

export const handleCashPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authUserId = req.user?.userId;

  const {
    shippingAddressId,
    billingAddressId,
    shippingAddress,
    billingAddress,
    items,
    notes,
  } = req.body;

  // Input validation
  if (
    !authUserId ||
    !Array.isArray(items) ||
    items.length === 0 ||
    (!shippingAddressId && !shippingAddress) ||
    (!billingAddressId && !billingAddress)
  ) {
    return httpResponse(req, res, 400, 'Invalid input data');
  }

  try {
    const order = await orderService.createOrder(
      {
        userId: authUserId,
        shippingAddressId,
        billingAddressId,
        shippingAddress,
        billingAddress,
        paymentMethod: PaymentMethod.CASH,
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

export const handleStripePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { items, notes, successUrl, cancelUrl, shippingAddressId, billingAddressId, shippingAddress, billingAddress } = req.body;

    if (!userId) {
      return httpResponse(req, res, 400, 'User ID is required');
    }

    if (!Array.isArray(items) || items.length === 0) {
      return httpResponse(req, res, 400, 'Items are required');
    }

    if (!successUrl || !cancelUrl) {
      return httpResponse(req, res, 400, 'Success and cancel URLs are required');
    }

    // Generate order preview for line items
    const orderPreview = await orderService.getOrderPreview(items, userId);

    if (!orderPreview || !orderPreview.lineItems || orderPreview.lineItems.length === 0) {
      return httpResponse(req, res, 400, 'Invalid order preview');
    }

    // Step 1: Create the order with status 'PENDING'
    const order = await orderService.createOrder(
      {
        userId,
        shippingAddressId,
        billingAddressId,
        shippingAddress,
        billingAddress,
        paymentMethod: PaymentMethod.STRIPE, // use CARD for Stripe payment
        items,
        notes,
        status: 'PENDING', // Ensure status is PENDING
      },
      userId
    );

    // Step 2: Create the Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: orderPreview.lineItems,
      mode: 'payment',
      metadata: {
        orderId: order.orderId,
        userId,
        notes: notes || '',
        items: JSON.stringify(items),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Optional: Save session ID on order now or via webhook later
    await prisma.order.update({
      where: { id: order.orderId },
      data: { stripeSessionId: session.id },
    });

    return res.status(200).json({ url: session.url, session_id: session.id });
  } catch (error) {
    logger.error('Stripe session error', error);
    return httpError(next, error, req);
  }
};