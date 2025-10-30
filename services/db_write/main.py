"""
Main entry point for the database writer service.
Orchestrates the read → transform → write cycle with error handling.
"""

import logging
import signal
import sys
import time
import structlog
from typing import List

from src.config import config
from src.redis_reader import RedisReader
from src.db_writer import DatabaseWriter
from src.schema import SchemaHandler, StreamMessage, TelemetryReading


def configure_logging():
    """Configure structured logging"""
    if config.log.format == "json":
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )

    logging.basicConfig(
        level=getattr(logging, config.log.level.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


class DatabaseWriterService:
    """Main service class that orchestrates the data pipeline"""

    def __init__(self):
        self.running = False
        self.redis_reader: RedisReader = None
        self.db_writer: DatabaseWriter = None
        self.schema_handler: SchemaHandler = None
        self.logger = logging.getLogger(__name__)

        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)

        self.stats = {
            "messages_read": 0,
            "messages_written": 0,
            "messages_failed": 0,
            "batches_processed": 0,
            "errors": 0,
        }

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.stop()

    def start(self) -> bool:
        """Start the service"""
        self.logger.info("Starting Database Writer Service...")

        try:
            config.validate()
            self.logger.info("Configuration validated successfully")

            self.schema_handler = SchemaHandler()
            self.logger.info("Schema handler initialized")

            self.redis_reader = RedisReader()
            self.logger.info("Redis reader initialized")

            self.db_writer = DatabaseWriter()
            self.logger.info("Database writer initialized")

            # Start the processing loop
            self.running = True
            self.logger.info("Service started successfully, entering processing loop")

            self._processing_loop()

            return True

        except Exception as e:
            self.logger.error(f"Service startup failed: {e}", exc_info=True)
            return False

    def _processing_loop(self):
        """Main processing loop"""
        consecutive_errors = 0
        max_consecutive_errors = 5

        while self.running:
            try:
                # Read batch from Redis
                messages = self.redis_reader.read_batch()

                if not messages:
                    # No messages, sleep briefly
                    time.sleep(config.consumer.processing_interval_sec)
                    continue

                self.stats["messages_read"] += len(messages)
                self.logger.debug(f"Read {len(messages)} messages from Redis")

                # Transform messages to sensor readings
                readings = self._transform_messages(messages)

                if not readings:
                    self.logger.warning("No valid readings after transformation")
                    # Acknowledge the messages anyway (they were invalid)
                    self.redis_reader.acknowledge_batch(messages)
                    continue

                # Write to database
                success = self.db_writer.write_batch(readings)

                if success:
                    # Successfully written, acknowledge the messages
                    ack_count = self.redis_reader.acknowledge_batch(messages)
                    self.stats["messages_written"] += len(readings)
                    self.stats["batches_processed"] += 1
                    consecutive_errors = 0

                    self.logger.info(
                        f"Processed batch: {len(readings)} readings written, "
                        f"{ack_count} messages acknowledged"
                    )
                else:
                    # Write failed, log error and acknowledge to prevent blocking
                    self.logger.error(
                        f"Failed to write batch of {len(readings)} readings"
                    )
                    # Acknowledge anyway so they don't block the queue
                    self.redis_reader.acknowledge_batch(messages)
                    self.stats["messages_failed"] += len(messages)
                    self.stats["errors"] += 1
                    consecutive_errors += 1

                # Check for too many consecutive errors
                if consecutive_errors >= max_consecutive_errors:
                    self.logger.error(
                        f"Too many consecutive errors ({consecutive_errors}), "
                        "pausing for 30 seconds"
                    )
                    time.sleep(30)
                    consecutive_errors = 0

                # Brief pause between batches
                if config.consumer.processing_interval_sec > 0:
                    time.sleep(config.consumer.processing_interval_sec)

            except KeyboardInterrupt:
                self.logger.info("Keyboard interrupt received")
                break
            except Exception as e:
                self.logger.error(f"Error in processing loop: {e}", exc_info=True)
                self.stats["errors"] += 1
                consecutive_errors += 1
                time.sleep(5)  # Back off on errors

        self.logger.info("Processing loop terminated")

    def _transform_messages(
        self, messages: List[StreamMessage]
    ) -> List[TelemetryReading]:
        """Transform stream messages to sensor readings"""
        readings = []

        for msg in messages:
            reading = self.schema_handler.transform_message(msg)
            if reading:
                readings.append(reading)
            else:
                self.logger.warning(
                    f"Failed to transform message {msg.message_id} from {msg.stream_key}"
                )

        return readings

    def stop(self):
        """Stop the service gracefully"""
        if not self.running:
            return

        self.logger.info("Stopping service...")
        self.running = False

        # Print final statistics
        self.logger.info(
            f"Final statistics: "
            f"messages_read={self.stats['messages_read']}, "
            f"messages_written={self.stats['messages_written']}, "
            f"messages_failed={self.stats['messages_failed']}, "
            f"batches_processed={self.stats['batches_processed']}, "
            f"errors={self.stats['errors']}"
        )

        # Close connections
        if self.redis_reader:
            self.redis_reader.close()

        if self.db_writer:
            self.db_writer.close()

        self.logger.info("Service stopped")

    def health_check(self) -> dict:
        """Check service health"""
        health = {
            "running": self.running,
            "redis": False,
            "database": False,
            "stats": self.stats,
        }

        if self.redis_reader:
            health["redis"] = self.redis_reader.health_check()

        if self.db_writer:
            health["database"] = self.db_writer.health_check()

        return health


def main():
    """Entry point"""
    # Configure logging
    configure_logging()
    logger = logging.getLogger(__name__)

    logger.info("=" * 60)
    logger.info("Database Writer Service")
    logger.info(f"Consumer Group: {config.consumer.group_name}")
    logger.info(f"Consumer Name: {config.consumer.consumer_name}")
    logger.info(f"Batch Size: {config.consumer.batch_size}")
    logger.info(f"Stream Pattern: {config.stream.pattern}")
    logger.info("=" * 60)

    service = DatabaseWriterService()

    try:
        success = service.start()
        if not success:
            logger.error("Service failed to start")
            sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        service.stop()

    logger.info("Service exited")


if __name__ == "__main__":
    main()
