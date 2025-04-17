import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';

export const generatePDF = (data: {
  orderId: string;
  userEmail: string;
  totalAmount: number;
  status: string;
  items: { variant: string; quantity: number; price: number }[];
  shippingAddress: string;
  billingAddress: string;
}): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${data.orderId}`);
    doc.text(`Customer Email: ${data.userEmail}`);
    doc.text(`Status: ${data.status}`);
    doc.text(`Total Amount: $${data.totalAmount.toFixed(2)}`);
    doc.moveDown();

    // Addresses
    doc.fontSize(14).text('Shipping Address:');
    doc.fontSize(12).text(data.shippingAddress);
    doc.moveDown();
    doc.fontSize(14).text('Billing Address:');
    doc.fontSize(12).text(data.billingAddress);
    doc.moveDown();

    // Items Table
    doc.fontSize(14).text('Order Items:');
    doc.moveDown(0.5);

    // Table Header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Variant', 50, doc.y, { width: 200 });
    doc.text('Quantity', 250, doc.y, { width: 100 });
    doc.text('Price', 350, doc.y, { width: 100 });
    doc.moveDown(0.5);

    // Table Rows
    doc.font('Helvetica');
    data.items.forEach(item => {
      doc.text(item.variant, 50, doc.y, { width: 200 });
      doc.text(item.quantity.toString(), 250, doc.y, { width: 100 });
      doc.text(`$${item.price.toFixed(2)}`, 350, doc.y, { width: 100 });
      doc.moveDown(0.5);
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for your purchase!', { align: 'center' });

    doc.end();
  });
};