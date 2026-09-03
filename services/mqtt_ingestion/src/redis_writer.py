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
        - Stream: mqtt:ingestion (single stream, capped at 100k entries)
        """
        timestamp = datetime.utcnow().isoformat()

        stream_key = "mqtt:ingestion"

        stream_data = {
            "device_id": device_id,
            "metric": sensor_type,
            "value": str(value),
            "timestamp": timestamp,
        }

        try:
            # Bounded stream; backlog beyond the cap loses oldest first
            self.redis_client.xadd(stream_key, stream_data, maxlen=100000)

            # Lag signal while the backlog is still recoverable
            if self.redis_client.xlen(stream_key) > 50000:
                self.logger.warning(
                    f"Stream {stream_key} backlog above 50k — consumer lagging"
                )

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
