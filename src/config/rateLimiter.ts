// // config/rateLimiter.ts
// import { RateLimiterPostgres } from 'rate-limiter-flexible';
// import pgPool from './pgPool';

// // Create rate limiter
// export const rateLimiterPostgres = new RateLimiterPostgres({
//   storeClient: pgPool,
//   points: 10, // Max requests
//   duration: 60, // Per 60 seconds
//   tableName: 'rate_limiter',
//   keyPrefix: 'middleware',
// });

// // Optional init to check/setup table
// export const initRateLimiter = async (): Promise<void> => {
//   try {
//     // This ensures the table is created if it doesn't exist
//     await rateLimiterPostgres.get('test-key');
//     console.log('[RateLimiter] PostgreSQL rate limiter initialized');
//   } catch (error) {
//     console.error('[RateLimiter] Initialization error:', error);
//     throw error;
//   }
// };

import { RateLimiterPostgres } from 'rate-limiter-flexible'
import { Pool } from 'pg'
import config from './config'

let rateLimiterPostgres: RateLimiterPostgres | null = null

const POINTS = 10
const DURATION = 60

export const initRateLimiter = async () => {
  const pgPool = new Pool({
    connectionString: config.DATABASE_URL,
  })

  rateLimiterPostgres = new RateLimiterPostgres({
    storeClient: pgPool,
    points: POINTS,
    duration: DURATION,
    keyPrefix: 'middleware',
    tableName: 'rate_limiter',
  })

  // Optional warm-up
  await rateLimiterPostgres.block('init', 1, { duration: DURATION })
}

export { rateLimiterPostgres }
