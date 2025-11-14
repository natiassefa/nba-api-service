/**
 * Sportradar API Type Definitions
 * 
 * TypeScript interfaces for Sportradar NBA v8 API responses.
 * These are minimal types - expand as needed based on actual API usage.
 */

/**
 * Daily schedule response from Sportradar API
 * 
 * Contains list of games scheduled for a specific date.
 */
export interface Schedule {
  date: string; // Date in ISO format
  games: { 
    id: string; // Game UUID
    status: string; // Game status (scheduled, inprogress, closed, etc.)
    home: TeamRef; // Home team reference
    away: TeamRef; // Away team reference
  }[];
}

/**
 * Team reference information
 * 
 * Basic team data included in schedule responses.
 */
export interface TeamRef { 
  name: string; // Full team name
  alias?: string; // Team abbreviation (e.g., "LAL", "BOS")
  id?: string; // Team identifier
}

/**
 * Game summary response from Sportradar API
 * 
 * Contains game statistics, scores, status, and team information.
 * This is a minimal type definition - expand fields as needed.
 */
export interface SummaryResponse {
  id: string; // Game UUID
  status: string; // Current game status
  home: any; // Home team data (expand with specific fields as needed)
  away: any; // Away team data (expand with specific fields as needed)
  // TODO: Add specific fields you rely on (scores, periods, etc.)
}

/**
 * Play-by-play response from Sportradar API
 * 
 * Contains detailed event-by-event game actions.
 * This is a minimal type definition - expand fields as needed.
 */
export interface PbpResponse {
  id: string; // Game UUID
  sequence: number; // Sequence number for ordering events
  events: any[]; // Array of play-by-play events (expand event structure as needed)
  // TODO: Add specific event structure fields as needed
}

