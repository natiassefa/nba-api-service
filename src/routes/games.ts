import { Router } from 'express';
import { redis } from '../cache/redisClient.js';
import { KEYS } from '../cache/keys.js';
import { logger } from '../logger.js';
import { getLatestPlayByPlay } from '../db/repositories/playByPlay.js';
import { getLatestGameSummary } from '../db/repositories/gameSummaries.js';
import { getGame } from '../db/repositories/games.js';
import { cfg } from '../config.js';
import { hydrateCache } from '../cache/hydrate.js';

const router = Router();

// Get game metadata
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const metaKey = KEYS.gameMeta(gameId);
    
    // Try Redis cache first
    let metaData: string | null = null;
    try {
      metaData = await redis.get(metaKey);
    } catch (redisErr) {
      logger.warn({ err: redisErr, gameId }, 'Redis error, falling back to database');
    }

    if (metaData) {
      // Cache hit - return immediately
      return res.json(JSON.parse(metaData));
    }

    // Cache miss or Redis error - fallback to database
    logger.debug({ gameId }, 'Game metadata not in Redis cache, querying database');
    
    if (cfg.database?.host) {
      try {
        const dbGameData = await getGame(gameId);
        
        if (dbGameData) {
          // Found in database - return it and hydrate cache
          logger.debug({ gameId }, 'Game metadata found in database, returning from DB');
          
          // Hydrate Redis cache for future requests
          await hydrateCache(metaKey, dbGameData);
          
          return res.json(dbGameData);
        }
      } catch (dbErr) {
        logger.error({ err: dbErr, gameId }, 'Failed to fetch game metadata from database');
        // Continue to return 404 below
      }
    }

    // Not found in cache or database
    return res.status(404).json({
      error: 'NotFound',
      message: `Game ${gameId} not found`,
      statusCode: 404
    });
  } catch (err) {
    logger.error({ err, gameId: req.params.gameId }, 'Failed to fetch game metadata');
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to fetch game metadata',
      statusCode: 500
    });
  }
});

// Get game summary
router.get('/:gameId/summary', async (req, res) => {
  try {
    const { gameId } = req.params;
    const summaryKey = KEYS.state('summary', gameId);
    
    // Try Redis cache first
    let summaryData: string | null = null;
    try {
      summaryData = await redis.get(summaryKey);
    } catch (redisErr) {
      logger.warn({ err: redisErr, gameId }, 'Redis error, falling back to database');
    }

    if (summaryData) {
      // Cache hit - return immediately
      return res.json(JSON.parse(summaryData));
    }

    // Cache miss or Redis error - fallback to database
    logger.debug({ gameId }, 'Game summary not in Redis cache, querying database');
    
    if (cfg.database?.host) {
      try {
        const dbSummaryData = await getLatestGameSummary(gameId);
        
        if (dbSummaryData) {
          // Found in database - return it and hydrate cache
          logger.debug({ gameId }, 'Game summary found in database, returning from DB');
          
          // Hydrate Redis cache for future requests
          await hydrateCache(summaryKey, dbSummaryData);
          
          return res.json(dbSummaryData);
        }
      } catch (dbErr) {
        logger.error({ err: dbErr, gameId }, 'Failed to fetch game summary from database');
        // Continue to return 404 below
      }
    }

    // Not found in cache or database
    return res.status(404).json({
      error: 'NotFound',
      message: `Summary for game ${gameId} not found`,
      statusCode: 404
    });
  } catch (err) {
    logger.error({ err, gameId: req.params.gameId }, 'Failed to fetch game summary');
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to fetch game summary',
      statusCode: 500
    });
  }
});

// Get play-by-play data
router.get('/:gameId/pbp', async (req, res) => {
  try {
    const { gameId } = req.params;
    const pbpKey = KEYS.state('pbp', gameId);
    
    // Try Redis cache first
    let pbpData: string | null = null;
    try {
      pbpData = await redis.get(pbpKey);
    } catch (redisErr) {
      logger.warn({ err: redisErr, gameId }, 'Redis error, falling back to database');
    }

    if (pbpData) {
      // Cache hit - return immediately
      return res.json(JSON.parse(pbpData));
    }

    // Cache miss or Redis error - fallback to database
    logger.debug({ gameId }, 'Play-by-play not in Redis cache, querying database');
    
    if (cfg.database?.host) {
      try {
        const dbPbpData = await getLatestPlayByPlay(gameId);
        
        if (dbPbpData) {
          // Found in database - return it and hydrate cache
          logger.debug({ gameId }, 'Play-by-play found in database, returning from DB');
          
          // Hydrate Redis cache for future requests
          await hydrateCache(pbpKey, dbPbpData);
          
          return res.json(dbPbpData);
        }
      } catch (dbErr) {
        logger.error({ err: dbErr, gameId }, 'Failed to fetch play-by-play from database');
        // Continue to return 404 below
      }
    }

    // Not found in cache or database
    return res.status(404).json({
      error: 'NotFound',
      message: `Play-by-play for game ${gameId} not found`,
      statusCode: 404
    });
  } catch (err) {
    logger.error({ err, gameId: req.params.gameId }, 'Failed to fetch play-by-play');
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to fetch play-by-play',
      statusCode: 500
    });
  }
});

export default router;

