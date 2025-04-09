// import { createClient } from "@redis/client";
// import dotenv from "dotenv";

// dotenv.config();

// const redisURL = process.env.REDIS_URL;

// if (!redisURL) {
//   throw new Error("❌ REDIS_URL is not defined in .env file!");
// }

// const redisClient = createClient({ url: redisURL });

// redisClient.on("error", (err:String) => console.error("❌ Redis Error:", err));

// let isConnected = false;

// export async function connectRedis() {
//   if (!isConnected) {
//     try {
//       await redisClient.connect();
//       isConnected = true;
//       console.log("✅ Redis Cloud connected successfully!");
//     } catch (error) {
//       console.error("❌ Redis connection failed:", error);
//     }
//   }
// }


// export default redisClient;

import { createClient } from "@redis/client";
import dotenv from "dotenv";

dotenv.config();

const redisURL = process.env.REDIS_URL;

const redisClient = createClient({
  url: redisURL,
  socket: {
    connectTimeout: 10000, // 10 seconds timeout
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000) // Retry logic
  }
});

redisClient.on("error", (error) => console.error("❌ Redis Error:", error));

(async () => {
  try {
    await redisClient.connect();
    console.log("✅ Connected to Redis Cloud");
  } catch (error) {
    console.error("❌ Redis Connection Failed:", error);
  }
})();

export default redisClient;
