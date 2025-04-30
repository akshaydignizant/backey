// import Razorpay from 'razorpay';
// import { Order } from '@prisma/client';  // Assuming you're using Prisma's types

// const razorpayInstance = new Razorpay({
//   key_id: process.env.RAZORPAY_API_KEY!,
//   key_secret: process.env.RAZORPAY_API_SECRET!,
// });

// export const createOrder = async (amount: number, currency: string = 'INR') => {
//   const options = {
//     amount: amount * 100, // Razorpay expects amount in paise (100 paise = 1 INR)
//     currency: currency,
//     receipt: `receipt_${Math.floor(Math.random() * 1000)}`,
//     notes: {
//       key1: 'value1',
//       key2: 'value2',
//     },
//   };

//   try {
//     const order = await razorpayInstance.orders.create(options);
//     return order;
//   } catch (error) {
//     console.error("Error creating Razorpay order:", error);
//     throw new Error('Razorpay order creation failed');
//   }
// };

// export const verifyPayment = (paymentId: string, orderId: string, signature: string) => {
//   const generatedSignature = razorpayInstance.crypto
//     .createHmac('sha256', process.env.RAZORPAY_API_SECRET!)
//     .update(orderId + '|' + paymentId)
//     .digest('hex');

//   return generatedSignature === signature;
// };
