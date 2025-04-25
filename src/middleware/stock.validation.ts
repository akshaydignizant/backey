import { Request, Response, NextFunction } from 'express';
import { IStockUpdate } from '../types/products/stock.interface';
import httpError from '../util/httpError';

export function validateStockUpdate(req: Request, res: Response, next: NextFunction): void {
  const { action, quantity } = req.body as IStockUpdate;

  if (!action || !['increment', 'decrement', 'set'].includes(action)) {
    res.status(400).json({ message: 'Invalid or missing action' });
    return httpError(next, new Error('Invalid or missing action'), req);
  }

  if (typeof quantity !== 'number' || quantity < 0) {
    return httpError(next, new Error('Invalid quantity'), req);
  }

  next();
}
