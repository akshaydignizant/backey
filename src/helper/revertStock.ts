import { Prisma } from '@prisma/client';

export const revertStock = async (items: any[], tx: Prisma.TransactionClient) => {
  const stockUpdatePromises = items.map(item =>
    tx.productVariant.update({
      where: { id: item.variantId },
      data: {
        stock: {
          increment: item.quantity,
        },
      },
    })
  );

  await Promise.all(stockUpdatePromises);
};
