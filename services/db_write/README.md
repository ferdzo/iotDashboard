# Database Writer Service

A robust, production-ready service that reads sensor data from Redis streams and writes it to PostgreSQL/TimescaleDB. Part of the IoT Dashboard project.

## Features

- ✅ **Reliable consumption** from Redis streams using consumer groups
- ✅ **Batch processing** for high throughput
- ✅ **At-least-once delivery** with message acknowledgments
- ✅ **Dead letter queue** for failed messages
- ✅ **Connection pooling** for database efficiency
- ✅ **Graceful shutdown** handling
- ✅ **Flexible schema** that adapts to changes
- ✅ **Structured logging** with JSON output
- ✅ **Health checks** for monitoring
- ✅ **TimescaleDB support** for time-series optimization

## Architecture

```
Redis Streams → Consumer Group → Transform → Database → Acknowledge
                                     ↓
                              Failed messages
                                     ↓
                            Dead Letter Queue
```

### Components

- **`main.py`**: Service orchestration and processing loop
- **`redis_reader.py`**: Redis stream consumer with fault tolerance
- **`db_writer.py`**: Database operations with connection pooling
- **`schema.py`**: Data transformation and validation
- **`config.py`**: Configuration management

## Quick Start

### Prerequisites

- Python 3.13+
- [uv](https://github.com/astral-sh/uv) package manager
- Redis server with streams
- PostgreSQL or TimescaleDB

### Installation

1. **Navigate to the service directory**:
   ```bash
   cd services/db_write
   ```

2. **Copy and configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL and other settings
   ```

3. **Install dependencies**:
   ```bash
   uv sync
   ```

4. **Setup database schema** (IMPORTANT - do this before running):
   ```bash
   # Review the schema in models.py first
   cat models.py
   
   # Create initial migration
   chmod +x migrate.sh
   ./migrate.sh create "initial schema"
   
   # Review the generated migration
   ls -lt alembic/versions/
   
   # Apply migrations
   ./migrate.sh upgrade
   ```

5. **Run the service**:
   ```bash
   uv run main.py
   ```

   Or use the standalone script:
   ```bash
   chmod +x run-standalone.sh
   ./run-standalone.sh
   ```

### ⚠️ Important: Schema Management

This service uses **Alembic** for database migrations. The service will NOT create tables automatically.

- Schema is defined in `models.py`
- Migrations are managed with `./migrate.sh` or `alembic` commands
- See `SCHEMA_MANAGEMENT.md` for detailed guide

## Schema Management

This service uses **SQLAlchemy** for models and **Alembic** for migrations.

### Key Files

- **`models.py`**: Define your database schema here (SQLAlchemy models)
- **`alembic/`**: Migration scripts directory
- **`migrate.sh`**: Helper script for common migration tasks
- **`SCHEMA_MANAGEMENT.md`**: Comprehensive migration guide

### Quick Migration Commands

```bash
# Create a new migration after editing models.py
./migrate.sh create "add new column"

# Apply pending migrations
./migrate.sh upgrade

# Check migration status
./migrate.sh check

# View migration history
./migrate.sh history

# Rollback last migration
./migrate.sh downgrade 1
```

**See `SCHEMA_MANAGEMENT.md` for detailed documentation.**

## Configuration

All configuration is done via environment variables. See `.env.example` for all available options.

### Required Settings

```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379

# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/iot_dashboard
```

### Optional Settings

```bash
# Consumer configuration
CONSUMER_GROUP_NAME=db_writer      # Consumer group name
CONSUMER_NAME=worker-01            # Unique consumer name
BATCH_SIZE=100                     # Messages per batch
BATCH_TIMEOUT_SEC=5                # Read timeout
PROCESSING_INTERVAL_SEC=1          # Delay between batches

# Stream configuration
STREAM_PATTERN=mqtt_stream:*       # Stream name pattern
DEAD_LETTER_STREAM=mqtt_stream:failed

# Database
TABLE_NAME=sensor_readings         # Target table name
ENABLE_TIMESCALE=false             # Use TimescaleDB features

# Logging
LOG_LEVEL=INFO                     # DEBUG, INFO, WARNING, ERROR
LOG_FORMAT=json                    # json or console
```

## Data Flow

### Input (Redis Streams)

The service reads from Redis streams with the format:
```
mqtt_stream:{device_id}:{sensor_type}
```

Each message contains:
```
{
  "value": "23.5",
  "timestamp": "2023-10-18T14:30:00Z",
  "metadata": "{...}" (optional)
}
```

### Output (Database)

Data is written to the `sensor_readings` table:

```sql
CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    sensor_type VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note**: The table is automatically created if it doesn't exist.

## Running with Docker

### Build the image

```bash
docker build -t db-writer:latest .
```

### Run the container

```bash
docker run -d \
  --name db-writer \
  -e REDIS_HOST=redis \
  -e DATABASE_URL=postgresql://user:pass@postgres:5432/iot \
  db-writer:latest
```

## Consumer Groups

The service uses Redis consumer groups for reliable, distributed processing:

- **Multiple instances**: Run multiple workers for load balancing
- **Fault tolerance**: Messages are not lost if a consumer crashes
- **Acknowledgments**: Messages are only removed after successful processing
- **Pending messages**: Unacknowledged messages can be reclaimed

### Running Multiple Workers

```bash
# Terminal 1
CONSUMER_NAME=worker-01 uv run main.py

# Terminal 2
CONSUMER_NAME=worker-02 uv run main.py
```

All workers in the same consumer group will share the load.

## Error Handling

### Dead Letter Queue

Failed messages are sent to the dead letter stream (`mqtt_stream:failed`) with error information:

```
{
  "original_stream": "mqtt_stream:esp32:temperature",
  "original_id": "1634567890123-0",
  "device_id": "esp32",
  "sensor_type": "temperature",
  "value": "23.5",
  "error": "Database connection failed",
  "failed_at": "1634567890.123"
}
```

### Retry Strategy

- **Transient errors**: Automatic retry with backoff
- **Data errors**: Immediate send to DLQ
- **Connection errors**: Reconnection attempts

## Monitoring

### Health Checks

Check service health programmatically:

```python
from main import DatabaseWriterService

service = DatabaseWriterService()
health = service.health_check()
print(health)
# {
#   'running': True,
#   'redis': True,
#   'database': True,
#   'stats': {...}
# }
```

### Logs

The service outputs structured logs:

```json
{
  "event": "Processed batch",
  "rows_written": 100,
  "messages_acknowledged": 100,
  "timestamp": "2023-10-18T14:30:00Z",
  "level": "info"
}
```

### Statistics

Runtime statistics are tracked:
- `messages_read`: Total messages consumed
- `messages_written`: Total rows inserted
- `messages_failed`: Failed messages sent to DLQ
- `batches_processed`: Number of successful batches
- `errors`: Total errors encountered

## Development

### Project Structure

```
db_write/
├── config.py          # Configuration management
├── db_writer.py       # Database operations
├── redis_reader.py    # Redis stream consumer
├── schema.py          # Data models and transformation
├── main.py            # Service entry point
├── pyproject.toml     # Dependencies
├── .env.example       # Configuration template
└── README.md          # This file
```

### Adding Dependencies

```bash
uv add package-name
```

### Running Tests

```bash
uv run pytest
```

## Troubleshooting

### Service won't start

1. **Check configuration**: Verify all required environment variables are set
2. **Test connections**: Ensure Redis and PostgreSQL are accessible
3. **Check logs**: Look for specific error messages

### No messages being processed

1. **Check streams exist**: `redis-cli KEYS "mqtt_stream:*"`
2. **Verify consumer group**: The service creates it automatically, but check Redis logs
3. **Check stream pattern**: Ensure `STREAM_PATTERN` matches your stream names

### Messages going to dead letter queue

1. **Check DLQ**: `redis-cli XRANGE mqtt_stream:failed - + COUNT 10`
2. **Review error messages**: Each DLQ entry contains the error reason
3. **Validate data format**: Ensure messages match expected schema

### High memory usage

1. **Reduce batch size**: Lower `BATCH_SIZE` in configuration
2. **Check connection pool**: May need to adjust pool size
3. **Monitor pending messages**: Use `XPENDING` to check backlog

## Performance Tuning

### Throughput Optimization

- **Increase batch size**: Process more messages per batch
- **Multiple workers**: Run multiple consumer instances
- **Connection pooling**: Adjust pool size based on load
- **Processing interval**: Reduce delay between batches

### Latency Optimization

- **Decrease batch size**: Process smaller batches more frequently
- **Reduce timeout**: Lower `BATCH_TIMEOUT_SEC`
- **Single worker**: Avoid consumer group coordination overhead

## Production Deployment

### Recommended Settings

```bash
BATCH_SIZE=500
PROCESSING_INTERVAL_SEC=0.1
LOG_LEVEL=INFO
LOG_FORMAT=json
ENABLE_TIMESCALE=true
```

### Monitoring

- Monitor consumer lag using Redis `XPENDING`
- Track database insert latency
- Alert on error rate > 5%
- Monitor DLQ depth

### Scaling

1. **Horizontal**: Add more consumer instances with unique `CONSUMER_NAME`
2. **Vertical**: Increase resources for database writes
3. **Database**: Use TimescaleDB for better time-series performance

## License

Part of the IoT Dashboard project.
