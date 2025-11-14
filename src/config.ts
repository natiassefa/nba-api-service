/**
 * Configuration Module
 * 
 * Centralizes all application configuration from environment variables.
 * Loads .env file automatically via dotenv/config import.
 */

import 'dotenv/config';

export const cfg = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'nba-api-service',
    topicUpdates: process.env.KAFKA_TOPIC_UPDATES || 'nba.game.updates',
    consumerGroupId: process.env.KAFKA_CONSUMER_GROUP_ID || 'nba-api-consumer-group'
  },
  api: {
    port: Number(process.env.API_PORT || '3000')
  },
  // Database configuration (for fallback when Redis cache expires)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || '5433'),
    user: process.env.DB_USER || 'nba',
    password: process.env.DB_PASSWORD || 'nba',
    database: process.env.DB_NAME || 'nba',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DB_POOL_SIZE || '10'),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || '30000'),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || '5000')
  },
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || 'info' // Log level (trace, debug, info, warn, error, fatal)
};

