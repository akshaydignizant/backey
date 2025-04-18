
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

import app from './app'
import redisClient from './cache/redisClient'
import config from './config/config'
import { initRateLimiter } from './config/rateLimiter'
import databaseService from './services/databaseService'
import logger from './util/logger'

const server = app.listen(config.PORT)

  ; (async () => {
    try {
      await databaseService.connect()

      logger.info('DATABASE_CONNECTION', {
        meta: { CONNECTION: 'Prisma PostgreSQL Connected' },
      })

      await redisClient.connect() // 👈 Initialize Redis before app fully starts

      logger.info('REDIS_CONNECTION', {
        meta: { CONNECTION: 'Redis Cloud Connected' },
      })

      // Optionally initialize Redis-backed rate limiter
      // await initRateLimiter()
      // logger.info('RATE_LIMITER_INITIATED')

      logger.info('APPLICATION_STARTED', {
        meta: {
          PORT: config.PORT,
          SERVER_URL: config.SERVER_URL,
        },
      })
    } catch (err) {
      logger.error('APPLICATION_ERROR', { meta: err })

      server.close((error) => {
        if (error) {
          logger.error('APPLICATION_ERROR', { meta: error })
        }
        process.exit(1)
      })
    }
  })()

export { app, server }
