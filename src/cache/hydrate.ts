/**
 * Cache Hydration Utilities
 * 
 * Helper functions to hydrate Redis cache when data is retrieved from database.
 */

import { redis } from './redisClient.js';
import { logger } from '../logger.js';

/**
 * Cache TTL values (in seconds)
 */
const CACHE_TTL = {
  /** Schedule data expires after 24 hours */
  SCHEDULE_SECONDS: 86400,
  
  /** Default TTL for game state cache (60 seconds) */
  DEFAULT_GAME_STATE_SECONDS: 60,
} as const;

/**
 * Hydrates Redis cache with data retrieved from database
 * 
 * @param key - Redis key to store the data
 * @param data - Data to store (will be JSON stringified)
 * @param ttl - Time to live in seconds (optional, uses defaults based on key type)
 * @returns Promise that resolves when cache is hydrated (or fails silently)
 */
export async function hydrateCache(
  key: string,
  data: unknown,
  ttl?: number
): Promise<void> {
  try {
    const json = JSON.stringify(data);
    
    // Determine TTL based on key type if not provided
    let cacheTtl = ttl;
    if (!cacheTtl) {
      if (key.startsWith('schedule:')) {
        cacheTtl = CACHE_TTL.SCHEDULE_SECONDS;
      } else {
        cacheTtl = CACHE_TTL.DEFAULT_GAME_STATE_SECONDS;
      }
    }
    
    await redis.setex(key, cacheTtl, json);
    logger.debug({ key, ttl: cacheTtl }, 'Cache hydrated from database');
  } catch (err) {
    // Don't fail the request if cache hydration fails
    logger.warn({ err, key }, 'Failed to hydrate Redis cache');
  }
}

