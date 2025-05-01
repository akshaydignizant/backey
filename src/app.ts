import express, { Application, NextFunction, Request, Response } from 'express';
import path from 'path';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

import { PrismaClient } from '@prisma/client';

// Middleware and utilities
import globalErrorHandler from './middleware/globalErrorHandler';
import responseMessage from './constant/responseMessage';
import httpError from './util/httpError';

// Routes
import authRoutes from './routers/auth.routes';
import workspaceRoutes from './routers/workspace.routes';
import categoryRoutes from './routers/category.routes';
import productRoutes from './routers/product.routes';
import orderRoutes from './routers/order.routes';
import reportRoutes from './routers/report.routes';
import inventoryRoutes from './routers/inventory.routes';
import notificationRoutes from './routers/notification.routes';
import billRoutes from './routers/billing.route';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Apply security headers
app.use(helmet());

// Enable gzip compression
app.use(compression());

// Enable CORS for specified origins
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'https://6b15-2402-a00-162-ea17-2920-87a2-2713-905.ngrok-free.app', // adjust for development or production
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    credentials: true,
  })
);

// Parse incoming JSON requests
app.use(express.json());

// Serve static files from "public" directory
app.use(express.static(path.join(__dirname, '../', 'public')));

// Root route
app.get('/', (_req, res) => {
  res.send('🚀 Backend is running!');
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/bills', billRoutes);

// 404 Not Found handler
app.use((req: Request, _res: Response, next: NextFunction) => {
  const error = new Error(responseMessage.NOT_FOUND('route'));
  httpError(next, error, req, 404);
});

// Global error handler
app.use(globalErrorHandler);

// Export the app for use in other files (like server.ts)
export default app;
