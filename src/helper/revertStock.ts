import { Prisma } from '@prisma/client';
import prisma from '../util/prisma';
export const revertStock = async (items: any[], tx?: Prisma.TransactionClient) => {
  const stockUpdatePromises = items.map(item =>
    prisma.productVariant.update({
      where: { id: item.variantId },
      data: {
        stock: {
          increment: item.quantity, // Increment stock when order is canceled
        },
      },
    })
  );

  await Promise.all(stockUpdatePromises);
};