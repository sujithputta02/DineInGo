import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';

/**
 * Cache middleware - caches GET requests only
 * Usage: router.get('/path', cacheMiddleware(300), handler)
 * 
 * @param ttl - Time to live in seconds (default: 300 = 5 minutes)
 */
export function cacheMiddleware(ttl?: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if cache not ready
    if (!cacheService.isReady()) {
      return next();
    }

    // Generate cache key from URL and query params
    const cacheKey = `api:${req.originalUrl || req.url}`;

    try {
      // Check cache
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        console.log(`✅ Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`❌ Cache MISS: ${cacheKey}`);

      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Cache successful responses only (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, ttl).catch(err => {
            console.error('Cache save error:', err);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Don't block request if cache fails
      next();
    }
  };
}

/**
 * Cache invalidation middleware - clears cache on data mutations
 * Usage: router.post('/path', invalidateCacheMiddleware(['restaurants:*']), handler)
 * 
 * @param patterns - Array of cache key patterns to invalidate
 */
export function invalidateCacheMiddleware(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send/json
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    // Override to invalidate after successful mutation
    const invalidateAndRespond = async (body: any, responder: Function) => {
      // Only invalidate on successful mutations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`🗑️  Invalidating cache patterns:`, patterns);
        
        for (const pattern of patterns) {
          await cacheService.invalidatePattern(`api:*${pattern}*`);
        }
      }
      return responder(body);
    };

    res.send = (body: any) => invalidateAndRespond(body, originalSend);
    res.json = (body: any) => invalidateAndRespond(body, originalJson);

    next();
  };
}

/**
 * Clear all cache endpoint (for admin use)
 * Usage: router.post('/admin/cache/clear', clearAllCacheMiddleware, handler)
 */
export async function clearAllCacheMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    await cacheService.flushAll();
    res.json({ success: true, message: 'All cache cleared' });
  } catch (error) {
    next(error);
  }
}

/**
 * Cache stats endpoint (for monitoring)
 * Usage: router.get('/admin/cache/stats', cacheStatsMiddleware)
 */
export async function cacheStatsMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await cacheService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}
