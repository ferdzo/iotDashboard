import redis
import logging
from datetime import datetime
from src.config import config

logger = logging.getLogger(__name__)


class RedisWriter:
    STREAM_KEY = "mqtt:ingestion"

    def __init__(self):
        """Initialize Redis writer with config from environment"""
        self.logger = logging.getLogger(__name__)
        self.redis_client = redis.StrictRedis(
            host=config.redis.host,
            port=config.redis.port,
            db=config.redis.db,
            password=config.redis.password,
        )
        self.maxlen = config.mqtt.maxlen
        self.lag_warn = config.mqtt.lag_warn
        self.pipeline_batch = max(1, config.mqtt.pipeline_batch)
        self._buffer: list[dict] = []
        self.dropped_total = 0
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
        Buffer one sensor reading; flush via pipeline once the batch is full.
        - Stream: mqtt:ingestion (single stream, capped at config maxlen)
        Returns True when buffered/flushed, False only on Redis failure.
        Call flush() (or close()) to drain a partial trailing batch.
        """
        timestamp = datetime.utcnow().isoformat()

        self._buffer.append(
            {
                "device_id": device_id,
                "metric": sensor_type,
                "value": str(value),
                "timestamp": timestamp,
            }
        )
        if len(self._buffer) >= self.pipeline_batch:
            return self.flush()
        return True

    @property
    def pending(self) -> int:
        """Messages buffered but not yet flushed to Redis."""
        return len(self._buffer)

    def flush(self) -> bool:
        """Write all buffered messages in one pipeline round-trip."""
        if not self._buffer:
            return True
        batch, self._buffer = self._buffer, []
        try:
            pipe = self.redis_client.pipeline(transaction=False)
            for entry in batch:
                pipe.xadd(self.STREAM_KEY, entry, maxlen=self.maxlen)
            pipe.execute()

            # Lag signal while the backlog is still recoverable (one XLEN per flush)
            if self.redis_client.xlen(self.STREAM_KEY) > self.lag_warn:
                self.logger.warning(
                    f"Stream {self.STREAM_KEY} backlog above {self.lag_warn} "
                    f"— consumer lagging"
                )

            return True
        except redis.RedisError as e:
            self.dropped_total += len(batch)
            self.logger.error(
                f"Failed to write batch of {len(batch)} to Redis "
                f"(dropped_total={self.dropped_total}): {e}"
            )
            return False

    def health_check(self) -> bool:
        """Check if Redis connection is healthy"""
        try:
            self.redis_client.ping()
            return True
        except redis.RedisError:
            return False

    def close(self):
        """Flush pending writes, then close Redis connection"""
        try:
            self.flush()
        except Exception as e:
            self.logger.error(f"Error flushing pending writes: {e}")
        try:
            self.redis_client.close()
            self.logger.info("Redis connection closed")
        except Exception as e:
            self.logger.error(f"Error closing Redis connection: {e}")
