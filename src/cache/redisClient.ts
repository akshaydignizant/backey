// // import { createClient } from "@redis/client";
// // import dotenv from "dotenv";

// // dotenv.config();

// // const redisURL = process.env.REDIS_URL;

// // if (!redisURL) {
// //   throw new Error("❌ REDIS_URL is not defined in .env file!");
// // }

// // const redisClient = createClient({ url: redisURL });

// // redisClient.on("error", (err:String) => console.error("❌ Redis Error:", err));

// // let isConnected = false;

// // export async function connectRedis() {
// //   if (!isConnected) {
// //     try {
// //       await redisClient.connect();
// //       isConnected = true;
// //       console.log("✅ Redis Cloud connected successfully!");
// //     } catch (error) {
// //       console.error("❌ Redis connection failed:", error);
// //     }
// //   }
// // }


// // export default redisClient;

// import { createClient } from "@redis/client";
// import dotenv from "dotenv";

// dotenv.config();

// const redisURL = process.env.REDIS_URL;

// export const RedisTTL = {
//   ACCESS_TOKEN: 60 * 60,            // 1 hour
//   REFRESH_TOKEN: 60 * 60 * 24 * 7,  // 7 days
//   OTP: 60 * 5,                      // 5 minutes
//   RESET: 60 * 5,                    // 5 minutes
// };


// const redisClient = createClient({
//   url: redisURL,
//   socket: {
//     connectTimeout: 10000, // 10 seconds timeout
//     reconnectStrategy: (retries) => Math.min(retries * 100, 3000) // Retry logic
//   }
// });

// redisClient.on("error", (error) => console.error("❌ Redis Error:", error));

// (async () => {
//   try {
//     await redisClient.connect();
//     console.log("Connected to Redis Cloud");
//   } catch (error) {
//     console.error("Redis Connection Failed:", error);
//   }
// })();

// export default redisClient;
// src/lib/redis.ts

import { createClient } from '@redis/client';
import dotenv from 'dotenv';

dotenv.config();

const redisURL = process.env.REDIS_URL;

if (!redisURL) {
  throw new Error('❌ REDIS_URL is not defined in the environment variables!');
}

export const RedisTTL = {
  ACCESS_TOKEN: 60 * 60,            // 1 hour
  REFRESH_TOKEN: 60 * 60 * 24 * 7,  // 7 days
  OTP: 60 * 5,                      // 5 minutes
  RESET: 60 * 5                     // 5 minutes
};

const redisClient = createClient({
  url: redisURL,
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 100, 3000);
      console.warn(`🔁 Redis reconnect attempt #${retries}, delaying ${delay}ms`);
      return delay;
    }
  }
});

// Optional: Add verbose logging for connection state (great for monitoring)
redisClient.on('connect', () => console.log('🔌 Connecting to Redis...'));
redisClient.on('ready', () => console.log('✅ Redis is ready'));
redisClient.on('end', () => console.log('🔚 Redis connection closed'));
redisClient.on('reconnecting', () => console.log('🔁 Attempting to reconnect to Redis'));
redisClient.on('error', (err) => console.error('❌ Redis Error:', err));

// Exported connection function to control startup timing
let isRedisConnected = false;

export async function initRedis() {
  if (isRedisConnected) return;

  try {
    await redisClient.connect();
    isRedisConnected = true;
    console.log('🚀 Redis connected successfully');
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err);
    // Optional: Retry connection here or let your orchestrator handle restart
  }
}

export default redisClient;
