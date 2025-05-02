import { Request, Response, NextFunction } from 'express';
import redisClient from '../cache/redisClient';
import { createHash } from 'crypto';
import httpResponse from '../util/httpResponse';

// Default TTL (Time To Live) for cache entries
const DEFAULT_CACHE_TTL = 60 * 30; // 30 minutes

function generateCacheKey(req: Request): string {
  const path = req.path;
  const query = JSON.stringify(req.query);
  const params = JSON.stringify(req.params);
  const userId = req.user?.id || 'anonymous'; // Assuming user is attached by authMiddleware

  const hash = createHash('sha1')
    .update(query + params + userId)
    .digest('hex');

  return `${path}:${hash}`;
}

export function cacheMiddleware(ttl: number = DEFAULT_CACHE_TTL) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if explicitly requested
    if (req.query.noCache === 'true') {
      return next();
    }

    const key = generateCacheKey(req);

    try {
      // Check Redis for cached data
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        console.log(`Cache hit for ${key}`);
        return httpResponse(req, res, 200, 'Cache hit', JSON.parse(cachedData));
      }

      // Override res.json to cache responses
      const originalJson = res.json;
      res.json = (body: any): Response => {
        // Cache successful responses (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.set(key, JSON.stringify(body), { EX: ttl })
            .catch(err => console.error('Redis set error:', err));
        }
        return originalJson.call(res, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// Utility function to clear cache for specific patterns
export async function clearCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}