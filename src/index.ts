import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { logger } from './logger.js';
import { cfg } from './config.js';
import scheduleRoutes from './routes/schedules.js';
import gameRoutes from './routes/games.js';
import { setupWebSocketServer, closeWebSocketServer } from './websocket/server.js';
import { startConsumer, stopConsumer, setMessageHandler } from './kafka/consumer.js';
import { connectionManager } from './websocket/connectionManager.js';
import { testDatabaseConnection, closeDatabase } from './db/client.js';

export function createApiServer() {
  const app = express();

  // CORS middleware - allow requests from client app
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  }));

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      websocketConnections: connectionManager.getConnectionCount()
    });
  });

  // API routes
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/games', gameRoutes);

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err, path: req.path }, 'Unhandled API error');
    res.status(500).json({
      error: 'InternalError',
      message: 'An unexpected error occurred',
      statusCode: 500
    });
  });

  return app;
}

async function main() {
  const app = createApiServer();
  const httpServer = createServer(app);
  
  // Test database connection if configured (non-blocking)
  if (cfg.database?.host) {
    try {
      logger.info('Testing database connection...');
      const connected = await testDatabaseConnection();
      if (connected) {
        logger.info('Database connection established');
      } else {
        logger.warn('Database connection test failed, continuing without database fallback');
      }
    } catch (err) {
      logger.warn({ err }, 'Database connection test error, continuing without database fallback');
    }
  } else {
    logger.info('Database not configured, skipping connection test');
  }
  
  // Setup WebSocket server
  setupWebSocketServer(httpServer);
  
  // Setup Kafka consumer message handler
  setMessageHandler((message) => {
    // Broadcast to WebSocket clients
    connectionManager.broadcastGameUpdate(
      message.gameId,
      message.eventType,
      message.payload
    );
  });

  // Start Kafka consumer (non-blocking - HTTP server will start even if Kafka fails)
  try {
    logger.info('Starting Kafka consumer');
    startConsumer();
  } catch (err) {
    logger.warn({ err }, 'Failed to start Kafka consumer, continuing without real-time updates');
  }
  
  const port = cfg.api.port;
  
  httpServer.listen(port, () => {
    logger.info({ port }, 'API server started');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    try {
      await stopConsumer();
    } catch (err) {
      logger.warn({ err }, 'Error stopping Kafka consumer');
    }
    try {
      await closeDatabase();
    } catch (err) {
      logger.warn({ err }, 'Error closing database connections');
    }
    closeWebSocketServer();
    httpServer.close(() => {
      logger.info('API server stopped');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(async (err) => {
  logger.error({ err }, 'Fatal error occurred');
  try {
    await stopConsumer();
  } catch (stopErr) {
    logger.warn({ err: stopErr }, 'Error stopping Kafka consumer during fatal error');
  }
  process.exit(1);
});
