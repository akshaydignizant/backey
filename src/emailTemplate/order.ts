// utils/emailTemplates.js

import { Order } from "@prisma/client";

type EmailTemplateParams = {
  order: Order & { billingAddress?: any; shippingAddress?: any }; // Extend Order to include resolved addresses
  user: { firstName: string; lastName?: string; email?: string }; // Define more if needed
  workspace: { name: string };
  itemsList: { name: string; quantity: number; price: number; total: string }[];
  formatAddress: (address: any) => string;
};

export function generateOrderConfirmationEmail({
  order,
  user,
  workspace,
  itemsList,
  formatAddress,
}: EmailTemplateParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmation - #${order.id}</title>
  <style type="text/css">
    /* Client-specific styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

    /* Reset styles */
    body { margin: 0; padding: 0; width: 100%; min-height: 100vh; }

    /* iOS Blue Links */
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    /* Main styles */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      line-height: 1.5;
    }

    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .header {
      padding: 2rem;
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
    }

    .content {
      padding: 1.5rem 2rem;
    }

    .footer {
      padding: 1.5rem 2rem;
      text-align: center;
      font-size: 0.875rem;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      background-color: #f9fafb;
    }

    .button {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: background-color 0.2s ease;
    }

    .button:hover {
      background-color: #1d4ed8;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }

    .table th {
      text-align: left;
      padding: 0.75rem;
      background-color: #f3f4f6;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .table td {
      padding: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.875rem;
    }

    .text-right {
      text-align: right;
    }

    /* Responsive styles */
    @media screen and (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
        box-shadow: none;
      }

      .header {
        padding: 1.5rem;
      }

      .content {
        padding: 1rem;
      }

      .footer {
        padding: 1rem;
      }

      .header h1 {
        font-size: 1.25rem;
      }

      .content h2 {
        font-size: 1rem;
      }

      .table th, .table td {
        padding: 0.5rem;
        font-size: 0.75rem;
      }

      .button {
        width: 100%;
        text-align: center;
        padding: 0.75rem;
      }

      /* Stack table headers for better readability */
      .table thead {
        display: none;
      }

      .table tr {
        display: block;
        margin-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .table td {
        display: block;
        text-align: right;
        position: relative;
        padding-left: 50%;
      }

      .table td:before {
        content: attr(data-label);
        position: absolute;
        left: 0.5rem;
        width: 45%;
        font-weight: 600;
        text-align: left;
      }
    }
  </style>
</head>
<body>
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
    <tr>
      <td style="padding: 20px 0;">
        <table class="container" width="100%" border="0" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td class="header">
              <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #111827;">Order Confirmation</h1>
              <p style="margin: 0.5rem 0 0; color: #6b7280;">Order #${order.id}</p>
            </td>
          </tr>

          <!-- Order Summary -->
          <tr>
            <td class="content">
              <h2 style="margin: 0 0 1rem; font-size: 1.125rem; font-weight: 600; color: #111827;">Order Summary</h2>
              <p style="margin: 0.5rem 0;"><strong>Placed by:</strong> ${user.firstName} ${user.lastName || ''}</p>
              <p style="margin: 0.5rem 0;"><strong>Workspace:</strong> ${workspace.name}</p>
              <p style="margin: 0.5rem 0;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="margin: 0.5rem 0;"><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
              <p style="margin: 0.5rem 0;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
              <p style="margin: 0.5rem 0;"><strong>Status:</strong> <span style="color: #2563eb; font-weight: 500;">${order.status}</span></p>
              ${order.notes ? `<p style="margin: 0.5rem 0;"><strong>Notes:</strong> ${order.notes}</p>` : ''}
            </td>
          </tr>

          <!-- Order Items -->
          <tr>
            <td class="content">
              <h2 style="margin: 0 0 1rem; font-size: 1.125rem; font-weight: 600; color: #111827;">Order Items</h2>
              <table class="table" width="100%" cellspacing="0" cellpadding="0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList.map(item => `
                    <tr>
                      <td data-label="Item">${item.name}</td>
                      <td data-label="Qty" class="text-right">${item.quantity}</td>
                      <td data-label="Price" class="text-right">$${item.price.toFixed(2)}</td>
                      <td data-label="Total" class="text-right">$${Number(item.total).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Shipping Address -->
          <tr>
            <td class="content">
              <h2 style="margin: 0 0 1rem; font-size: 1.125rem; font-weight: 600; color: #111827;">Shipping Address</h2>
              <p style="margin: 0.25rem 0; color: #4b5563;">${formatAddress(order.shippingAddress)}</p>
            </td>
          </tr>

          <!-- Billing Address -->
          ${order.billingAddress ? `
          <tr>
            <td class="content">
              <h2 style="margin: 0 0 1rem; font-size: 1.125rem; font-weight: 600; color: #111827;">Billing Address</h2>
              <p style="margin: 0.25rem 0; color: #4b5563;">${formatAddress(order.billingAddress)}</p>
            </td>
          </tr>
          ` : ''}

          <!-- CTA Button -->
          <tr>
            <td class="content" style="text-align: center;">
              <a href="https://your-dashboard-url.com/orders/${order.id}" class="button">View Order in Dashboard</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin: 0 0 0.5rem;">Thank you for your order!</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
              <p style="margin: 0.5rem 0 0; font-size: 0.75rem; color: #9ca3af;">If you have any questions, please contact our support team.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
