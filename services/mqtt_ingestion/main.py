import asyncio
import logging
import signal
import sys
import threading
import time
from src.mqtt_client import MQTTClient
from src.redis_writer import RedisWriter
from src.config import config
from src.registry import DeviceRegistry

logging.basicConfig(
    level=getattr(logging, "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class MQTTIngestionService:
    def __init__(self):
        self.running = False
        self.redis_writer = None
        self.mqtt_client = None
        self.registry = None
        self.http_server = None
        self.http_thread = None

        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop()

    def _handle_sensor_data(self, device_id: str, sensor_type: str, value: float):
        """
        This function is called by MQTT client when a message arrives.
        It just passes the data to Redis writer.
        """
        success = self.redis_writer.write_sensor_data(device_id, sensor_type, value)
        if success:
            logger.info(f"Processed {device_id}/{sensor_type}: {value}")
        else:
            logger.error(f"Failed to process {device_id}/{sensor_type}: {value}")

    def start_http_server(self):
        """Start the HTTP ingress sibling (same process, no new service).

        Serves POST /ingest reusing _handle_sensor_data so HTTP entries
        land in mqtt:ingestion field-identical to the MQTT path. A bind
        failure is logged and does NOT stop the MQTT loop.
        """
        if not config.http.enabled:
            logger.info("HTTP ingress disabled (HTTP_INGRESS_ENABLED=0)")
            return True
        try:
            import uvicorn

            from src.http_ingress import create_http_app, http_device_validator
        except ImportError as e:
            logger.error(f"HTTP ingress unavailable (missing dependency): {e}")
            return False

        registry = self.registry
        if registry is not None:
            validator = lambda device_id: http_device_validator(  # noqa: E731
                device_id, registry.is_known
            )
        else:
            validator = None

        app = create_http_app(
            self._handle_sensor_data,
            device_validator=validator,
            on_ingested=self.redis_writer.flush,
        )
        server = uvicorn.Server(
            uvicorn.Config(
                app,
                host=config.http.host,
                port=config.http.port,
                log_level="warning",
            )
        )
        thread = threading.Thread(
            target=asyncio.run, args=(server.serve(),), daemon=True
        )
        thread.start()
        for _ in range(50):
            if getattr(server, "started", False):
                break
            time.sleep(0.1)
        if not getattr(server, "started", False):
            logger.error(
                f"HTTP ingress failed to bind "
                f"{config.http.host}:{config.http.port}; "
                "continuing with MQTT only"
            )
            server.should_exit = True
            return False
        self.http_server = server
        self.http_thread = thread
        logger.info(
            f"HTTP ingress listening on {config.http.host}:{config.http.port}"
        )
        return True

    def start(self):
        """Start the service"""
        logger.info("Starting MQTT Ingestion Service...")

        try:
            self.redis_writer = RedisWriter()

            self.registry = DeviceRegistry(database_url=config.database.url)

            self.mqtt_client = MQTTClient(
                self._handle_sensor_data,
                device_validator=self.registry.is_known,
            )

            if not self.mqtt_client.connect():
                logger.error("Failed to connect to MQTT, exiting")
                return False

            self.start_http_server()

            self.running = True
            logger.info("Service started successfully")

            self.mqtt_client.start_loop()

        except Exception as e:
            logger.error(f"Service startup failed: {e}")
            return False

        return True

    def stop(self):
        """Stop the service gracefully"""
        if not self.running:
            return

        logger.info("Stopping service...")
        self.running = False

        if self.http_server:
            self.http_server.should_exit = True

        if self.mqtt_client:
            self.mqtt_client.stop()

        if self.redis_writer:
            self.redis_writer.close()

        logger.info("Service stopped")

    def health_check(self) -> bool:
        """Check if service is healthy"""
        if not self.running:
            return False

        if not self.redis_writer or not self.redis_writer.health_check():
            return False

        return True


def main():
    """Entry point"""
    service = MQTTIngestionService()

    try:
        success = service.start()
        if not success:
            sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)
    finally:
        service.stop()


if __name__ == "__main__":
    main()
