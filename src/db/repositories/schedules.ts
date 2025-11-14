/**
 * Schedule Repository
 * 
 * Functions for retrieving schedule data from the database.
 */

import { db } from '../client.js';
import { logger } from '../../logger.js';
import type { Schedule } from '../../types/sportradar.js';

/**
 * Database row structure for schedule
 */
interface ScheduleRow {
  date: string;
  schedule_data: Schedule;
  game_ids: string[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Gets schedule for a date from the database
 */
export async function getSchedule(dateISO: string): Promise<Schedule | null> {
  const query = 'SELECT schedule_data FROM schedules WHERE date = $1';
  
  try {
    const result = await db.query<ScheduleRow>(query, [dateISO]);
    if (result.rows.length === 0) {
      return null;
    }
    
    // schedule_data is stored as JSONB, so it's already parsed by pg
    return result.rows[0].schedule_data;
  } catch (err) {
    logger.error({ err, dateISO }, 'Failed to fetch schedule from database');
    throw err;
  }
}

