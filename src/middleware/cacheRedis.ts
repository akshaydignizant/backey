import { Request, Response, NextFunction } from "express";
import RedisClient from "../cache/redisClient";

interface CacheOptions {
  expire?: number; // Time in seconds
  key?: string | ((req: Request) => string);
}

export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = RedisClient;
      const defaultExpire = 300; // 5 minutes default

      // Generate cache key
      let cacheKey = typeof options.key === "function" ? options.key(req) : options.key || `${req.method}:${req.originalUrl}`;

      if (req.user?.id) {
        cacheKey += `:user:${req.user.id}`;
      }

      // Try to get cached response
      const cachedResponse = await redis.get(cacheKey);

      if (cachedResponse) {
        return res.json(JSON.parse(cachedResponse));
      }

      // Store original res.json to intercept the response
      const originalJson = res.json;
      res.json = function (body) {
        redis.setEx(cacheKey, options.expire || defaultExpire, JSON.stringify(body));
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      // If Redis fails, continue without caching
      console.error("Cache middleware error:", error);
      next();
    }
  };
};

export const clearCache = async (pattern: string) => {
  try {
    const redis = RedisClient;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    console.error("Clear cache error:", error);
  }
};