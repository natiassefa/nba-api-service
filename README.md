# NBA API Service

A production-grade REST API and WebSocket service for NBA game data. This service provides real-time access to NBA game schedules, statistics, and play-by-play data stored in Redis, with live updates delivered via WebSocket connections. It consumes game update messages from Kafka and broadcasts them to subscribed clients.


## Overview


The NBA API Service is a standalone microservice that:

- **Serves Game Data via REST API**: Provides HTTP endpoints to query NBA game schedules, game metadata, summaries, and play-by-play data from Redis cache
- **Real-Time Updates via WebSocket**: Accepts WebSocket connections and broadcasts live game updates to subscribed clients when game data changes are detected
- **Kafka Consumer**: Consumes game update messages from Kafka (published by the `nba-realtime-service`) and automatically broadcasts them to connected WebSocket clients
- **Independent Deployment**: Runs as a separate service that communicates with other services only through shared infrastructure (Redis and Kafka), allowing for independent scaling and deployment



## Features



- 🔌 **REST API**: HTTP endpoints for schedules, game metadata, summaries, and play-by-play data
- 🔄 **WebSocket Server**: Real-time bidirectional communication for live game updates
- 📡 **Kafka Integration**: Consumes game update messages and broadcasts to WebSocket clients
- 💾 **Redis Caching**: Fast access to game data stored in Redis
- 🗄️ **PostgreSQL Fallback**: Optional database fallback when Redis cache expires
- 🎯 **Subscription Management**: Clients can subscribe to specific games or all games
- 🛡️ **Graceful Shutdown**: Proper cleanup of connections and resources
- 📊 **Structured Logging**: Pino-based logging with JSON output
- 🔍 **Health Checks**: Health endpoint with connection metrics

## Architecture


```
┌─────────────────────┐
│ nba-realtime-service│
│ (Polls NBA APIs) │
└──────────┬──────────┘
│
▼
┌──────────┐
│ Kafka │ ← Game update messages
│(Redpanda)│
└────┬─────┘
│
▼
┌─────────────────────┐
│ nba-api-service │
│ │
│ ┌───────────────┐ │
│ │ Kafka Consumer│ │ ← Consumes updates
│ └───────┬───────┘ │
│ │ │
│ ▼ │
│ ┌───────────────┐ │
│ │ WebSocket │ │ ← Broadcasts to clients
│ │ Server │ │
│ └───────┬───────┘ │
│ │ │
│ ┌───────┴───────┐ │
│ │ REST API │ │ ← Serves cached data
│ └───────┬───────┘ │
└──────────┼──────────┘
│
┌──────┴──────┐
▼ ▼
┌─────────┐ ┌──────────┐
│ Redis │ │WebSocket │
│ (Cache) │ │ Clients │
└─────────┘ └──────────┘

```

### Data Flow



1. **nba-realtime-service** polls NBA APIs and publishes updates to Kafka
2. **nba-api-service** consumes Kafka messages and broadcasts to WebSocket clients
3. **REST API clients** query data directly from Redis
4. **WebSocket clients** receive real-time updates when game data changes
5. Both services share the same Redis instance and Kafka cluster

## Prerequisites

- **Node.js** 20+
- **TypeScript** 5.3+
- **pnpm** (package manager)
- **Docker** & **Docker Compose** (for Redis + Redpanda/Kafka)
- **Redis** (for caching game data)
- **Kafka/Redpanda** (for consuming game updates)

## Quick Start

### Using Docker Compose

The easiest way to get started is using Docker Compose:

```bash
# Start all services (Redis, Redpanda, and API service)
docker compose up -d
```

```
# View logs

docker compose logs -f nba-api-service

# Stop everything

docker compose down

```

```

```



This automatically starts:


1. **Redis** on port 6379 (with health check)
2. **Redpanda** (Kafka) on port 9092 (with health check)
3. **NBA API Service** on port 3000
   - Waits for Redis and Redpanda to be healthy before starting
   - Automatically connects to Kafka and starts consuming messages



### Using Existing Infrastructure



If you already have Redis and Kafka running (e.g., from `nba-realtime-service`):



```bash
# Start only the API service
docker compose up -d nba-api-service
```



## Installation



### Local Development



```bash
# Install dependencies
pnpm install
```



# Build TypeScript


pnpm run build



# Start production server


pnpm start


```

```


```

```



### Development Mode (Watch)



```bash
# Run in watch mode with automatic recompilation
pnpm run dev
```



## API Endpoints


### Health Check


```bash
GET /health

```

Returns service health status and current WebSocket connection count:

```json
{
  "status": "ok",
  "timestamp": "2025-01-08T12:00:00.000Z",
  "websocketConnections": 5
}
```

### Schedules


```bash
GET /api/schedules/{date}

```

Get NBA game schedule for a specific date.

**Parameters:**

- `date` - Date in YYYY-MM-DD format (e.g., "2025-01-08")

**Example:**


```bash
curl http://localhost:3000/api/schedules/2025-01-08

```

**Response:**


```json
{
  "date": "2025-01-08",
  "games": [
    {
      "id": "abc123-def456-ghi789",
      "status": "scheduled",
      "home": { "name": "Lakers", "alias": "LAL" },
      "away": { "name": "Warriors", "alias": "GSW" }
    }
  ]
}
```


```

**Errors:**

- `400` - Invalid date format
- `404` - Schedule not found


### Games


#### Get Game Metadata
```


```bash
GET /api/games/{gameId}

```

Get game metadata (teams, status, venue, etc.).

**Parameters:**

- `gameId` - Game UUID

**Example:**


```bash
curl http://localhost:3000/api/games/abc123-def456-ghi789

```

**Errors:**

- `404` - Game not found

#### Get Game Summary


```bash
GET /api/games/{gameId}/summary

```

Get current game summary (scores, statistics, status).

**Parameters:**

- `gameId` - Game UUID

**Example:**


```bash
curl http://localhost:3000/api/games/abc123-def456-ghi789/summary

```

**Errors:**


- `404` - Summary not found

#### Get Play-by-Play



```bash
GET /api/games/{gameId}/pbp

```

Get play-by-play events for a game.

**Parameters:**

- `gameId` - Game UUID



**Example:**


```bash
curl http://localhost:3000/api/games/abc123-def456-ghi789/pbp

```

**Errors:**

- `404` - Play-by-play not found


## WebSocket API

Connect to `ws://localhost:3000/ws` for real-time game updates.

### Connection

The WebSocket server:

- Accepts connections at `/ws`
- Requires Kafka consumer to be ready (rejects connections if not ready)
- Supports subscription management per connection
- Broadcasts game updates to subscribed clients

### Subscription Messages

Send JSON messages to subscribe/unsubscribe:

#### Subscribe to Specific Game

```json
{
"type": "subscribe",
"gameId": "abc123-def456-ghi789"
}

```

#### Subscribe to All Games

```json
{
"type": "subscribe",
"all": true
}

```

#### Unsubscribe from Specific Game

```json
{
"type": "unsubscribe",
"gameId": "abc123-def456-ghi789"
}

```

#### Unsubscribe from All Games

```json
{
"type": "unsubscribe",
"all": true
}

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
    "home": {
      "name": "Lakers",
      "points": 95
    },
    "away": {
      "name": "Warriors",
      "points": 88
    }

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

If an invalid message is sent or service is unavailable:

```json
{
"type": "error",
"error": "Invalid message format"
}

````

## Configuration

Environment variables (set in `docker-compose.yml` or `.env` file):

### Redis Configuration

```bash
REDIS_HOST=localhost          # Redis host (default: localhost)
REDIS_PORT=6379              # Redis port (default: 6379)
REDIS_PASSWORD=               # Redis password (optional)
````

### Kafka Configuration

```bash
KAFKA_BROKERS=localhost:19092                    # Kafka broker addresses (comma-separated)
KAFKA_CLIENT_ID=nba-api-service                  # Kafka client ID
KAFKA_TOPIC_UPDATES=nba.game.updates              # Kafka topic for game updates
KAFKA_CONSUMER_GROUP_ID=nba-api-consumer-group   # Consumer group ID
```

**Important Notes:**

- When running locally: Use `localhost:19092` (Redpanda external port)
- When running in Docker: Use `redpanda:9092` (Docker hostname)

### API Configuration

```bash
API_PORT=3000                                    # API server port (default: 3000)
CORS_ORIGIN=http://localhost:3001                # CORS allowed origin
```

### Database Configuration (Optional)

For fallback when Redis cache expires:

```bash
DB_HOST=localhost                                # PostgreSQL host
DB_PORT=5433                                     # PostgreSQL port
DB_USER=nba                                      # PostgreSQL user
DB_PASSWORD=nba                                  # PostgreSQL password
DB_NAME=nba                                      # Database name
DB_SSL=false                                     # Enable SSL connection
DB_POOL_SIZE=10                                  # Connection pool size
DB_IDLE_TIMEOUT_MS=30000                         # Idle timeout
DB_CONNECTION_TIMEOUT_MS=5000                    # Connection timeout
```

### Logging Configuration

```bash
LOG_LEVEL=info  # Logging level: trace, debug, info, warn, error, fatal
```

## Development

### Running Locally (Outside Docker)

When running the service locally, ensure infrastructure services are running:

```bash
# Start Redis and Redpanda (from nba-realtime-service)
cd ../nba-realtime-service
docker compose up -d redis redpanda
```

Create a `.env` file in the project root:

```bash
# .env file
KAFKA_BROKERS=localhost:19092  # Use external port for local access
REDIS_HOST=localhost
REDIS_PORT=6379
API_PORT=3000
CORS_ORIGIN=http://localhost:3001
```

Then start the service:

```bash
pnpm run dev
```

**Important:**

- When running locally, use `localhost:19092` for Kafka (the external port), not `redpanda:9092` (which only works inside Docker)
- The service automatically loads environment variables from a `.env` file if present (via `dotenv`)

### Running with Docker Compose

```bash
# Start all services together
docker compose up
```

Docker Compose will automatically:

- Load environment variables from `.env` file if present
- Use correct Docker hostnames (`redpanda:9092`, `redis:6379`)
- Wait for health checks before starting the API service

## Project Structure

```
nba-api-service/
├── src/
│   ├── cache/                    # Redis client and key generation
│   │   ├── keys.ts               # Redis key generation helpers
│   │   ├── redisClient.ts        # Redis connection and client setup
│   │   └── hydrate.ts            # Cache hydration utilities
│   ├── db/                       # PostgreSQL client and repositories
│   │   ├── client.ts             # Database connection
│   │   └── repositories/         # Data access layer
│   │       ├── games.ts
│   │       ├── gameSummaries.ts
│   │       ├── playByPlay.ts
│   │       └── schedules.ts
│   ├── kafka/                    # Kafka consumer implementation
│   │   └── consumer.ts           # Kafka consumer for game updates
│   ├── routes/                   # Express route handlers
│   │   ├── games.ts              # Game endpoints (metadata, summary, pbp)
│   │   └── schedules.ts          # Schedule endpoints
│   ├── types/                    # TypeScript type definitions
│   │   ├── api.ts                # API-specific types (errors, responses)
│   │   ├── messages.ts           # Kafka message types
│   │   └── sportradar.ts         # Sportradar API response types
│   ├── websocket/                # WebSocket server and connection management
│   │   ├── connectionManager.ts  # WebSocket connection tracking and broadcasting
│   │   └── server.ts             # WebSocket server setup
│   ├── config.ts                 # Configuration management (env vars)
│   ├── logger.ts                 # Pino logger setup
│   └── index.ts                  # Application entry point and Express setup
├── dist/                         # Compiled JavaScript (generated)
├── openapi.yaml                  # OpenAPI 3.0 schema documentation
├── docker-compose.yml            # Docker Compose configuration
├── Dockerfile                    # Docker container configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

### Key Components

- **`src/index.ts`**: Main entry point that sets up Express server, WebSocket server, and Kafka consumer
- **`src/routes/`**: REST API route handlers for schedules and games
- **`src/websocket/`**: WebSocket connection management and message broadcasting
- **`src/kafka/`**: Kafka consumer that processes game update messages
- **`src/cache/`**: Redis client and key generation utilities
- **`src/db/`**: PostgreSQL client and repositories for database fallback

## API Documentation

OpenAPI schema is available at `openapi.yaml`. You can view it using tools like:

- [Swagger Editor](https://editor.swagger.io/)
- [Redoc](https://redocly.github.io/redoc/)
- Or any OpenAPI-compatible tool

## Tech Stack

### Runtime & Language

- **Node.js** 20+ - JavaScript runtime environment
- **TypeScript** 5.3+ - Type-safe JavaScript with ES modules
- **ES Modules** - Modern JavaScript module system

### Web Framework

- **Express** 4.18+ - HTTP server framework for REST API endpoints
- **ws** 8.16+ - WebSocket library for real-time connections

### Data & Messaging

- **Redis** (via ioredis 5.3+) - In-memory cache for game data storage
- **Kafka** (via kafkajs 2.2+) - Message broker for consuming game updates
- **PostgreSQL** (via pg 8.11+) - Optional database fallback

### Logging

- **Pino** 8.15+ - High-performance structured JSON logger
- **pino-pretty** 10.2+ - Pretty-printed logs for development

### Development Tools

- **tsx** 4.7+ - TypeScript execution for development (watch mode)
- **ESLint** 8.54+ - Code linting with TypeScript support
- **@typescript-eslint** - TypeScript-specific ESLint rules

### Build & Deployment

- **TypeScript Compiler** - Compiles TypeScript to JavaScript
- **Docker** - Containerization for deployment
- **pnpm** - Fast, disk space efficient package manager

## How It Works

### Startup Sequence

1. **Load Configuration**: Reads environment variables from `.env` file
2. **Connect to Redis**: Establishes connection to Redis cache
3. **Test Database** (optional): Tests PostgreSQL connection if configured
4. **Setup WebSocket Server**: Initializes WebSocket server on HTTP server
5. **Start Kafka Consumer**: Connects to Kafka and subscribes to game updates topic
6. **Start HTTP Server**: Begins listening on configured port
7. **Ready**: Service is ready to accept REST API requests and WebSocket connections

### Message Flow

1. **nba-realtime-service** publishes game update to Kafka topic `nba.game.updates`
2. **Kafka Consumer** receives message and parses it
3. **Message Handler** processes the update (validates, extracts game ID and event type)
4. **Connection Manager** broadcasts update to all subscribed WebSocket clients
5. **WebSocket Clients** receive real-time update message

### Subscription Management

- Each WebSocket connection maintains its own subscription state
- Clients can subscribe to specific games or all games
- Subscriptions are tracked per connection
- When a game update arrives, it's broadcast to all relevant connections

## Troubleshooting

### WebSocket Connection Rejected

If WebSocket connections are rejected with "Kafka consumer not ready":

```bash
# Check Kafka consumer logs
docker compose logs nba-api-service | grep -i kafka

# Verify Kafka/Redpanda is running
docker compose ps redpanda

# Test Kafka connection
docker compose exec nba-api-service node -e "console.log(process.env.KAFKA_BROKERS)"
```

### Redis Connection Issues

```bash
# Check Redis is running
docker compose ps redis

# Test Redis connection
docker compose exec redis redis-cli ping

# Verify Redis configuration
docker compose exec nba-api-service node -e "console.log(process.env.REDIS_HOST)"
```

### Kafka Consumer Not Receiving Messages

```bash
# Check Kafka consumer is connected
docker compose logs nba-api-service | grep -i "consumer"

# Verify Kafka topic exists
docker compose exec redpanda rpk topic list

# Check consumer group
docker compose exec redpanda rpk group describe nba-api-consumer-group
```

### API Endpoints Returning 404

```bash
# Verify data exists in Redis
docker compose exec redis redis-cli KEYS "*"

# Check if nba-realtime-service is publishing updates
docker compose logs nba-realtime-service | grep -i "update published"
```

### Database Connection Errors

```bash
# Check PostgreSQL is running (if using database fallback)
docker compose ps postgres

# Verify connection
docker compose exec postgres psql -U nba -d nba -c "SELECT 1"

# Check database configuration
docker compose exec nba-api-service node -e "console.log(process.env.DB_HOST)"
```

```

## Related Projects

- [nba-realtime-service](../nba-realtime-service/) - Service that polls NBA APIs and publishes to Kafka
- [nba-client-app](../nba-client-app/) - Next.js web application that consumes this API

## License

Private project - see repository for details.

