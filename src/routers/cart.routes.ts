// src/routes/cart.routes.ts
import express from 'express';
import {
  addItemToCart,
  getUserCart,
  updateCartItemQuantity,
  deleteCartItem,
  emptyCart,
  getCartSummary,
} from '../controllers/cart.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authMiddleware); // All cart routes require authentication

// Add item to cart
router.post('/', addItemToCart);

// Get user's cart
router.get('/', getUserCart);

// Get cart summary (items + total + availability check)
router.get('/summary', getCartSummary);

// Update cart item quantity
router.put('/:variantId', updateCartItemQuantity);

// Remove item from cart
router.delete('/:variantId', deleteCartItem);

// Clear entire cart
router.delete('/', emptyCart);

export default router;