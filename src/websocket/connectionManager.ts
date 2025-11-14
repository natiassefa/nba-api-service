import { WebSocket } from 'ws';
import { logger } from '../logger.js';

export interface ClientConnection {
  ws: WebSocket;
  id: string;
  subscribedGames: Set<string>; // Set of game IDs this client is subscribed to
  subscribedToAll: boolean; // If true, receives all game updates
}

/**
 * WebSocket message types sent from server to client
 */
export type ServerMessage =
  | { type: 'subscribed'; gameId: string }
  | { type: 'subscribed'; all: true }
  | { type: 'unsubscribed'; gameId: string }
  | { type: 'unsubscribed'; all: true }
  | { type: 'error'; error: string }
  | { type: 'gameUpdate'; gameId: string; eventType: 'summary' | 'pbp'; payload: unknown; timestamp: string };

/**
 * WebSocket message types received from client
 */
export type ClientMessage =
  | { type: 'subscribe'; gameId?: string; all?: boolean }
  | { type: 'unsubscribe'; gameId?: string; all?: boolean };

/**
 * Manages all WebSocket client connections
 */
class ConnectionManager {
  private connections: Map<string, ClientConnection> = new Map();
  private nextConnectionId = 1;
  private consumerReadyCheck: (() => boolean) | null = null;

  /**
   * Sets the function to check if the Kafka consumer is ready
   */
  setConsumerReadyCheck(check: () => boolean) {
    this.consumerReadyCheck = check;
  }

  /**
   * Adds a new WebSocket connection
   * Rejects the connection if the consumer is not ready
   */
  addConnection(ws: WebSocket): ClientConnection | null {
    // Check if consumer is ready
    if (this.consumerReadyCheck && !this.consumerReadyCheck()) {
      logger.warn('WebSocket connection rejected: Kafka consumer not ready');
      try {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Service unavailable: Kafka consumer not ready. Please try again later.'
        }));
        ws.close(1013, 'Service unavailable'); // 1013 = Try again later
      } catch (err) {
        logger.error({ err }, 'Failed to send rejection message to WebSocket client');
        ws.terminate();
      }
      return null;
    }

    const id = `conn-${this.nextConnectionId++}`;
    const connection: ClientConnection = {
      ws,
      id,
      subscribedGames: new Set(),
      subscribedToAll: false
    };

    this.connections.set(id, connection);

    ws.on('close', () => {
      this.removeConnection(id);
    });

    ws.on('error', (err) => {
      logger.error({ err, connectionId: id }, 'WebSocket error');
      this.removeConnection(id);
    });

    // Handle client messages (for subscription management)
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        this.handleClientMessage(id, message);
      } catch (err) {
        logger.warn({ err, connectionId: id }, 'Failed to parse client message');
        this.sendError(id, 'Invalid message format');
      }
    });

    logger.info({ connectionId: id }, 'WebSocket client connected');
    return connection;
  }

  /**
   * Removes a connection
   */
  removeConnection(id: string) {
    const connection = this.connections.get(id);
    if (connection) {
      this.connections.delete(id);
      logger.info({ connectionId: id }, 'WebSocket client disconnected');
    }
  }

  /**
   * Handles messages from clients (subscription management)
   */
  private handleClientMessage(connectionId: string, message: ClientMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (message.type === 'subscribe') {
      if (message.gameId) {
        connection.subscribedGames.add(message.gameId);
        logger.debug({ connectionId, gameId: message.gameId }, 'Client subscribed to game');
        this.send(connectionId, { type: 'subscribed', gameId: message.gameId });
      } else if (message.all === true) {
        connection.subscribedToAll = true;
        logger.debug({ connectionId }, 'Client subscribed to all games');
        this.send(connectionId, { type: 'subscribed', all: true });
      }
    } else if (message.type === 'unsubscribe') {
      if (message.gameId) {
        connection.subscribedGames.delete(message.gameId);
        logger.debug({ connectionId, gameId: message.gameId }, 'Client unsubscribed from game');
        this.send(connectionId, { type: 'unsubscribed', gameId: message.gameId });
      } else if (message.all === true) {
        connection.subscribedToAll = false;
        logger.debug({ connectionId }, 'Client unsubscribed from all games');
        this.send(connectionId, { type: 'unsubscribed', all: true });
      }
    }
  }

  /**
   * Sends a message to a specific connection
   */
  send(connectionId: string, message: ServerMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      connection.ws.send(JSON.stringify(message));
    } catch (err) {
      logger.error({ err, connectionId }, 'Failed to send WebSocket message');
    }
  }

  /**
   * Sends an error message to a connection
   */
  sendError(connectionId: string, error: string) {
    this.send(connectionId, { type: 'error', error });
  }

  /**
   * Broadcasts a game update to all relevant connections
   */
  broadcastGameUpdate(gameId: string, eventType: 'summary' | 'pbp', payload: unknown) {
    const message: ServerMessage = {
      type: 'gameUpdate',
      gameId,
      eventType,
      payload,
      timestamp: new Date().toISOString()
    };

    let broadcastCount = 0;
    for (const [id, connection] of this.connections.entries()) {
      // Send if subscribed to all games, or specifically to this game
      if (connection.subscribedToAll || connection.subscribedGames.has(gameId)) {
        this.send(id, message);
        broadcastCount++;
      }
    }

    logger.debug({ gameId, eventType, broadcastCount }, 'Broadcasted game update');
  }

  /**
   * Gets the number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Closes all connections
   */
  closeAll() {
    for (const [, connection] of this.connections.entries()) {
      connection.ws.close();
    }
    this.connections.clear();
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();

