import redis
import logging
from typing import List, Optional, Dict
from src.config import config
from src.schema import SchemaHandler, StreamMessage


class RedisReader:
    """Redis stream consumer with consumer groups for reliability"""

    def __init__(self, stream_name: str = "mqtt:ingestion"):
        self.logger = logging.getLogger(__name__)
        self.schema_handler = SchemaHandler()

        self.redis_client = redis.StrictRedis(
            host=config.redis.host,
            port=config.redis.port,
            db=config.redis.db,
            password=config.redis.password,
            decode_responses=False,
        )

        self.redis_client.ping()
        self.logger.info(
            f"Connected to Redis at {config.redis.host}:{config.redis.port}"
        )

        # Use single stream instead of pattern matching
        self.stream_name = stream_name
        self.logger.info(f"Monitoring stream: {self.stream_name}")

        # Initialize consumer group for the single stream
        self._setup_consumer_group()

    def _setup_consumer_group(self):
        """Create consumer group for the single stream"""
        group_name = config.consumer.group_name
        try:
            self.redis_client.xgroup_create(
                self.stream_name, group_name, id="0", mkstream=True
            )
            self.logger.info(
                f"Created consumer group '{group_name}' for '{self.stream_name}'"
            )
        except redis.exceptions.ResponseError as e:
            if "BUSYGROUP" in str(e):
                self.logger.debug(
                    f"Consumer group '{group_name}' already exists for '{self.stream_name}'"
                )
            else:
                self.logger.error(f"Error creating consumer group: {e}")

    def read_batch(
        self, batch_size: Optional[int] = None, timeout_ms: Optional[int] = None
    ) -> List[StreamMessage]:
        """Read a batch of messages from single stream using consumer group"""
        if batch_size is None:
            batch_size = config.consumer.batch_size
        if timeout_ms is None:
            timeout_ms = config.consumer.block_time_ms

        # Read from single stream - much simpler!
        stream_dict = {self.stream_name: ">"}

        try:
            results = self.redis_client.xreadgroup(
                groupname=config.consumer.group_name,
                consumername=config.consumer.consumer_name,
                streams=stream_dict,
                count=batch_size,
                block=timeout_ms,
            )

            if not results:
                return []

            # Parse results into StreamMessage objects
            messages = []
            for stream_key, entries in results:
                for message_id, fields in entries:
                    msg_id = (
                        message_id.decode("utf-8")
                        if isinstance(message_id, bytes)
                        else message_id
                    )

                    # Parse with new format (device_id and metric in payload)
                    stream_msg = self.schema_handler.parse_stream_entry_new_format(
                        self.stream_name, msg_id, fields
                    )
                    if stream_msg:
                        messages.append(stream_msg)

            if messages:
                self.logger.debug(f"Read {len(messages)} messages")

            return messages

        except Exception as e:
            self.logger.error(f"Error reading from Redis: {e}")
            return []

    def acknowledge_batch(self, messages: List[StreamMessage]) -> int:
        """Acknowledge multiple messages at once"""
        ack_count = 0

        # Group messages by stream
        by_stream: Dict[str, List[str]] = {}
        for msg in messages:
            if msg.stream_key not in by_stream:
                by_stream[msg.stream_key] = []
            by_stream[msg.stream_key].append(msg.message_id)

        # Acknowledge each stream's messages
        for stream_key, message_ids in by_stream.items():
            try:
                result = self.redis_client.xack(
                    stream_key, config.consumer.group_name, *message_ids
                )
                ack_count += result
            except Exception as e:
                self.logger.error(
                    f"Failed to acknowledge messages from {stream_key}: {e}"
                )

        if ack_count > 0:
            self.logger.debug(f"Acknowledged {ack_count} messages")

        return ack_count

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
