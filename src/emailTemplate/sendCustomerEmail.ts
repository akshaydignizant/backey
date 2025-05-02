export function generateEmailTemplate(order: any, user: any, workspace: any, isCustomer = false) {
  const formatAddress = (address: { address: string; street?: string | null; city: string; region: string; postalCode: string; country: string }) =>
    `${address.address}${address.street ? `, ${address.street}` : ''}, ${address.city}, ${address.region}, ${address.postalCode}, ${address.country}`;

  interface Address {
    address: string;
    street?: string | null;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  }

  interface Variant {
    product: {
      name: string;
    };
    title: string;
  }

  interface Item {
    variant: Variant;
    quantity: number;
    price: number;
  }

  interface Order {
    id: string;
    totalAmount: number;
    paymentMethod: string;
    status: string;
    notes?: string;
    items: Item[];
    shippingAddress: Address;
    billingAddress: Address;
  }

  interface User {
    firstName: string;
    lastName?: string;
  }

  interface Workspace {
    name: string;
  }

  const itemsList = order.items
    .map((item: Item) => (`
      <tr class="border-b">
        <td class="p-2">${item.variant.product.name} (${item.variant.title})</td>
        <td class="p-2 text-right">${item.quantity}</td>
        <td class="p-2 text-right">$${item.price.toFixed(2)}</td>
        <td class="p-2 text-right">$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `))
    .join('');

  const emailTitle = isCustomer ? `Thank You for Your Order, ${user.firstName}!` : `New Order Confirmation`;
  const emailMessage = isCustomer ?
    `Thank you for your order! We will notify you once your order is processed.` :
    `A new order has been placed in your workspace.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 font-sans">
  <div class="max-w-2xl mx-auto bg-white p-8 mt-10 rounded-lg shadow-md">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-gray-800">${emailTitle}</h1>
      <p class="text-gray-600 mt-2">Order ID: ${order.id}</p>
    </div>
    <div class="mt-6">
      <h2 class="text-lg font-semibold text-gray-700">Order Details</h2>
      <div class="mt-4 space-y-2">
        <p><strong>Placed by:</strong> ${user.firstName} ${user.lastName || ''}</p>
        <p><strong>Workspace:</strong> ${workspace.name}</p>
        <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Notes:</strong> ${order.notes || 'None'}</p>
      </div>
    </div>
    <div class="mt-6">
      <h2 class="text-lg font-semibold text-gray-700">Items</h2>
      <table class="w-full mt-4 border-collapse">
        <thead>
          <tr class="bg-gray-200">
            <th class="p-2 text-left">Item</th>
            <th class="p-2 text-right">Quantity</th>
            <th class="p-2 text-right">Price</th>
            <th class="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>
    </div>
    <div class="mt-6">
      <h2 class="text-lg font-semibold text-gray-700">Shipping Address</h2>
      <p class="mt-2 text-gray-600">${formatAddress(order.shippingAddress)}</p>
    </div>
    <div class="mt-6">
      <h2 class="text-lg font-semibold text-gray-700">Billing Address</h2>
      <p class="mt-2 text-gray-600">${formatAddress(order.billingAddress)}</p>
    </div>
    <div class="mt-6 text-center">
      <a
        href="https://your-dashboard-url.com/orders/${order.id}"
        class="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        View Order in Dashboard
      </a>
    </div>
    <div class="mt-8 text-center text-gray-500 text-sm">
      <p>${emailMessage}</p>
      <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}
