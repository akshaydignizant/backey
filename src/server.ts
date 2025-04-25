
// import app from './app'
// import config from './config/config'
// import { initRateLimiter } from './config/rateLimiter'
// import databaseService from './services/databaseService'
// import logger from './util/logger'

// const server = app.listen(config.PORT)

//   ; (async () => {
//     try {
//       await databaseService.connect()

//       logger.info('DATABASE_CONNECTION', {
//         meta: { CONNECTION: 'Prisma PostgreSQL Connected' },
//       })

//       // await initRateLimiter()
//       // logger.info('RATE_LIMITER_INITIATED')

//       logger.info('APPLICATION_STARTED', {
//         meta: {
//           PORT: config.PORT,
//           SERVER_URL: config.SERVER_URL,
//         },
//       })
//     } catch (err) {
//       logger.error('APPLICATION_ERROR', { meta: err })

//       server.close((error) => {
//         if (error) {
//           logger.error('APPLICATION_ERROR', { meta: error })
//         }
//         process.exit(1)
//       })
//     }
//   })()

// export { app, server }

// import app from './app'
// import redisClient from './cache/redisClient'
// import config from './config/config'
// import { initRateLimiter } from './config/rateLimiter'
// import databaseService from './services/databaseService'
// import logger from './util/logger'

// const server = app.listen(config.PORT)

//   ; (async () => {
//     try {
//       await databaseService.connect()

//       logger.info('DATABASE_CONNECTION', {
//         meta: { CONNECTION: 'Prisma PostgreSQL Connected' },
//       })

//       await redisClient.connect() // 👈 Initialize Redis before app fully starts

//       logger.info('REDIS_CONNECTION', {
//         meta: { CONNECTION: 'Redis Cloud Connected' },
//       })

//       // Optionally initialize Redis-backed rate limiter
//       // await initRateLimiter()
//       // logger.info('RATE_LIMITER_INITIATED')

//       logger.info('APPLICATION_STARTED', {
//         meta: {
//           PORT: config.PORT,
//           SERVER_URL: config.SERVER_URL,
//         },
//       })
//     } catch (err) {
//       logger.error('APPLICATION_ERROR', { meta: err })

//       server.close((error) => {
//         if (error) {
//           logger.error('APPLICATION_ERROR', { meta: error })
//         }
//         process.exit(1)
//       })
//     }
//   })()

// export { app, server }


import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import app from './app'
import redisClient from './cache/redisClient'
import config from './config/config'
import databaseService from './services/databaseService'
import logger from './util/logger'

// Create HTTP server from Express app
const httpServer = http.createServer(app)

// // Set up Socket.IO
// const io = new SocketIOServer(httpServer, {
//   cors: {
//     origin: ['http://localhost:3001', 'https://your-ngrok-url.ngrok-free.app'],
//     credentials: true,
//   },
// })

// Optional: Attach Socket.IO to app to use in routes
// app.set('io', io)

// // Handle socket connections
// io.on('connection', (socket) => {
//   console.log(`Socket connected: ${socket.id}`);

//   const userId = socket.handshake.query.userId as string;

//   if (userId) {
//     socket.join(userId);
//     console.log(`👤 User ${userId} joined their room`);
//     logger.info('SOCKET_JOINED_USER_ROOM', { socketId: socket.id, userId });
//   }

//   socket.on('disconnect', () => {
//     console.log(`🔌 Socket disconnected: ${socket.id}`);
//     logger.info('SOCKET_DISCONNECTED', { socketId: socket.id });
//   });
// });



// // Start server
const server = httpServer.listen(config.PORT)

  ; (async () => {
    try {
      await databaseService.connect()
      logger.info('DATABASE_CONNECTION', { meta: { CONNECTION: 'Prisma PostgreSQL Connected' } })

      await redisClient.connect()
      logger.info('REDIS_CONNECTION', { meta: { CONNECTION: 'Redis Cloud Connected' } })

      logger.info('APPLICATION_STARTED', {
        meta: { PORT: config.PORT, SERVER_URL: config.SERVER_URL },
      })
    } catch (err) {
      logger.error('APPLICATION_ERROR', { meta: err })

      server.close((error) => {
        if (error) {
          logger.error('APPLICATION_ERROR', { meta: error })
        }
        process.exit(1)
      }
      )
    }
  })()

export { app, server }
