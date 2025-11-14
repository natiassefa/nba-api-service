/**
 * Database Client Module
 * 
 * Creates and exports a PostgreSQL connection pool.
 * Handles connection events and errors for monitoring.
 */

import { Pool } from 'pg';
import { cfg } from '../config.js';
import { logger } from '../logger.js';

/**
 * PostgreSQL connection pool
 * 
 * Uses connection pooling for efficient database access.
 * Automatically handles reconnection and connection lifecycle.
 */
export const db = new Pool({
  host: cfg.database.host,
  port: cfg.database.port,
  user: cfg.database.user,
  password: cfg.database.password,
  database: cfg.database.database,
  ssl: cfg.database.ssl,
  max: cfg.database.max,
  idleTimeoutMillis: cfg.database.idleTimeoutMillis,
  connectionTimeoutMillis: cfg.database.connectionTimeoutMillis
});

// Log connection events for monitoring
db.on('connect', () => {
  logger.debug('Database client connected');
});

db.on('error', (err: Error) => {
  logger.error({ err }, 'Database pool error');
});

db.on('acquire', () => {
  logger.debug('Database client acquired from pool');
});

db.on('release', () => {
  logger.debug('Database client released to pool');
});

/**
 * Tests database connection by executing a simple query
 * 
 * @returns true if connection successful, false otherwise
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await db.query('SELECT 1 as test');
    logger.info('Database connection test successful');
    return result.rows[0]?.test === 1;
  } catch (err) {
    logger.error({ err }, 'Database connection test failed');
    return false;
  }
}

/**
 * Gracefully closes all database connections
 */
export async function closeDatabase() {
  await db.end();
  logger.info('Database connections closed');
}

