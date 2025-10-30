import redis
import logging
from datetime import datetime
from src.config import config

logger = logging.getLogger(__name__)


class RedisWriter:
    def __init__(self):
        """Initialize Redis writer with config from environment"""
        self.logger = logging.getLogger(__name__)
        self.redis_client = redis.StrictRedis(
            host=config.redis.host,
            port=config.redis.port,
            db=config.redis.db,
            password=config.redis.password,
        )
        try:
            self.redis_client.ping()
            self.logger.info(
                f"Connected to Redis at {config.redis.host}:{config.redis.port}"
            )
        except redis.ConnectionError as e:
            self.logger.error(f"Failed to connect to Redis server: {e}")
            raise

    def write_sensor_data(self, device_id: str, sensor_type: str, value: float) -> bool:
        """
        Write sensor data to single Redis stream for all devices.
        - Stream: mqtt:ingestion (single stream for scalability)
        - Hash: mqtt_latest:{device_id} (for quick dashboard access)
        """
        timestamp = datetime.utcnow().isoformat()

        stream_key = "mqtt:ingestion"
        hash_key = f"mqtt_latest:{device_id}"

        stream_data = {
            "device_id": device_id,
            "metric": sensor_type,
            "value": str(value),
            "timestamp": timestamp,
        }

        try:
            # Write to single stream
            self.redis_client.xadd(stream_key, stream_data, maxlen=10000)

            self.redis_client.hset(hash_key, sensor_type, str(value))
            self.redis_client.hset(hash_key, f"{sensor_type}_time", timestamp)

            return True
        except redis.RedisError as e:
            self.logger.error(f"Failed to write to Redis: {e}")
            return False

    def health_check(self) -> bool:
        """Check if Redis connection is healthy"""
        try:
            self.redis_client.ping()
            return True
        except redis.RedisError:
            return False

    def close(self):
        """Close Redis connection"""
        try:
            self.redis_client.close()
            self.logger.info("Redis connection closed")
        except Exception as e:
            self.logger.error(f"Error closing Redis connection: {e}")
