// import { NextFunction, Request, Response } from 'express';
// import prisma from '../util/prisma';
// import { stripe } from '../config/stripeService';

// export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
//   const { orderId } = req.body;

//   try {
//     const order = await prisma.order.findUnique({
//       where: { id: orderId },
//       include: { items: true },
//     });

//     if (!order) {
//       res.status(404).json({ message: 'Order not found' });
//       return;
//     }

//     if (order.status !== 'PENDING') {
//       res.status(400).json({ message: 'Order not available for payment' });
//       return;
//     }

//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(order.totalAmount * 100),
//       currency: 'usd',
//       metadata: {
//         orderId: order.id,
//         userId: order.userId,
//       },
//     });

//     res.json({
//       clientSecret: paymentIntent.client_secret,
//     });
//   } catch (error) {
//     console.error('Stripe Payment Intent error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };
import { Request, Response, NextFunction } from 'express';
import { stripe } from '../config/stripeService';
import { getOrderPreview } from '../services/order.service';
import logger from '../util/logger';
import prisma from '../util/prisma';
import { OrderStatus } from '@prisma/client';
import httpResponse from '../util/httpResponse';
import httpError from '../util/httpError';

export const createCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { workspaceId, items, shippingAddress, billingAddress } = req.body;

    const orderPreview = await getOrderPreview(items, userId as string);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: orderPreview.lineItems,
      mode: 'payment',
      metadata: {
        userId: userId || '',
        workspaceId: workspaceId?.toString() || '',
        items: JSON.stringify(items || []),
        shippingAddress: JSON.stringify(shippingAddress || {}),
        billingAddress: JSON.stringify(billingAddress || {})
      },
      shipping_address_collection: { allowed_countries: ['US', 'BR'] },
      success_url: 'http://localhost:3000/order-confirmation/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/payment-cancelled'
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    logger.error('Stripe checkout session error', error);
    next(error);
  }
};

export const stripeconfirmation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return httpResponse(req, res, 400, "Session ID is required");
    }

    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    if (session.payment_status === "paid") {
      return httpResponse(req, res, 200, "Payment successful", session);
    } else {
      return httpResponse(req, res, 200, "Payment not successful", session);
    }
  } catch (error) {
    logger.error("Verify Stripe session error", error);
    return httpError(next, error, req);
  }
};

export const paymentSuccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = req.query.session_id as string;
    const returnJson = req.query.json === 'true' || req.headers.accept?.includes('application/json');

    if (!sessionId) {
      return httpError(next, new Error('Missing session ID'), req, 400);
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = session.metadata?.orderId;

    if (!session || session.payment_status !== 'paid' || !orderId) {
      return httpError(next, new Error('Payment not completed or invalid session/order ID'), req, 400);
    }

    // Update order status and payment info
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PROCESSING', // OR use an enum like OrderStatus.PROCESSING
        paymentStatus: 'COMPLETED',
        paidAt: new Date(),
        paymentDetails: {
          // Prisma expects JSON-compatible values
          stripeSessionId: session.id,
          paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent as any)?.id ?? null,
          amountPaid: (session.amount_total ?? 0) / 100,
          currency: session.currency
        }
      }
    });

    if (returnJson) {
      res.status(200).json({
        success: true,
        message: 'Payment successful',
        orderId,
        sessionId,
        amount_total: session.amount_total,
        customer_email: session.customer_details?.email
      });
      return;
    }
  } catch (error) {
    logger.error('Payment success handler error', error);
    return next(error);
  }
};

export const paymentCancelled = async (req: Request, res: Response): Promise<void> => {
  const returnJson = req.query.json === 'true' || req.headers.accept?.includes('application/json');

  if (returnJson) {
    res.status(200).json({
      success: false,
      message: 'Payment was cancelled by the user.'
    });
    return;
  }
  // res.redirect(`${process.env.FRONTEND_URL}/checkout-cancelled`);
  // return;
};

// controllers/order.controller.ts
export const orderConfirmation = async (req: Request, res: Response): Promise<void> => {
  try {

    // const session= prisma.order.findMany({ where: { id: req.params.orderId } });
    const sessionId = req.query.session_id as string;

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'Missing session ID' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.status(200).json({
      success: true,
      message: 'Order confirmed',
      sessionId,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email,
      payment_status: session.payment_status
    });
  } catch (error) {
    logger.error('Order confirmation error', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
