/**
 * Redis Key Generators
 * 
 * Centralized key generation for Redis cache entries.
 * Ensures consistent key naming across the application.
 */

/**
 * Generates Redis keys for game data caching
 */
export const KEYS = {
  /** Stores the full schedule JSON for a specific date */
  schedule: (dateISO: string) => `schedule:${dateISO}`,
  
  /** Stores set of game IDs for a specific date (for quick iteration) */
  scheduleGames: (dateISO: string) => `schedule:games:${dateISO}`,
  
  /** Stores individual game metadata from schedule (teams, status, etc.) */
  gameMeta: (gameId: string) => `game:meta:${gameId}`,
  
  /** Stores the full game state JSON (summary or play-by-play) */
  state: (type: 'meta' | 'summary' | 'pbp', gameId: string) => `game:${type}:${gameId}`
};

