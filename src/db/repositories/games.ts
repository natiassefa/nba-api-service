/**
 * Games Repository
 * 
 * Functions for retrieving game metadata from the database.
 */

import { db } from '../client.js';
import { logger } from '../../logger.js';

/**
 * Game metadata structure (matches what's stored in database)
 */
export interface GameMetadata {
  id: string;
  status: string;
  scheduled?: string;
  home?: {
    id?: string;
    name?: string;
    alias?: string;
  };
  away?: {
    id?: string;
    name?: string;
    alias?: string;
  };
  [key: string]: unknown;
}

/**
 * Database row structure for game
 */
interface GameRow {
  id: string;
  scheduled_at: Date | null;
  status: string;
  home_team_id: string | null;
  home_team_name: string | null;
  home_team_alias: string | null;
  away_team_id: string | null;
  away_team_name: string | null;
  away_team_alias: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Gets game metadata by ID from the database
 */
export async function getGame(gameId: string): Promise<GameMetadata | null> {
  const query = 'SELECT * FROM games WHERE id = $1';
  
  try {
    const result = await db.query<GameRow>(query, [gameId]);
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    // Transform database row to game metadata format
    const metadata: GameMetadata = {
      id: row.id,
      status: row.status,
      scheduled: row.scheduled_at ? row.scheduled_at.toISOString() : undefined,
      home: row.home_team_id ? {
        id: row.home_team_id,
        name: row.home_team_name || undefined,
        alias: row.home_team_alias || undefined
      } : undefined,
      away: row.away_team_id ? {
        id: row.away_team_id,
        name: row.away_team_name || undefined,
        alias: row.away_team_alias || undefined
      } : undefined
    };
    
    return metadata;
  } catch (err) {
    logger.error({ err, gameId }, 'Failed to fetch game from database');
    throw err;
  }
}

