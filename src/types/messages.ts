/**
 * Message Models
 * 
 * Defines the structure of messages consumed from Kafka.
 * These messages represent game data updates from the realtime service.
 */

/**
 * Game update message structure
 * 
 * This message is consumed from Kafka whenever a change is detected
 * in game summary or play-by-play data.
 * 
 * @template T - Type of the payload (typically SummaryResponse or PbpResponse)
 */
export interface UpdateMessage<T = any> {
  /** Type of update: 'summary' (game stats/scores) or 'pbp' (play-by-play events) */
  eventType: 'summary' | 'pbp';
  
  /** Unique game identifier (UUID) */
  gameId: string;
  
  /** Data source identifier (always 'sportradar' for this service) */
  source: 'sportradar';
  
  /** API version used (Sportradar v8) */
  version: 'v8';
  
  /** ISO timestamp when the data was fetched */
  fetchedAt: string;
  
  /** SHA256 hash of the JSON payload (for change detection and deduplication) */
  hash: string;
  
  /** Full game data payload (summary or play-by-play JSON) */
  payload: T;
}

