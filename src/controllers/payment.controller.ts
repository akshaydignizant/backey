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
      success_url: 'http://localhost:3000/api/v1/orders/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/api/v1/orders/payment-cancelled'
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    logger.error('Stripe checkout session error', error);
    next(error);
  }
};

export const paymentSuccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = req.query.session_id as string;
    const returnJson = req.query.json === 'true' || req.headers.accept?.includes('application/json');

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'Missing session ID' });
      return
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = session.metadata?.orderId;

    if (!session || session.payment_status !== 'paid') {
      res.status(400).json({ success: false, message: 'Payment not completed or session invalid' });
      return
    }

    // Update order status to PAID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED, // Use enum OrderStatus.PAID if importing it
        paidAt: new Date(),
        paymentDetails: {
          stripeSessionId: session.id,
          paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
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
    }

    return res.redirect(`${process.env.FRONTEND_URL}/order-confirmation?order_id=${orderId}`);
  } catch (error) {
    logger.error('Payment success handler error', error);
    next(error);
  }
};

export const paymentCancelled = async (req: Request, res: Response): Promise<void> => {
  const returnJson = req.query.json === 'true' || req.headers.accept?.includes('application/json');

  if (returnJson) {
    res.status(200).json({
      success: false,
      message: 'Payment was cancelled by the user.'
    });
  }

  res.redirect(`${process.env.FRONTEND_URL}/checkout-cancelled`);
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
