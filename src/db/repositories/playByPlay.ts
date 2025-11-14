/**
 * Play-by-Play Repository
 * 
 * Functions for retrieving play-by-play data from the database.
 */

import { db } from '../client.js';
import { logger } from '../../logger.js';

/**
 * Play-by-play data structure (matches what's stored in database)
 */
export interface PlayByPlay {
  id: string;
  events: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/**
 * Database row structure for play-by-play
 */
interface PlayByPlayRow {
  id: number;
  game_id: string;
  pbp_data: PlayByPlay;
  hash: string;
  fetched_at: Date;
  created_at: Date;
}

/**
 * Gets latest play-by-play for a game from the database
 */
export async function getLatestPlayByPlay(gameId: string): Promise<PlayByPlay | null> {
  const query = `
    SELECT pbp_data FROM play_by_play
    WHERE game_id = $1
    ORDER BY fetched_at DESC
    LIMIT 1
  `;
  
  try {
    const result = await db.query<PlayByPlayRow>(query, [gameId]);
    if (result.rows.length === 0) {
      return null;
    }
    
    // pbp_data is stored as JSONB, so it's already parsed by pg
    return result.rows[0].pbp_data;
  } catch (err) {
    logger.error({ err, gameId }, 'Failed to fetch play-by-play from database');
    throw err;
  }
}

