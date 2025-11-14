/**
 * Game Summary Repository
 * 
 * Functions for retrieving game summary data from the database.
 */

import { db } from '../client.js';
import { logger } from '../../logger.js';

/**
 * Game summary data structure (matches what's stored in database)
 */
export interface GameSummary {
  id: string;
  status: string;
  scheduled?: string;
  home: Record<string, unknown>;
  away: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Database row structure for game summary
 */
interface GameSummaryRow {
  id: number;
  game_id: string;
  summary_data: GameSummary;
  hash: string;
  fetched_at: Date;
  created_at: Date;
}

/**
 * Gets latest game summary for a game from the database
 */
export async function getLatestGameSummary(gameId: string): Promise<GameSummary | null> {
  const query = `
    SELECT summary_data FROM game_summaries
    WHERE game_id = $1
    ORDER BY fetched_at DESC
    LIMIT 1
  `;
  
  try {
    const result = await db.query<GameSummaryRow>(query, [gameId]);
    if (result.rows.length === 0) {
      return null;
    }
    
    // summary_data is stored as JSONB, so it's already parsed by pg
    return result.rows[0].summary_data;
  } catch (err) {
    logger.error({ err, gameId }, 'Failed to fetch game summary from database');
    throw err;
  }
}

