import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import redisClient from './cache/redisClient';
import config from './config/config';
import databaseService from './services/databaseService';
import logger from './util/logger';
import dotenv from 'dotenv'
dotenv.config()

// Validate required environment variables
const requiredEnvVars = ['PORT', 'SERVER_URL', 'DATABASE_URL', 'REDIS_URL'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    logger.error('ENVIRONMENT_VARIABLE_MISSING', { meta: { variable: envVar } });
    throw new Error(`Environment variable ${envVar} is not defined`);
  }
});

// Create HTTP server from Express app
const httpServer = http.createServer(app);

// Set up Socket.IO
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://4db2-2402-a00-162-ea17-5075-fc6a-c45c-490a.ngrok-free.app'],
    credentials: true,
  },
});

// Attach Socket.IO to app for use in routes
app.set('io', io);

// Handle socket connections
io.on('connection', (socket) => {
  logger.info('SOCKET_CONNECTED', { socketId: socket.id });

  const userId = socket.handshake.query.userId as string;

  if (userId) {
    socket.join(userId);
    logger.info('SOCKET_JOINED_USER_ROOM', { socketId: socket.id, userId });
  } else {
    logger.warn('SOCKET_CONNECTION_REJECTED', { socketId: socket.id, reason: 'Missing userId' });
    socket.disconnect();
  }

  socket.on('disconnect', () => {
    logger.info('SOCKET_DISCONNECTED', { socketId: socket.id });
  });
});

// Start server
const server = httpServer.listen(config.PORT, async () => {
  try {
    // Initialize database connection
    await databaseService.connect();
    logger.info('DATABASE_CONNECTION', { meta: { CONNECTION: 'Prisma PostgreSQL Connected' } });

    // Initialize Redis connection
    await redisClient.connect();
    logger.info('REDIS_CONNECTION', { meta: { CONNECTION: 'Redis Cloud Connected' } });

    logger.info('APPLICATION_STARTED', {
      meta: { PORT: config.PORT, SERVER_URL: config.SERVER_URL },
    });
  } catch (err) {
    logger.error('APPLICATION_ERROR', { meta: err });

    // Close server if initialization fails
    server.close((error) => {
      if (error) {
        logger.error('SERVER_CLOSE_ERROR', { meta: error });
      }
      process.exit(1);
    });
  }
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('APPLICATION_SHUTDOWN', { meta: { reason: 'SIGINT or SIGTERM received' } });

  try {
    // Close Socket.IO
    io.close(() => {
      logger.info('SOCKET_IO_CLOSED');
    });

    // Close Redis connection
    await redisClient.disconnect();
    logger.info('REDIS_CONNECTION_CLOSED');

    // Close database connection
    await databaseService.disconnect();
    logger.info('DATABASE_CONNECTION_CLOSED');

    // Close HTTP server
    server.close(() => {
      logger.info('SERVER_CLOSED');
      process.exit(0);
    });
  } catch (err) {
    logger.error('SHUTDOWN_ERROR', { meta: err });
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export { app, server };