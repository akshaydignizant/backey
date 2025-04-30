import { Order, Address } from '@prisma/client';

interface User {
  firstName: string;
  lastName?: string | null;
}

interface Workspace {
  name: string;
}

export const adminOrderEmail = {
  subject: (workspaceName: string, orderId: string): string =>
    `🧾 New Order: ${workspaceName} (Order ID: ${orderId})`,

  formatAddress: (address: Address): string =>
    `${address.address}${address.street ? `, ${address.street}` : ''}, ${address.city}, ${address.region}, ${address.postalCode}, ${address.country}`,

  generateContent: (
    order: Order & {
      shippingAddress: Address;
      billingAddress: Address;
      items: { variant: { product: { name: string }; title: string }; quantity: number; price: number }[];
    },
    user: User,
    workspace: Workspace,
    itemsList: string
  ): string => `
Hello,

A new order (ID: ${order.id}) was placed by ${user.firstName} ${user.lastName || ''} in workspace ${workspace.name}.

**Order Details:**
- Order ID: ${order.id}
- Total Amount: $${order.totalAmount.toFixed(2)}
- Payment Method: ${order.paymentMethod}
- Status: ${order.status}
- Notes: ${order.notes || 'None'}

**Items:**
${itemsList}

**Shipping Address:**
${adminOrderEmail.formatAddress(order.shippingAddress)}

**Billing Address:**
${adminOrderEmail.formatAddress(order.billingAddress)}

Login to the dashboard to process this order.
`
};



interface User {
  firstName: string;
  lastName?: string | null;
}

interface Workspace {
  name: string;
}

export const customerOrderEmail = {
  subject: (workspaceName: string, orderId: string): string =>
    `🧾 Your Order Receipt: ${workspaceName} (Order ID: ${orderId})`,

  formatAddress: (address: Address): string =>
    `${address.address}${address.street ? `, ${address.street}` : ''}, ${address.city}, ${address.region}, ${address.postalCode}, ${address.country}`,

  generateContent: (
    order: Order & {
      shippingAddress: Address;
      billingAddress: Address;
      items: { variant: { product: { name: string }; title: string }; quantity: number; price: number }[];
    },
    user: User,
    workspace: Workspace,
    itemsList: string
  ): string => `
Dear ${user.firstName},

Thank you for your order!

A new order (ID: ${order.id}) was placed in workspace ${workspace.name}.

**Order Details:**
- Order ID: ${order.id}
- Total Amount: $${order.totalAmount.toFixed(2)}
- Payment Method: ${order.paymentMethod}
- Status: ${order.status}
- Notes: ${order.notes || 'None'}

**Items:**
${itemsList}

**Shipping Address:**
${customerOrderEmail.formatAddress(order.shippingAddress)}

**Billing Address:**
${customerOrderEmail.formatAddress(order.billingAddress)}

Login to the dashboard to view your order.
`
};