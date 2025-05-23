import { PrismaClient, OrderStatus, PaymentMethod, Role, Address, NotificationType } from '@prisma/client';
import { generatePDF } from '../util/pdfGenerator'; // Assumed utility
import { sendNotification } from '../util/notification'; // Assumed utility
import { exportToCSV } from '../util/exportCsv'; // Assumed utility
import { checkPermission } from '../util/checkPermission';
import sendEmail from '../util/sendEmail';
import logger from '../util/logger';
import { buildOrderNotificationEmail } from '../util/notifyAdminsAndManagers';
import { log } from 'console';
import Stripe from 'stripe';
import { revertStock } from '../helper/revertStock';
import { generateOrderConfirmationEmail } from '../emailTemplate/order';
import { generatePdfFromHtml } from '../util/pdfGeneratorOrder';
import { calculateTotalAmount } from '../util/billing';

const prisma = new PrismaClient();
// export const createOrder = async (
//   workspaceId: number,
//   data: {
//     userId: string;
//     shippingAddressId: string;
//     billingAddressId: string;
//     paymentMethod: PaymentMethod;
//     items: { variantId: string; quantity: number; price: number }[];
//     notes?: string;
//   },
//   authUserId: string
// ) => {
//   try {
//     // Validate workspace and user existence
//     const [workspace, user] = await Promise.all([
//       prisma.workspace.findUnique({ where: { id: workspaceId } }),
//       prisma.user.findUnique({ where: { id: data.userId } }),
//     ]);
//     if (!workspace) throw new Error('Workspace not found');
//     if (!user) throw new Error('User not found');

//     // Validate addresses
//     const [shippingAddress, billingAddress] = await Promise.all([
//       prisma.address.findUnique({ where: { id: data.shippingAddressId } }),
//       prisma.address.findUnique({ where: { id: data.billingAddressId } }),
//     ]);
//     if (!shippingAddress || !billingAddress) throw new Error('Address not found');

//     // Validate product variants and stock
//     const variantIds = data.items.map(i => i.variantId);
//     const variants = await prisma.productVariant.findMany({
//       where: { id: { in: variantIds } },
//       select: { id: true, stock: true, title: true, price: true, product: { select: { name: true } } },
//     });

//     const stockErrors: string[] = [];
//     const variantMap = new Map(variants.map(v => [v.id, v]));
//     for (const item of data.items) {
//       const variant = variantMap.get(item.variantId);
//       if (!variant) throw new Error(`Variant ${item.variantId} not found`);
//       if (item.quantity > variant.stock) {
//         stockErrors.push(`Not enough stock for variant ${item.variantId}`);
//       }
//     }
//     if (stockErrors.length > 0) throw new Error(stockErrors.join(', '));

//     const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

//     // Execute transaction with retry logic
//     const maxRetries = 3;
//     let attempt = 0;
//     let order = undefined;

//     while (attempt < maxRetries) {
//       try {
//         order = await prisma.$transaction(
//           async (tx) => {
//             const newOrder = await tx.order.create({
//               data: {
//                 userId: data.userId,
//                 workspaceId,
//                 shippingAddressId: data.shippingAddressId,
//                 billingAddressId: data.billingAddressId,
//                 paymentMethod: data.paymentMethod,
//                 totalAmount,
//                 notes: data.notes,
//                 items: {
//                   createMany: {
//                     data: data.items.map(item => ({
//                       variantId: item.variantId,
//                       quantity: item.quantity,
//                       price: item.price,
//                     })),
//                   },
//                 },
//               },
//               include: {
//                 items: {
//                   include: {
//                     variant: {
//                       include: {
//                         product: { select: { name: true } },
//                       },
//                     },
//                   },
//                 },
//                 shippingAddress: true,
//                 billingAddress: true,
//               },
//             });

//             await Promise.all(
//               data.items.map(item =>
//                 tx.productVariant.update({
//                   where: { id: item.variantId },
//                   data: { stock: { decrement: item.quantity } },
//                 })
//               )
//             );

//             return newOrder;
//           },
//           {
//             maxWait: 5000,
//             timeout: 10000,
//           }
//         );
//         break;
//       } catch (txError: any) {
//         attempt++;
//         if (attempt === maxRetries) {
//           throw new Error(`Transaction failed after ${maxRetries} attempts: ${txError.message}`);
//         }
//         await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
//       }
//     }

//     if (!order) {
//       throw new Error('Failed to create order: Transaction did not return an order');
//     }

//     // Fetch recipients for notifications with debugging
//     const recipients = await prisma.user.findMany({
//       where: {
//         workspaces: { some: { id: workspaceId } },
//         role: { in: ['ADMIN', 'MANAGER'] },
//         isActive: true,
//         // Temporarily remove emailVerified filter for debugging
//         // emailVerified: true,
//       },
//       select: { email: true, id: true, firstName: true, lastName: true, role: true },
//     });

//     // Log recipient details for debugging
//     console.log(`Found ${recipients.length} recipients for workspace ${workspaceId}:`,
//       recipients.map(r => ({
//         id: r.id,
//         email: r.email,
//         name: `${r.firstName} ${r.lastName || ''}`,
//         role: r.role,
//       }))
//     );

//     // Format email content
//     const formatAddress = (address: NonNullable<typeof shippingAddress>) =>
//       `${address.address}, ${address.street || ''}, ${address.city}, ${address.region}, ${address.postalCode}, ${address.country}`;

//     const itemsList = order.items
//       .map(
//         item =>
//           `- ${item.variant.product.name} (${item.variant.title}): ${item.quantity} x $${item.price} = $${(
//             item.quantity * item.price
//           ).toFixed(2)}`
//       )
//       .join('\n');

//     const emailContent = `
// Hello,

// A new order (ID: ${order.id}) has been placed by ${user.firstName} ${user.lastName || ''} in workspace ${workspace.name
//       }.

// **Order Details:**
// - **Order ID**: ${order.id}
// - **Total Amount**: $${order.totalAmount.toFixed(2)}
// - **Payment Method**: ${order.paymentMethod}
// - **Status**: ${order.status}
// - **Notes**: ${order.notes || 'None'}

// **Items:**
// ${itemsList}

// **Shipping Address:**
// ${formatAddress(order.shippingAddress)}

// **Billing Address:**
// ${formatAddress(order.billingAddress)}

// Please login to the dashboard to process this order.
// `;

//     // Send emails to recipients
//     for (const recipient of recipients) {
//       try {
//         await sendEmail(
//           recipient.email,
//           `🧾 New Order Receipt: ${workspace.name} (Order ID: ${order.id})`,
//           emailContent
//         );
//         console.log(`Email sent to ${recipient.email}`);
//       } catch (emailError) {
//         console.error(`Failed to send email to ${recipient.email}:`, emailError);
//         // Log email content for debugging
//         console.log(`Email content for ${recipient.email}:\n${emailContent}`);
//       }
//     }

//     // Send email to customer
//     if (user.email && user.emailVerified) {
//       try {
//         await sendEmail(
//           user.email,
//           `🧾 Your Order Receipt: ${workspace.name} (Order ID: ${order.id})`,
//           `Dear ${user.firstName},\n\nThank you for your order!\n\n${emailContent}`
//         );
//         console.log(`Email sent to customer ${user.email}`);
//       } catch (emailError) {
//         console.error(`Failed to send email to customer ${user.email}:`, emailError);
//         console.log(`Customer email content:\n${emailContent}`);
//       }
//     }

//     return {
//       orderId: order.id,
//       totalAmount: order.totalAmount,
//       status: order.status,
//       itemCount: order.items.length,
//       message: 'Order placed successfully',
//     };
//   } catch (error: any) {
//     console.error('CreateOrder Error:', error);
//     throw new Error(`Failed to create order: ${error.message}`);
//   } finally {
//     await prisma.$disconnect();
//   }
// };

export const createOrder = async (
  data: {
    userId: string;
    shippingAddressId?: string;
    billingAddressId?: string;
    shippingAddress?: any;
    billingAddress?: any;
    paymentMethod: PaymentMethod;
    items: { variantId: string; quantity: number }[];
    notes?: string;
    status?: OrderStatus;
  },
  authUserId: string
) => {
  try {
    // Parallelize user and variant fetching
    const [user, variants] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: data.userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
      prisma.productVariant.findMany({
        where: { id: { in: data.items.map(i => i.variantId) } },
        select: {
          id: true,
          stock: true,
          price: true,
          title: true,
          product: { select: { id: true, name: true, workspaceId: true } },
        },
      }),
    ]);

    // Ensure all variants exist and belong to the same workspace
    if (variants.length !== data.items.length) {
      throw new Error("Some product variants were not found.");
    }

    const workspaceIds = new Set(variants.map(v => v.product.workspaceId));
    if (workspaceIds.size > 1) {
      throw new Error("All items must be from the same workspace.");
    }

    const workspaceId = Array.from(workspaceIds)[0];
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { id: true, name: true },
    });

    // Address handling
    let finalShippingAddressId = data.shippingAddressId;
    let finalBillingAddressId = data.billingAddressId;

    const addressPromises: Promise<any>[] = [];
    if (!finalShippingAddressId && data.shippingAddress) {
      addressPromises.push(
        prisma.address.create({
          data: { ...data.shippingAddress, userId: data.userId },
        }).then(created => finalShippingAddressId = created.id)
      );
    }
    if (!finalBillingAddressId && data.billingAddress) {
      addressPromises.push(
        prisma.address.create({
          data: { ...data.billingAddress, userId: data.userId },
        }).then(created => finalBillingAddressId = created.id)
      );
    }
    await Promise.all(addressPromises);

    // Address validation
    if (finalShippingAddressId || finalBillingAddressId) {
      const idsToCheck = [finalShippingAddressId, finalBillingAddressId].filter(Boolean) as string[];
      const found = await prisma.address.findMany({ where: { id: { in: idsToCheck } } });
      if (found.length !== idsToCheck.length) {
        throw new Error("Invalid shipping or billing address.");
      }
    }

    // Stock checks
    const variantMap = new Map(variants.map(v => [v.id, v]));
    const stockErrors: string[] = [];

    for (const item of data.items) {
      const variant = variantMap.get(item.variantId);
      if (item.quantity > variant!.stock) {
        stockErrors.push(`Insufficient stock for ${variant!.product.name} (${variant!.title})`);
      }
    }
    if (stockErrors.length) throw new Error(stockErrors.join(", "));
    const totalAmount = calculateTotalAmount(
      data.items,
      data.items.map(item => variantMap.get(item.variantId)!)
    );

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: data.userId,
          workspaceId,
          shippingAddressId: finalShippingAddressId!,
          billingAddressId: finalBillingAddressId!,
          paymentMethod: data.paymentMethod,
          status: data.status || 'PENDING',
          totalAmount,
          notes: data.notes,
          items: {
            createMany: {
              data: data.items.map(item => ({
                variantId: item.variantId,
                quantity: item.quantity,
                price: variantMap.get(item.variantId)!.price,
              })),
            },
          },
        },
        include: {
          items: {
            include: {
              variant: { include: { product: { select: { name: true } } } },
            },
          },
          shippingAddress: true,
          billingAddress: true,
        },
      });

      if (data.paymentMethod === 'CASH' || data.status === 'PROCESSING') {
        await Promise.all(
          data.items.map(item =>
            tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            })
          )
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: OrderStatus.PROCESSING,
          note: 'Order placed by user',
          changedBy: authUserId,
          createdAt: new Date(),
        },
      });

      return newOrder;
    });

    await prisma.notification.create({
      data: {
        userId: authUserId,
        workspaceId,
        title: 'New Order',
        type: NotificationType.ORDER_UPDATE,
        message: `Order #${order.id} placed`,
      },
    });

    // Fetch recipients
    const recipients = await prisma.user.findMany({
      where: {
        UserRole: { some: { workspaceId, role: { in: [Role.ADMIN, Role.MANAGER, Role.CUSTOMER] } } },
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const formatAddress = (address: { address: string; street?: string | null; city: string; region: string; postalCode: string; country: string }) =>
      `${address.address}${address.street ? `, ${address.street}` : ''}, ${address.city}, ${address.region}, ${address.postalCode}, ${address.country}`;

    // Generate HTML email content
    const itemsList = order.items.map(item => ({
      name: `${item.variant.product.name} (${item.variant.title})`,
      quantity: item.quantity,
      price: item.price,
      total: (item.quantity * item.price).toFixed(2),
    }));

    // Generate the base email HTML
    const emailTemplate = generateOrderConfirmationEmail({
      order,
      user: {
        ...user,
        lastName: user.lastName ?? undefined,
      },
      workspace,
      itemsList,
      formatAddress,
    });

    // Generate PDF from HTML template
    const pdfBuffer = await generatePDF({
      orderId: order.id,
      userEmail: user.email,
      totalAmount: order.totalAmount,
      status: order.status,
      shippingAddress: formatAddress(order.shippingAddress),
      billingAddress: formatAddress(order.billingAddress),
      items: order.items.map(item => ({
        variant: `${item.variant.product.name} (${item.variant.title})`,
        quantity: item.quantity,
        price: item.price,
      })),
    });
    const orderTemplate = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2>🧾 New Order Received</h2>
    <p>Hello,</p>
    <p>A new order has been placed in <strong>${workspace.name}</strong>.</p>

    <h3>Order Details</h3>
    <ul>
      <li><strong>Order ID:</strong> ${order.id}</li>
      <li><strong>Customer Name:</strong> ${user.firstName} ${user.lastName}</li>
      <li><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</li>
      <li><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</li>
    </ul>

    <p>The full order summary is attached as a PDF.</p>

    <p>Thank you,<br/>${workspace.name} Team</p>
  </div>
`;

    // Send emails concurrently to internal recipients
    const emailPromises = recipients
      .filter(r => r.email)
      .map(r =>
        sendEmail({
          to: r.email,
          subject: `🧾 New Order: ${workspace.name} (Order ID: ${order.id})`,
          html: orderTemplate,
          pdfBuffer,
          attachmentName: `Order-${order.id}.pdf`,
        }).catch(err => {
          console.error(`Failed to send email to ${r.email}:`, err);
          return null;
        })
      );

    // Send email to customer with a personalized heading
    if (user.email) {
      const customerTemplate = emailTemplate.replace(
        'New Order Confirmation',
        `Thank You for Your Order, ${user.firstName}!`
      );

      emailPromises.push(
        sendEmail({
          to: user.email,
          subject: `🧾 Your Order Receipt: ${workspace.name} (Order ID: ${order.id})`,
          html: customerTemplate,
          pdfBuffer,
          attachmentName: `Order-${order.id}.pdf`,
        }).catch(err => {
          console.error(`Failed to send email to customer ${user.email}:`, err);
          return null;
        })
      );
    } else {
      console.warn(`No email sent to customer: user.email is missing for user ${user.id}`);
    }
    await Promise.all(emailPromises);

    return {
      orderId: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
      itemCount: order.items.length,
      message: data.status === 'PENDING' ? 'Order created pending payment' : 'Order placed successfully',
    };
  } catch (error: any) {
    console.error('CreateOrder Error:', error);
    throw new Error(`Failed to create order: ${error.message}`);
  }
};
export const getOrders = async (workspaceId: number, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');
  return prisma.order.findMany({
    where: { workspaceId },
    include: { items: { include: { variant: true } }, user: true, shippingAddress: true, billingAddress: true },
  });
};


export const cancelOrder = async (
  orderId: string,
  authUserId: string
) => {
  let order: any;
  let updatedOrder: any;

  const result = await prisma.$transaction(async (tx) => {
    order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: true,
      },
    });

    if (!order) throw new Error('Order not found');
    if (order.status === 'CANCELLED') throw new Error('Order already cancelled');

    updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: updatedOrder.id,
        status: 'CANCELLED',
        note: 'Order CANCELLED',
        changedBy: authUserId,
        createdAt: new Date(),
      },
    });
    await revertStock(order.items, tx);
    await tx.notification.create({
      data: {
        userId: authUserId,
        title: 'Order Cancelled',
        workspaceId: order.workspaceId,
        type: NotificationType.ORDER_UPDATE,
        message: `Order #${orderId} has been cancelled`,
      },
    });

    return {
      message: `Order #${orderId} successfully cancelled.`,
      status: updatedOrder.status,
      userEmail: order.user.email, // Pass for later use
    };
  });

  // Send email OUTSIDE transaction
  sendEmail({
    to: result.userEmail,
    subject: 'Order Cancelled',
    html: `<p>Your order #${orderId} has been cancelled.</p><p>For any queries, please contact support.</p>`,
  }).catch((err) => {
    console.error(`Failed to send cancellation email for order ${orderId}:`, err);
  });

  // Strip userEmail before returning
  const { userEmail, ...cleanResult } = result;
  return cleanResult;
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

export const getOrdersAddress = async (
  status: OrderStatus,
  authUserId: string
) => {
  const orders = await prisma.order.findMany({
    where: {
      status,
      userId: authUserId,
    },
    select: {
      shippingAddress: {
        select: {
          id: true,
          address: true,
          street: true,
          city: true,
          region: true,
          postalCode: true,
          country: true,
          isDeleted: true, // 👈 Include soft-delete status
        },
      },
      billingAddress: {
        select: {
          id: true,
          address: true,
          street: true,
          city: true,
          region: true,
          postalCode: true,
          country: true,
          isDeleted: true, // 👈 Include soft-delete status
        },
      },
    },
  });

  const uniqueAddresses = new Map<string, any>();

  for (const { shippingAddress, billingAddress } of orders) {
    if (
      shippingAddress &&
      !shippingAddress.isDeleted &&
      !uniqueAddresses.has(shippingAddress.id)
    ) {
      uniqueAddresses.set(shippingAddress.id, shippingAddress);
    }

    if (
      billingAddress &&
      !billingAddress.isDeleted &&
      !uniqueAddresses.has(billingAddress.id)
    ) {
      uniqueAddresses.set(billingAddress.id, billingAddress);
    }
  }


  return Array.from(uniqueAddresses.values());
};

export const getOrderPreview = async (items: any[], userId: string) => {
  const variants = await prisma.productVariant.findMany({
    where: {
      id: {
        in: items.map((item) => String(item.variantId)), // Convert to string
      },
    },
    include: {
      product: true,
    },
  });

  const lineItems = variants.map(v => {
    const quantity = items.find(i => i.variantId === v.id)?.quantity || 1;
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${v.product.name} (${v.title})`
        },
        unit_amount: Math.round(v.price * 100)
      },
      quantity
    };
  });

  return { lineItems };
};

export const createFinalOrderFromSession = async (session: Stripe.Checkout.Session) => {
  if (!session.metadata) {
    throw new Error('Session metadata is missing');
  }
  const userId = session.metadata.userId;
  const items = JSON.parse(session.metadata.items);
  const shippingAddress = JSON.parse(session.metadata.shippingAddress);
  const billingAddress = JSON.parse(session.metadata.billingAddress);

  // Save addresses
  const [shipping, billing] = await Promise.all([
    prisma.address.create({ data: { ...shippingAddress, userId } }),
    prisma.address.create({ data: { ...billingAddress, userId } })
  ]);

  // Reuse your existing order creation logic
  return createOrder({
    userId,
    shippingAddressId: shipping.id,
    billingAddressId: billing.id,
    paymentMethod: PaymentMethod.STRIPE,
    items,
  }, userId);
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
    if (!Object.values(PaymentMethod).includes(data.paymentMethod)) {
      throw new Error('Invalid payment method');
    }
    updateData.paymentMethod = data.paymentMethod;
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
  // await checkPermission(workspaceId, authUserId, 'UPDATE_ORDER');
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

export const getAllOrderItems = async (workspaceId: number, authUserId: string) => {
  // await checkPermission(workspaceId, authUserId, 'VIEW_ORDER');

  return await prisma.orderItem.findMany({
    where: {
      order: {
        workspaceId,
      },
    },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          userId: true,
        },
      },
      variant: {
        include: {
          product: true,
        },
      },
    },
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

export const updateOrderStatus = async (
  workspaceId: number,
  orderId: string,
  status: OrderStatus,
  authUserId: string,
  note?: string
) => {
  await checkPermission(workspaceId, authUserId, 'UPDATE_ORDER_STATUS');

  const order = await prisma.order.findUnique({
    where: { id: orderId, workspaceId },
    select: { id: true, status: true },
  });

  if (!order) throw new Error('Order not found');

  if (order.status === status) {
    throw new Error('Order is already in the specified status.');
  }

  // Start a transaction to ensure both update and history insert happen together
  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        note,
        changedBy: authUserId,
      },
    }),
  ]);

  return {
    id: updatedOrder.id,
    status: updatedOrder.status,
    message: `Order status updated to ${updatedOrder.status}`,
  };
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

export const getOrdersByStatus = async (
  status: OrderStatus,
  authUserId: string
) => {
  return prisma.order.findMany({
    where: {
      userId: authUserId,
      status,
    },
    include: {
      items: {
        include: { variant: true },
      },
      user: true,
      shippingAddress: true,
      billingAddress: true,
    },
  });
};
export const getOrdersByUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  return prisma.order.findMany({
    where: { userId },
    include: { items: { include: { variant: true } }, user: true, shippingAddress: true, billingAddress: true },
  });
};

export const getOrdersByDateRange = async (
  start: Date,
  end: Date,
  authUserId: string
) => {
  try {
    // Validate dates
    if (start > end) {
      throw new Error('Start date cannot be after end date');
    }

    const orders = await prisma.order.findMany({
      where: {
        placedAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    categoryId: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        shippingAddress: true,
        billingAddress: true
      },
      orderBy: {
        placedAt: 'desc' // Most recent orders first
      }
    });
    console.log('Fetched orders:', orders); // Debugging line
    if (!orders || orders.length === 0) {
      return []; // Return empty array instead of throwing error
    }

    return orders;
  } catch (error) {
    console.error('Error fetching orders by date range:', error);
    throw error; // Re-throw for global error handler
  }
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

export const cloneOrder = async (
  orderId: string
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new Error('Order not found');

  // Optional: Add a permission check here if needed, using order.workspaceId

  return prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: order.userId,
        workspaceId: order.workspaceId, // still using original order's workspaceId
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
      include: {
        items: true,
        user: true,
        shippingAddress: true,
        billingAddress: true,
      },
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
// services/orderService.ts
export const reorder = async (
  orderId: string,
  authUserId: string
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error('Original order not found');
  }

  // Duplicate order using its own workspaceId
  const newOrder = await prisma.order.create({
    data: {
      userId: authUserId,
      workspaceId: order.workspaceId, // use from original order
      shippingAddressId: order.shippingAddressId,
      billingAddressId: order.billingAddressId,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      status: 'PENDING',
      notes: `Reorder of ${orderId}`,
      items: {
        create: order.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    },
    include: { items: true },
  });

  return newOrder;
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
    await sendEmail({
      to: userEmail,
      subject: emailSubject,
      html: emailBody,
    });

    logger.info(`Notification sent for order ${orderId} to ${userEmail}`);
  } catch (error) {
    logger.error(`Failed to notify user for order ${orderId}: ${error}`);
    throw error;
  }
};

export const getOrderHistory = async (
  workspaceId: number,
  orderId: string,
  authUserId: string
) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');

  const order = await prisma.order.findUnique({
    where: { id: orderId, workspaceId },
    select: { id: true },
  });

  if (!order) throw new Error('Order not found');

  const history = await prisma.orderStatusHistory.findMany({
    where: { orderId },
    orderBy: { createdAt: 'asc' },
    include: {
      changedUser: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  return history.map(entry => ({
    timestamp: entry.createdAt,
    status: entry.status,
    changedBy: `${entry.changedUser.firstName} ${entry.changedUser.lastName}`,
    note: entry.note,
  }));
};

export const getOrderSummary = async (workspaceId: number, authUserId: string) => {
  await checkPermission(workspaceId, authUserId, 'VIEW_ORDERS');

  const [totalOrders, totalRevenue, statusCounts] = await Promise.all([
    prisma.order.count({
      where: { workspaceId }
    }),
    prisma.order.aggregate({
      where: { workspaceId },
      _sum: { totalAmount: true }
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { workspaceId },
      _count: { id: true }
    })
  ]);

  return {
    totalOrders,
    totalRevenue: totalRevenue._sum.totalAmount ?? 0, // safer nullish check
    statusCounts: statusCounts.map(statusGroup => ({
      status: statusGroup.status,
      count: statusGroup._count.id
    }))
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