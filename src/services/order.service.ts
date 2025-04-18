import { PrismaClient, OrderStatus, PaymentMethod, Role, Address } from '@prisma/client';
import { generatePDF } from '../util/pdfGenerator'; // Assumed utility
import { sendNotification } from '../util/notification'; // Assumed utility
import { exportToCSV } from '../util/exportCsv'; // Assumed utility
import { checkPermission } from '../util/checkPermission';
import sendEmail from '../util/sendEmail';
import logger from '../util/logger';

const prisma = new PrismaClient();

export const createOrder = async (
  workspaceId: number,
  data: {
    userId: string;
    shippingAddressId: string;
    billingAddressId: string;
    paymentMethod: PaymentMethod;
    items: { variantId: string; quantity: number; price: number }[];
    notes?: string;
  },
  authUserId: string
) => {
  // 1. Permission check and user/workspace validation
  await checkPermission(workspaceId, authUserId, 'CREATE_ORDER');

  const [workspace, user] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.user.findUnique({ where: { id: data.userId } }),
  ]);
  if (!workspace) throw new Error('Workspace not found');
  if (!user) throw new Error('User not found');

  // 2. Address validation
  const [shippingAddress, billingAddress] = await Promise.all([
    prisma.address.findUnique({ where: { id: data.shippingAddressId } }),
    prisma.address.findUnique({ where: { id: data.billingAddressId } }),
  ]);
  if (!shippingAddress || !billingAddress) throw new Error('Address not found');

  // 3. Variant & stock validation
  const variantIds = data.items.map(i => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, stock: true },
  });

  const stockErrors: string[] = [];
  const variantMap = new Map(variants.map(v => [v.id, v.stock]));

  for (const item of data.items) {
    const stock = variantMap.get(item.variantId);
    if (stock == null) throw new Error(`Variant ${item.variantId} not found`);
    if (item.quantity > stock) {
      stockErrors.push(`Not enough stock for variant ${item.variantId}`);
    }
  }
  if (stockErrors.length > 0) throw new Error(stockErrors.join(', '));

  // 4. Calculate total
  const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  // 5. Transaction: Create order and update stock
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: data.userId,
        workspaceId,
        shippingAddressId: data.shippingAddressId,
        billingAddressId: data.billingAddressId,
        paymentMethod: data.paymentMethod,
        totalAmount,
        notes: data.notes,
        items: {
          createMany: {
            data: data.items.map(item => ({
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      },
      include: { items: true },
    });

    await Promise.all(
      data.items.map(item =>
        tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        })
      )
    );

    return newOrder;
  });

  return {
    orderId: order.id,
    totalAmount: order.totalAmount,
    status: order.status,
    itemCount: order.items.length,
    message: 'Order placed successfully',
  };
};

export const getOrders = async (workspaceId: number, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');
  return prisma.order.findMany({
    where: { workspaceId },
    include: { items: { include: { variant: true } }, user: true, shippingAddress: true, billingAddress: true },
  });
};

export const getOrder = async (workspaceId: number, orderId: string, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');
  const order = await prisma.order.findUnique({
    where: { id: orderId, workspaceId },
    include: { items: { include: { variant: true } }, user: true, shippingAddress: true, billingAddress: true },
  });
  if (!order) throw new Error('Order not found');
  return order;
};

export const updateOrder = async (
  workspaceId: number,
  orderId: string,
  data: {
    shippingAddressId?: string;
    billingAddressId?: string;
    paymentMethod?: PaymentMethod;
    notes?: string;
  },
  authUserId: string
) => {
  // 🛡️ Permission check
  await checkPermission(workspaceId, authUserId, 'UPDATE_ORDER');

  // 🧾 Validate order existence
  const order = await prisma.order.findUnique({
    where: { id: orderId, workspaceId },
  });
  if (!order) throw new Error('Order not found');

  const updateData: Partial<typeof data> = {};
  if (data.shippingAddressId) updateData.shippingAddressId = data.shippingAddressId;
  if (data.billingAddressId) updateData.billingAddressId = data.billingAddressId;
  if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.paymentMethod) {
    if (!Object.values(PaymentMethod).includes(data.paymentMethod as PaymentMethod)) {
      throw new Error('Invalid payment method');
    }
    updateData.paymentMethod = data.paymentMethod as PaymentMethod;
  }
  // 🚫 No fields to update
  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields provided for update');
  }

  // 🛠️ Perform update
  return prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      items: true,
      user: true,
      shippingAddress: true,
      billingAddress: true,
    },
  });
};


export const deleteOrder = async (workspaceId: number, orderId: string, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'DELETE_ORDER');
  const order = await prisma.order.findUnique({ where: { id: orderId, workspaceId } });
  if (!order) throw new Error('Order not found');

  await prisma.order.delete({ where: { id: orderId } });
};

export const addOrderItem = async (
  workspaceId: number,
  orderId: string,
  data: { variantId: string; quantity: number; price: number },
  authUserId: string
) => {
  await checkPermission(workspaceId, authUserId, 'UPDATE_ORDER');
  const order = await prisma.order.findUnique({ where: { id: orderId, workspaceId } });
  if (!order) throw new Error('Order not found');

  const variant = await prisma.productVariant.findUnique({ where: { id: data.variantId } });
  if (!variant || variant.stock < data.quantity) throw new Error('Invalid variant or insufficient stock');

  return prisma.$transaction(async (tx) => {
    const orderItem = await tx.orderItem.create({
      data: {
        orderId,
        variantId: data.variantId,
        quantity: data.quantity,
        price: data.price,
      },
    });

    await tx.productVariant.update({
      where: { id: data.variantId },
      data: { stock: { decrement: data.quantity } },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { totalAmount: { increment: data.quantity * data.price } },
    });

    return orderItem;
  });
};

export const removeOrderItem = async (workspaceId: number, orderId: string, itemId: string, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'UPDATE_ORDER');
  const order = await prisma.order.findUnique({ where: { id: orderId, workspaceId } });
  if (!order) throw new Error('Order not found');

  const orderItem = await prisma.orderItem.findUnique({ where: { id: itemId, orderId } });
  if (!orderItem) throw new Error('Order item not found');

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.delete({ where: { id: itemId } });
    await tx.productVariant.update({
      where: { id: orderItem.variantId },
      data: { stock: { increment: orderItem.quantity } },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { totalAmount: { decrement: orderItem.quantity * orderItem.price } },
    });
  });
};

export const updateOrderStatus = async (workspaceId: number, orderId: string, status: OrderStatus, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'UPDATE_ORDER_STATUS');
  const order = await prisma.order.findUnique({ where: { id: orderId, workspaceId } });
  if (!order) throw new Error('Order not found');

  return prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: { items: true, user: true, shippingAddress: true, billingAddress: true },
  });
};

export const updatePaymentStatus = async (workspaceId: number, orderId: string, paymentMethod: PaymentMethod, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'UPDATE_PAYMENT_STATUS');
  const order = await prisma.order.findUnique({ where: { id: orderId, workspaceId } });
  if (!order) throw new Error('Order not found');

  return prisma.order.update({
    where: { id: orderId },
    data: { paymentMethod },
    include: { items: true, user: true, shippingAddress: true, billingAddress: true },
  });
};

export const getOrdersByStatus = async (workspaceId: number, status: OrderStatus, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');
  return prisma.order.findMany({
    where: { workspaceId, status },
    include: { items: { include: { variant: true } }, user: true, shippingAddress: true, billingAddress: true },
  });
};

export const getOrdersByUser = async (workspaceId: number, userId: string, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  return prisma.order.findMany({
    where: { workspaceId, userId },
    include: { items: { include: { variant: true } }, user: true, shippingAddress: true, billingAddress: true },
  });
};

export const getOrdersByDateRange = async (
  workspaceId: number,
  startDate: string | Date, // This can be a string or a Date object
  endDate: string | Date,   // This can be a string or a Date object
  authUserId: string
) => {
  // Convert startDate and endDate to Date objects if they're passed as strings
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Validate that startDate and endDate are valid Date objects
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start or end date');
  }

  // Ensure the user has permission to view orders
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');

  // Query the database to fetch orders placed within the given date range
  const orders = await prisma.order.findMany({
    where: {
      workspaceId,                  // Filter by workspaceId
      placedAt: { gte: start, lte: end },  // Filter by placedAt date range
    },
    include: {
      items: {
        include: {
          variant: true,              // Include product variant details
        },
      },
      user: true,                     // Include user details
      shippingAddress: true,          // Include shipping address details
      billingAddress: true,           // Include billing address details
    },
  });

  // If no orders are found, return a meaningful response
  if (!orders.length) {
    throw new Error('No orders found in the specified date range');
  }

  return orders;
};

export const bulkUpdateOrders = async (workspaceId: number, orderIds: string[], status: OrderStatus, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'UPDATE_ORDER_STATUS');
  await prisma.order.updateMany({
    where: { id: { in: orderIds }, workspaceId },
    data: { status },
  });
};

export const assignDeliveryPartner = async (workspaceId: number, orderId: string, deliveryPartnerId: string, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'ASSIGN_DELIVERY');
  const order = await prisma.order.findUnique({ where: { id: orderId, workspaceId } });
  if (!order) throw new Error('Order not found');

  const user = await prisma.user.findUnique({ where: { id: deliveryPartnerId } });
  if (!user) throw new Error('Delivery partner not found');

  // Assuming a custom field or logic for delivery partner assignment
  return prisma.order.update({
    where: { id: orderId },
    data: { notes: `Assigned to delivery partner: ${deliveryPartnerId}` }, // Placeholder
    include: { items: true, user: true, shippingAddress: true, billingAddress: true },
  });
};

export const cloneOrder = async (workspaceId: number, orderId: string, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'CREATE_ORDER');
  const order = await prisma.order.findUnique({
    where: { id: orderId, workspaceId },
    include: { items: true },
  });
  if (!order) throw new Error('Order not found');

  return prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: order.userId,
        workspaceId,
        shippingAddressId: order.shippingAddressId,
        billingAddressId: order.billingAddressId,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        notes: order.notes,
        items: {
          create: order.items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: true, user: true, shippingAddress: true, billingAddress: true },
    });

    await Promise.all(
      order.items.map(item =>
        tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        })
      )
    );

    return newOrder;
  });
};

export const reorder = async (workspaceId: number, orderId: string, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'CREATE_ORDER');
  return cloneOrder(workspaceId, orderId, authUserId); // Reuse clone logic
};

export const notifyOrderStatus = async (
  workspaceId: number,
  orderId: string,
  message: string,
  authUserId: string
): Promise<void> => {
  try {
    // Check permission
    await checkPermission(workspaceId, authUserId, 'NOTIFY_ORDER');

    // Fetch order and related user
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        workspaceId,
      },
      include: {
        user: true,
      },
    });

    // If no order found, throw detailed error
    if (!order) {
      logger.warn(`Order ${orderId} not found in workspace ${workspaceId}`);
      throw new Error(`Order with ID ${orderId} not found.`);
    }

    const userEmail = order.user?.email;
    if (!userEmail) {
      logger.error(`User email not found for order ${orderId}`);
      throw new Error(`Cannot notify user: Email not found.`);
    }

    const emailSubject = `Update on Your Order #${orderId}`;
    const emailBody = `
      <p>Dear ${order.user.firstName || 'Customer'},</p>
      <p>${message}</p>
      <p>Thank you for choosing us!</p>
      <p>– Team ${workspaceId}</p>
    `;

    // Send the email
    await sendEmail(userEmail, emailSubject, emailBody);

    logger.info(`Notification sent for order ${orderId} to ${userEmail}`);
  } catch (error) {
    logger.error(`Failed to notify user for order ${orderId}: ${error}`);
    throw error;
  }
};

export const getOrderHistory = async (workspaceId: number, orderId: string, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');
  const order = await prisma.order.findUnique({ where: { id: orderId, workspaceId } });
  if (!order) throw new Error('Order not found');

  // Assuming a history table or audit log; here we return basic changes
  return [
    { timestamp: order.createdAt, action: 'Order Created', details: `Status: ${order.status}` },
    { timestamp: order.updatedAt, action: 'Order Updated', details: `Status: ${order.status}` },
  ];
};

export const getOrderSummary = async (workspaceId: number, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');
  const [totalOrders, totalRevenue, statusCounts] = await Promise.all([
    prisma.order.count({ where: { workspaceId } }),
    prisma.order.aggregate({ where: { workspaceId }, _sum: { totalAmount: true } }),
    prisma.order.groupBy({
      by: ['status'],
      where: { workspaceId },
      _count: { id: true },
    }),
  ]);

  return {
    totalOrders,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    statusCounts: statusCounts.map(s => ({ status: s.status, count: s._count.id })),
  };
};

export const searchOrders = async (workspaceId: number, query: string, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');
  return prisma.order.findMany({
    where: {
      workspaceId,
      OR: [
        { id: { contains: query } },
        { user: { email: { contains: query } } },
        { notes: { contains: query } },
      ],
    },
    include: { items: { include: { variant: true } }, user: true, shippingAddress: true, billingAddress: true },
  });
};

export const exportOrders = async (workspaceId: number, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'EXPORT_ORDERS');
  const orders = await prisma.order.findMany({
    where: { workspaceId },
    include: { items: { include: { variant: true } }, user: true },
  });

  const csvData = orders.map(order => ({
    id: order.id,
    userEmail: order.user.email,
    totalAmount: order.totalAmount,
    status: order.status,
    placedAt: order.placedAt.toISOString(),
    itemCount: order.items.length,
  }));

  return exportToCSV(csvData);
};

export const downloadInvoice = async (workspaceId: number, orderId: string, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');
  const order = await prisma.order.findUnique({
    where: { id: orderId, workspaceId },
    include: { items: { include: { variant: true } }, user: true, shippingAddress: true, billingAddress: true },
  });
  if (!order) throw new Error('Order not found');

  const pdfData = {
    orderId: order.id,
    userEmail: order.user.email,
    totalAmount: order.totalAmount,
    status: order.status,
    items: order.items.map(item => ({
      variant: item.variant.title,
      quantity: item.quantity,
      price: item.price,
    })),
    shippingAddress: order.shippingAddress.address,
    billingAddress: order.billingAddress.address,
  };

  return generatePDF(pdfData);
};