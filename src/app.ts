// // import express from 'express';
// // import cors from 'cors';
// // import morgan from 'morgan';
// // import { PrismaClient } from '@prisma/client';
// // import dotenv from 'dotenv';

// // dotenv.config();

// // const app = express();
// // const prisma = new PrismaClient();

// // app.use(cors());
// // app.use(morgan('dev'));
// // app.use(express.json());

// // app.get('/', async (req, res) => {
// //   const users = await prisma.user.findMany();
// //   res.json(users);
// // });

// // export default app;

// import express, { Application, NextFunction, Request, Response } from 'express'
// import path from 'path'
// // import router from '../router/apiRouter'
// import globalErrorHandler from '../middleware/globalErrorHandler'
// import responseMessage from '../constant/responseMessage'
// import httpError from '../util/httpError'
// import helmet from 'helmet'
// import cors from 'cors'
// import { PrismaClient } from '@prisma/client'

// const app: Application = express()

// // Middleware
// app.use(helmet())
// app.use(
//     cors({
//         methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
//         origin: ['https://client.com'],
//         credentials: true
//     })
// )
// export const prisma = new PrismaClient()
// app.use(express.json())
// app.use(express.static(path.join(__dirname, '../', 'public')))

// // Routes
// // app.use('/api/v1', router)

// // 404 Handler
// app.use((req: Request, _: Response, next: NextFunction) => {
//     try {
//         throw new Error(responseMessage.NOT_FOUND('route'))
//     } catch (err) {
//         httpError(next, err, req, 404)
//     }
// })

// // Global Error Handler
// app.use(globalErrorHandler)

// export default app

import express, { Application, NextFunction, Request, Response } from 'express'
import path from 'path'
// import router from '../router/apiRouter'
import globalErrorHandler from './middleware/globalErrorHandler'
import responseMessage from './constant/responseMessage'
import httpError from './util/httpError'
import helmet from 'helmet'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import authRoutes from './routers/auth.routes'
import workspaceRoutes from './routers/workspace.routes'
import categoryRoutes from './routers/category.routes'
import productRoutes from './routers/product.routes'
import OrderRoutes from './routers/order.routes'
import ReportRoutes from './routers/report.routes'
import inventoryRoutes from './routers/inventory.routes'
import notificationRoutes from './routers/notification.routes'
import billRoutes from './routers/billing.route'
// import paymentRoutes from './routers/payment.routes'
// import razorpayWebhookRoute from './routers/razorpayWebhookRoute'
import dotenv from 'dotenv'
dotenv.config()

const app: Application = express()
// Prisma client
export const prisma = new PrismaClient()

// Middleware
app.use(helmet())
// app.use(
//   cors({
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
//     origin: ['http://localhost:3000', "https://0bc94a167d659b.lhr.life"], // adjust this for dev as needed
//     credentials: true,
//   })
// )
app.use(cors({
  origin: ['http://localhost:3000', '*', 'https://0bc94a167d659b.lhr.life'],
  credentials: true, // if you're using cookies or auth headers
}));
// app.use(cors());

app.use(express.json())
app.use(express.static(path.join(__dirname, '../', 'public')))

// Example using Express
app.get('/', (req, res) => {
  res.send('🚀 Backend is running!');
});

// Main API routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/products', productRoutes)
app.use('/api/v1/orders', OrderRoutes)
app.use('/api/v1/reports', ReportRoutes)
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use("/api/v1/bills", billRoutes);
// app.use('/api/v1/payment', paymentRoutes);
// app.use('/api/payment', razorpayWebhookRoute);

// 404 Handler
app.use((req: Request, _: Response, next: NextFunction) => {
  try {
    throw new Error(responseMessage.NOT_FOUND('route'))
  } catch (err) {
    httpError(next, err, req, 404)
  }
})

// Global Error Handler
app.use(globalErrorHandler)

export default app
