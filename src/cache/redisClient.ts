/**
 * Redis Client Module
 * 
 * Creates and exports a Redis client instance for caching game data.
 */

import Redis from 'ioredis';
import { logger } from '../logger.js';
import { cfg } from '../config.js';

export const redis = new Redis({
  host: cfg.redis.host,
  port: cfg.redis.port,
  password: cfg.redis.password,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

