# NBA API Service

REST API and WebSocket service for NBA game data. This service provides real-time access to NBA game schedules, statistics, and play-by-play data stored in Redis, with live updates delivered via WebSocket connections.

## What This API Does

The NBA API Service is a standalone microservice that:

1. **Serves Game Data via REST API**: Provides HTTP endpoints to query NBA game schedules, game metadata, summaries, and play-by-play data from Redis cache.

2. **Real-Time Updates via WebSocket**: Accepts WebSocket connections and broadcasts live game updates to subscribed clients when game data changes are detected.

3. **Kafka Consumer**: Consumes game update messages from Kafka (published by the `nba-realtime-service`) and automatically broadcasts them to connected WebSocket clients.

4. **Independent Deployment**: Runs as a separate service that communicates with other services only through shared infrastructure (Redis and Kafka), allowing for independent scaling and deployment.

### Architecture Flow

```
nba-realtime-service → Kafka → nba-api-service → WebSocket Clients
                              ↓
                           Redis ← REST API Clients
```

- The realtime service polls Sportradar API and publishes updates to Kafka
- This API service consumes Kafka messages and broadcasts to WebSocket clients
- REST API clients query data directly from Redis
- Both services share the same Redis instance and Kafka cluster

## Directory Structure

```
nba-api-service/
├── src/
│   ├── cache/              # Redis client and key generation
│   │   ├── keys.ts         # Redis key generation helpers
│   │   └── redisClient.ts  # Redis connection and client setup
│   ├── kafka/              # Kafka consumer implementation
│   │   └── consumer.ts     # Kafka consumer for game updates
│   ├── routes/              # Express route handlers
│   │   ├── games.ts        # Game endpoints (metadata, summary, pbp)
│   │   └── schedules.ts    # Schedule endpoints
│   ├── types/               # TypeScript type definitions
│   │   ├── api.ts          # API-specific types (errors, responses)
│   │   ├── messages.ts      # Kafka message types
│   │   └── sportradar.ts   # Sportradar API response types
│   ├── websocket/           # WebSocket server and connection management
│   │   ├── connectionManager.ts  # WebSocket connection tracking and broadcasting
│   │   └── server.ts        # WebSocket server setup
│   ├── config.ts           # Configuration management (env vars)
│   ├── logger.ts           # Pino logger setup
│   └── index.ts            # Application entry point and Express setup
├── dist/                   # Compiled JavaScript (generated)
├── openapi.yaml            # OpenAPI 3.0 schema documentation
├── Dockerfile              # Docker container configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

### Key Components

- **`src/index.ts`**: Main entry point that sets up Express server, WebSocket server, and Kafka consumer
- **`src/routes/`**: REST API route handlers for schedules and games
- **`src/websocket/`**: WebSocket connection management and message broadcasting
- **`src/kafka/`**: Kafka consumer that processes game update messages
- **`src/cache/`**: Redis client and key generation utilities

## Endpoints

### Health Check

- **`GET /health`**
  - Returns service health status and current WebSocket connection count
  - Response: `{ status: "ok", timestamp: "...", websocketConnections: 5 }`

### Schedules

- **`GET /api/schedules/{date}`**
  - Get NBA game schedule for a specific date
  - Parameters: `date` (YYYY-MM-DD format, e.g., "2025-01-08")
  - Returns: Schedule object with list of games for the date
  - Errors: 400 (invalid date format), 404 (schedule not found)

### Games

- **`GET /api/games/{gameId}`**
  - Get game metadata (teams, status, etc.)
  - Parameters: `gameId` (UUID)
  - Returns: Game metadata object
  - Errors: 404 (game not found)

- **`GET /api/games/{gameId}/summary`**
  - Get current game summary (scores, statistics, status)
  - Parameters: `gameId` (UUID)
  - Returns: Game summary object with scores and stats
  - Errors: 404 (summary not found)

- **`GET /api/games/{gameId}/pbp`**
  - Get play-by-play events for a game
  - Parameters: `gameId` (UUID)
  - Returns: Play-by-play object with event sequence
  - Errors: 404 (play-by-play not found)

### WebSocket Endpoint

- **`ws://host:port/ws`**
  - WebSocket connection for real-time game updates
  - Clients can subscribe to specific games or all games
  - Receives broadcast messages when game data changes

See [WebSocket API](#websocket-api) section below for detailed usage.

## Tech Used

### Runtime & Language
- **Node.js 20+**: JavaScript runtime environment
- **TypeScript 5.3+**: Type-safe JavaScript with ES modules
- **ES Modules**: Modern JavaScript module system (`"type": "module"`)

### Web Framework
- **Express 4.18+**: HTTP server framework for REST API endpoints
- **ws 8.16+**: WebSocket library for real-time connections

### Data & Messaging
- **Redis (via ioredis 5.3+)**: In-memory cache for game data storage
- **Kafka (via kafkajs 2.2+)**: Message broker for consuming game updates

### Logging
- **Pino 8.15+**: High-performance structured JSON logger
- **pino-pretty 10.2+**: Pretty-printed logs for development

### Development Tools
- **tsx 4.7+**: TypeScript execution for development (watch mode)
- **ESLint 8.54+**: Code linting with TypeScript support
- **@typescript-eslint**: TypeScript-specific ESLint rules

### Build & Deployment
- **TypeScript Compiler**: Compiles TypeScript to JavaScript
- **Docker**: Containerization for deployment
- **pnpm**: Fast, disk space efficient package manager

## API Documentation

OpenAPI schema is available at `openapi.yaml`. You can view it using tools like:
- [Swagger Editor](https://editor.swagger.io/)
- [Redoc](https://redocly.github.io/redoc/)
- Or any OpenAPI-compatible tool

## Environment Variables

### Redis Configuration
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)

### Kafka Configuration
- `KAFKA_BROKERS` - Kafka broker addresses, comma-separated (default: localhost:9092)
  - **When running locally**: Use `localhost:19092` (Redpanda external port)
  - **When running in Docker**: Use `redpanda:9092` (Docker hostname)
- `KAFKA_CLIENT_ID` - Kafka client ID (default: nba-api-service)
- `KAFKA_TOPIC_UPDATES` - Kafka topic for game updates (default: nba.game.updates)
- `KAFKA_CONSUMER_GROUP_ID` - Kafka consumer group ID (default: nba-api-consumer-group)

### API Configuration
- `API_PORT` - API server port (default: 3000)
- `CORS_ORIGIN` - CORS allowed origin (default: http://localhost:3001)

### Database Configuration (for fallback when Redis cache expires)
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5433)
- `DB_USER` - PostgreSQL user (default: nba)
- `DB_PASSWORD` - PostgreSQL password (default: nba)
- `DB_NAME` - PostgreSQL database name (default: nba)
- `DB_SSL` - Enable SSL connection (default: false)
- `DB_POOL_SIZE` - Connection pool size (default: 10)
- `DB_IDLE_TIMEOUT_MS` - Idle timeout in milliseconds (default: 30000)
- `DB_CONNECTION_TIMEOUT_MS` - Connection timeout in milliseconds (default: 5000)

### Logging Configuration
- `LOG_LEVEL` - Logging level: trace, debug, info, warn, error, fatal (default: info)

## Running

### Installation

```bash
pnpm install
```

### Build

```bash
pnpm run build
```

### Start Production Server

```bash
pnpm start
```

### Development Mode

#### Running Locally (Outside Docker)

When running the service locally (outside Docker), you need to ensure the infrastructure services (Redis and Redpanda) are running. You can start them using the `nba-realtime-service` docker-compose:

```bash
cd ../nba-realtime-service
docker-compose up -d redis redpanda
```

Then create a `.env` file in the project root. You can copy `.env.example` as a starting point:

```bash
cp .env.example .env
```

The `.env.example` file includes all configuration options. For local development, you'll typically need:

```bash
# .env file
KAFKA_BROKERS=localhost:19092  # Use external port for local access
REDIS_HOST=localhost
REDIS_PORT=6379
DB_HOST=localhost
DB_PORT=5433
DB_USER=nba
DB_PASSWORD=nba
DB_NAME=nba
```

Or set them as environment variables:

```bash
export KAFKA_BROKERS=localhost:19092  # Use external port for local access
export REDIS_HOST=localhost
export REDIS_PORT=6379
pnpm run dev
```

**Important**: 
- When running locally, use `localhost:19092` for Kafka (the external port), not `redpanda:9092` (which only works inside Docker).
- The service automatically loads environment variables from a `.env` file if present (via `dotenv`).

#### Running with Docker Compose

You can also run the entire service stack using Docker Compose:

```bash
docker-compose up
```

This will start Redis, Redpanda, and the API service together. The service will automatically use the correct Docker hostnames (`redpanda:9092`, `redis:6379`).

**Note**: Docker Compose will automatically load environment variables from a `.env` file if present. You can override Docker-specific values in your `.env` file.

#### Development Mode (Watch)

```bash
pnpm run dev
```

Runs the server in watch mode with automatic TypeScript recompilation.

## WebSocket API

Connect to `ws://localhost:3000/ws` for real-time game updates.

### Subscription Messages

Send JSON messages to subscribe/unsubscribe:

**Subscribe to specific game:**
```json
{"type": "subscribe", "gameId": "abc123-def456-ghi789"}
```

**Subscribe to all games:**
```json
{"type": "subscribe", "all": true}
```

**Unsubscribe from specific game:**
```json
{"type": "unsubscribe", "gameId": "abc123-def456-ghi789"}
```

**Unsubscribe from all games:**
```json
{"type": "unsubscribe", "all": true}
```

### Update Messages

When subscribed, you'll receive broadcast messages in the format:
```json
{
  "type": "gameUpdate",
  "gameId": "abc123-def456-ghi789",
  "eventType": "summary",
  "payload": {
    "id": "abc123-def456-ghi789",
    "status": "inprogress",
    "home": { ... },
    "away": { ... }
  },
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

The `eventType` can be either `"summary"` or `"pbp"` (play-by-play).

### Confirmation Messages

After subscribing/unsubscribing, you'll receive confirmation:
```json
{"type": "subscribed", "gameId": "abc123-def456-ghi789"}
{"type": "subscribed", "all": true}
{"type": "unsubscribed", "gameId": "abc123-def456-ghi789"}
{"type": "unsubscribed", "all": true}
```

### Error Messages

If an invalid message is sent:
```json
{"type": "error", "error": "Invalid message format"}
```

