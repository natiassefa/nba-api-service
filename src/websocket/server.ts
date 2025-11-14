import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { logger } from '../logger.js';
import { connectionManager } from './connectionManager.js';
import { isConsumerReady } from '../kafka/consumer.js';

let wss: WebSocketServer | null = null;

/**
 * Sets up WebSocket server on the HTTP server
 */
export function setupWebSocketServer(httpServer: HttpServer) {
  wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  // Set the consumer ready check function
  connectionManager.setConsumerReadyCheck(isConsumerReady);

  wss.on('connection', (ws: WebSocket) => {
    connectionManager.addConnection(ws);
  });

  logger.info({ path: '/ws' }, 'WebSocket server started');
}

/**
 * Closes the WebSocket server and all connections
 */
export function closeWebSocketServer() {
  if (wss) {
    connectionManager.closeAll();
    wss.close();
    wss = null;
    logger.info('WebSocket server closed');
  }
}

