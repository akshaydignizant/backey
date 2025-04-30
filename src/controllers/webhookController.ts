import { NextFunction, Request, Response } from 'express';
import { stripe } from '../config/stripeService';
import { createFinalOrderFromSession } from '../services/order.service';

export const handleStripeWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let event;

  try {
    const sig = req.headers['stripe-signature']!;
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature error:', err);
    res.status(400).send(`Webhook Error: ${err}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      await createFinalOrderFromSession(session);
    } catch (err) {
      console.error('Order creation from session failed:', err);
      res.status(500).send('Order handling failed');
    }
  }

  res.json({ received: true });
};
