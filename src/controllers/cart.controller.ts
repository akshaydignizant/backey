// src/controllers/cart.controller.ts
import {
  addToCart,
  getCartItems,
  removeFromCart,
  clearCart,
  getCartTotal,
  checkCartItemsAvailability,
  updateCartItemByVariant,
} from '../services/cart.service';
import { NextFunction, Request, Response } from 'express';
import httpError from '../util/httpError';
import httpResponse from '../util/httpResponse';

export const addItemToCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { variantId, quantity } = req.body;
    const userId = req.user?.userId;
    console.log('User ID:', userId, 'Variant ID:', variantId, 'Quantity:', quantity); // Debugging line
    if (!userId || !variantId) {
      return httpError(next, new Error('Invalid input data'), req, 400);
    }
    const cartItem = await addToCart(userId, variantId, quantity);
    return httpResponse(req, res, 201, 'Item added to cart successfully', cartItem);
  } catch (error) {
    return httpError(next, error, req, 400);
  }
};

export const getUserCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const cartItems = await getCartItems(userId as string);
    return httpResponse(req, res, 200, 'Cart items fetched successfully', cartItems);
  } catch (error) {
    console.error('Error fetching cart items:', error); // Debugging line
    return httpError(next, error, req, 400);
  }
};

export const updateCartItemQuantity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { variantId } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new Error('Unauthorized: User not authenticated');
    }

    if (!variantId || typeof quantity !== 'number' || quantity < 0) {
      throw new Error('Invalid variant ID or quantity');
    }

    const updatedItem = await updateCartItemByVariant(userId, variantId, quantity);

    return httpResponse(req, res, 200, 'Cart item updated successfully', updatedItem);
  } catch (error) {
    return httpError(next, error, req, 400);
  }
};

export const deleteCartItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { variantId } = req.params;
    const userId = req.user?.userId;
    const deletedItem = await removeFromCart(variantId, userId as string);
    if (!deletedItem) {
      return httpError(next, new Error('Cart item not found'), req, 404);
    }
    return httpResponse(req, res, 200, 'Cart item deleted successfully', deletedItem);
  } catch (error) {
    return httpError(next, error, req, 400);
  }
};

export const emptyCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    await clearCart(userId as string);
    return httpResponse(req, res, 200, 'Cart cleared successfully');
  } catch (error) {
    return httpError(next, error, req, 400);
  }
};

export const getCartSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const [items, total, availability] = await Promise.all([
      getCartItems(userId as string),
      getCartTotal(userId as string),
      checkCartItemsAvailability(userId as string),
    ]);

    res.status(200).json({
      items,
      total,
      allItemsAvailable: availability.allAvailable,
      unavailableItems: availability.unavailableItems,
    });
  } catch (error) {
    res.status(400).json({ error: error });
  }
};