# MQTT Ingestion Service

Subscribes to MQTT topics and writes telemetry data to Redis streams for downstream processing.

## Purpose

This service acts as the bridge between MQTT devices and the data pipeline. It:
- Connects to Mosquitto MQTT broker
- Subscribes to device topics using wildcard pattern
- Parses incoming messages
- Writes structured data to Redis stream

## Architecture

```
MQTT Broker (port 8883)
        |
        v
+-------------------+
| mqtt_ingestion    |
| - MQTT subscriber |
| - Topic parser    |
| - Redis writer    |
+-------------------+
        |
        v
Redis Stream: mqtt:ingestion
```

## Topic Format

Devices publish to: `devices/{device_id}/{metric}`

Examples:
- `devices/a1b2c3d4/temperature` - Temperature reading
- `devices/a1b2c3d4/humidity` - Humidity reading
- `devices/a1b2c3d4/heart_rate` - Health metric

The service subscribes to `devices/#` to receive all device messages.

## Redis Stream Format

Each message written to `mqtt:ingestion` contains:

| Field | Type | Description |
|-------|------|-------------|
| device_id | string | 8-character device identifier |
| metric | string | Metric name (temperature, humidity, etc.) |
| value | string | Metric value (stored as string) |
| timestamp | string | ISO 8601 timestamp |

Example:
```json
{
  "device_id": "a1b2c3d4",
  "metric": "temperature",
  "value": "23.5",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Configuration

Environment variables (`.env` file):

| Variable | Description | Default |
|----------|-------------|---------|
| MQTT_HOST | MQTT broker hostname | localhost |
| MQTT_PORT | MQTT broker port | 8883 |
| REDIS_HOST | Redis hostname | localhost |
| REDIS_PORT | Redis port | 6379 |

## Running

```bash
cd services/mqtt_ingestion
uv sync
uv run main.py
```

## Key Files

| File | Purpose |
|------|---------|
| `main.py` | Entry point, service initialization |
| `src/mqtt_client.py` | MQTT connection and subscription logic |
| `src/redis_writer.py` | Redis stream writing |

## Error Handling

- Invalid topics (not matching `devices/{id}/{metric}`) are logged and dropped
- Connection failures trigger automatic reconnection
- Redis write failures are logged (messages may be lost)

## Integration Points

- **Upstream**: Mosquitto MQTT broker with mTLS
- **Downstream**: Redis stream consumed by db_write service