// src/services/cart.service.ts

import prisma from '../util/prisma';

export const addToCart = async (
  userId: string,
  variantId: string,
  quantity: number = 1
) => {
  // Check if variant exists and is available
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId, isAvailable: true },
    select: { stock: true, product: { select: { workspaceId: true, images: true } } },
  });

  if (!variant) {
    throw new Error('Product variant not found or unavailable');
  }

  // Check stock availability
  if (variant.stock < quantity) {
    throw new Error('Insufficient stock available');
  }

  // Include structure for product with images
  const includeStructure = {
    variant: {
      include: {
        product: {
          select: {
            name: true,
            images: true,
            // workspaceId: true,
          },
        },
      },
    },
  };

  // Check if item already exists in cart
  const existingItem = await prisma.cartItem.findFirst({
    where: { userId, variantId },
  });

  if (existingItem) {
    // Update quantity if item exists
    return await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
      include: includeStructure,
    });
  }

  // Create new cart item
  return await prisma.cartItem.create({
    data: {
      userId,
      variantId,
      quantity,
    },
    include: includeStructure,
  });
};


export const getCartItems = async (userId: string) => {
  return await prisma.cartItem.findMany({
    where: { userId },
    include: {
      variant: {
        include: {
          product: {
            select: {
              name: true,
              images: true,
              workspaceId: true,
            },
          },
        },
      },
    },
  });
};

export const updateCartItemByVariant = async (
  userId: string,
  variantId: string,
  quantity: number
) => {
  // Find the existing cart item
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      userId,
      variantId,
    },
    include: {
      variant: true,
    },
  });

  if (!existingItem) {
    throw new Error('Cart item not found');
  }

  // Check stock
  if (existingItem.variant.stock < quantity) {
    throw new Error('Insufficient stock available');
  }

  if (quantity <= 0) {
    // Remove the item from cart
    return await prisma.cartItem.delete({
      where: {
        id: existingItem.id,
      },
    });
  }

  // Update quantity
  return await prisma.cartItem.update({
    where: {
      id: existingItem.id,
    },
    data: {
      quantity,
    },
    include: {
      variant: true,
    },
  });
};


export const removeFromCart = async (variantId: string, userId: string) => {
  // Verify the item exists and belongs to the user
  try {
    const existingItem = await prisma.cartItem.findFirst({
      where: { variantId, userId },
    });

    if (!existingItem) {
      throw new Error('Cart item not found');
    }

    return await prisma.cartItem.delete({
      where: { id: existingItem.id },
      include: { variant: true },
    });
  } catch (error) {
    console.error('Error removing cart item by variant:', error);
    throw new Error('Failed to remove cart item');
  }
};

export const clearCart = async (userId: string) => {
  return await prisma.cartItem.deleteMany({
    where: { userId },
  });
};

export const getCartTotal = async (userId: string) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { variant: { select: { price: true } } },
  });

  return cartItems.reduce(
    (total, item) => total + item.quantity * item.variant.price,
    0
  );
};

export const checkCartItemsAvailability = async (userId: string) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      variant: {
        select: {
          id: true,
          stock: true,
          isAvailable: true,
          product: {
            select: {
              name: true,
              workspaceId: true,
            },
          },
        },
      },
    },
  });

  const unavailableItems = cartItems.filter(
    (item) =>
      !item.variant.isAvailable || item.quantity > item.variant.stock
  );

  return {
    allAvailable: unavailableItems.length === 0,
    unavailableItems: unavailableItems.map((item) => ({
      cartItemId: item.id,
      variantId: item.variant.id,
      productName: item.variant.product.name,
      requestedQuantity: item.quantity,
      availableStock: item.variant.stock,
      isAvailable: item.variant.isAvailable,
      workspaceId: item.variant.product.workspaceId,
    })),
  };
};