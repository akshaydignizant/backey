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
import dotenv from 'dotenv'
dotenv.config()

const app: Application = express()
// Prisma client
export const prisma = new PrismaClient()

// Middleware
app.use(helmet())
app.use(
  cors({
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    origin: ['https://client.com'], // adjust this for dev as needed
    credentials: true,
  })
)
app.use(express.json())
app.use(express.static(path.join(__dirname, '../', 'public')))
// Main API routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/workspaces', workspaceRoutes);

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
