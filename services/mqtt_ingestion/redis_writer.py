import redis
import logging
from datetime import datetime
from typing import Optional
from config import Payload

class RedisWriter:
    def __init__(self, host: str, port: int, db: int, password: Optional[str] = None):
        self.logger = logging.getLogger(__name__)
        self.redis_client = redis.StrictRedis(host=host, port=port, db=db, password=password)
        try:
            self.redis_client.ping()
            self.logger.info("Connected to Redis server successfully.")
        except redis.ConnectionError as e:
            self.logger.error(f"Failed to connect to Redis server: {e}")
            raise

    def write_message(self, topic: str, payload: Payload):
        """
        Write a message to a Redis stream with the topic and payload.
        - Stream: mqtt_stream: {device_id}:{sensor_type}
        """
        device_id = payload.device_id
        sensor_type = payload.sensor_type
        timestamp = datetime.utcnow().isoformat()
        stream_key= f"mqtt_stream:{device_id}:{sensor_type}"
        stream_data = {
            "value": str(payload),
            "source": "mqtt",
            "timestamp": timestamp
        }
        try:
            message_id = self.redis_client.xadd(stream_key, stream_data,maxlen=1000)
            self.logger.info(f"Message written to Redis: {stream_data}")
            return message_id
        except redis.RedisError as e:
            self.logger.error(f"Failed to write message to Redis: {e}")