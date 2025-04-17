import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-email-password',
  },
});

export const sendNotification = async (to: string, subject: string, message: string): Promise<void> => {
  try {
    await transporter.sendMail({
      from: `"Order Management" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: message,
      html: `<p>${message}</p>`,
    });
    console.log(`Notification sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`Failed to send notification to ${to}:`, error);
    throw new Error('Failed to send notification');
  }
};