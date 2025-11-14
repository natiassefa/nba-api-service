import { Router } from 'express';
import { redis } from '../cache/redisClient.js';
import { KEYS } from '../cache/keys.js';
import { logger } from '../logger.js';
import { getSchedule } from '../db/repositories/schedules.js';
import { cfg } from '../config.js';
import { hydrateCache } from '../cache/hydrate.js';
import type { Schedule } from '../types/sportradar.js';

const router = Router();

/**
 * Converts date keywords to YYYY-MM-DD format
 */
function normalizeDate(dateParam: string): string {
  const lower = dateParam.toLowerCase();
  const today = new Date();
  
  switch (lower) {
    case 'today':
      return today.toISOString().split('T')[0];
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    case 'tomorrow': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    default:
      return dateParam;
  }
}

router.get('/:date', async (req, res) => {
  try {
    let { date } = req.params;
    
    // Normalize date keywords (today, yesterday, tomorrow)
    date = normalizeDate(date);
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: 'InvalidDate',
        message: 'Date must be in YYYY-MM-DD format or a keyword (today, yesterday, tomorrow)',
        statusCode: 400
      });
    }

    const scheduleKey = KEYS.schedule(date);
    
    // Try Redis cache first
    let scheduleData: string | null = null;
    try {
      scheduleData = await redis.get(scheduleKey);
    } catch (redisErr) {
      logger.warn({ err: redisErr, date }, 'Redis error, falling back to database');
    }

    if (scheduleData) {
      // Cache hit - return immediately
      const schedule: Schedule = JSON.parse(scheduleData);
      return res.json(schedule);
    }

    // Cache miss or Redis error - fallback to database
    logger.debug({ date }, 'Schedule not in Redis cache, querying database');
    
    if (cfg.database?.host) {
      try {
        const dbScheduleData = await getSchedule(date);
        
        if (dbScheduleData) {
          // Found in database - return it and hydrate cache
          logger.debug({ date }, 'Schedule found in database, returning from DB');
          
          // Hydrate Redis cache for future requests
          await hydrateCache(scheduleKey, dbScheduleData);
          
          return res.json(dbScheduleData);
        }
      } catch (dbErr) {
        logger.error({ err: dbErr, date }, 'Failed to fetch schedule from database');
        // Continue to return 404 below
      }
    }

    // Not found in cache or database
    return res.status(404).json({
      error: 'NotFound',
      message: `No schedule found for date ${date}`,
      statusCode: 404
    });
  } catch (err) {
    logger.error({ err, date: req.params.date }, 'Failed to fetch schedule');
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to fetch schedule',
      statusCode: 500
    });
  }
});

export default router;

