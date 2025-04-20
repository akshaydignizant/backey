export const buildOrderNotificationEmail = (
    workspaceName: string,
    userName: string,
    orderId: number,
    totalAmount: number,
    notes: string | undefined
): string => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New Order Notification</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #3f51b5;
            color: #fff;
            padding: 24px;
            text-align: center;
          }
          .content {
            padding: 24px;
            color: #333;
          }
          .content h2 {
            margin-top: 0;
          }
          .footer {
            background-color: #f0f0f0;
            padding: 16px;
            text-align: center;
            font-size: 13px;
            color: #777;
          }
          .button {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 20px;
            background-color: #3f51b5;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
          }
          .order-info {
            background: #f4f4f4;
            padding: 12px 16px;
            border-radius: 6px;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧾 New Order Placed</h1>
          </div>
          <div class="content">
            <h2>Hello,</h2>
            <p>
              A new order has just been placed in the workspace <strong>${workspaceName}</strong> by 
              <strong>${userName}</strong>.
            </p>
            <div class="order-info">
              <p><strong>Order ID:</strong> #${orderId}</p>
              <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>
            <a class="button" href="https://your-dashboard.example.com/orders/${orderId}">
              View Order
            </a>
            <p style="margin-top: 32px;">
              Please log in to your dashboard to review and process the order.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Your Company. All rights reserved.
          </div>
        </div>
      </body>
    </html>
    `;
};