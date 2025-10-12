import logging
import signal
import sys
from config import config
from mqtt_client import MQTTClient
from redis_writer import RedisWriter

# Setup logging
logging.basicConfig(
    level=getattr(logging,'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MQTTIngestionService:
    def __init__(self):
        self.running = False
        self.redis_writer = None
        self.mqtt_client = None
        
        # Setup signal handlers for graceful shutdown
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
    
    def start(self):
        """Start the service"""
        logger.info("Starting MQTT Ingestion Service...")
        
        try:
            # Initialize Redis writer
            self.redis_writer = RedisWriter()
            
            # Initialize MQTT client with our message handler
            self.mqtt_client = MQTTClient(self._handle_sensor_data)
            
            # Connect to MQTT
            if not self.mqtt_client.connect():
                logger.error("Failed to connect to MQTT, exiting")
                return False
            
            self.running = True
            logger.info("Service started successfully")
            
            # Start MQTT loop (this blocks)
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
        
        # Stop MQTT client
        if self.mqtt_client:
            self.mqtt_client.stop()
        
        # Close Redis connection
        if self.redis_writer:
            self.redis_writer.close()
        
        logger.info("Service stopped")
    
    def health_check(self) -> bool:
        """Check if service is healthy"""
        if not self.running:
            return False
            
        # Check Redis connection
        if not self.redis_writer or not self.redis_writer.health_check():
            return False
            
        return True

def main():
    """Entry point"""
    service = MQTTIngestionService(
        redis_config=config.redis,
        mqtt_config=config.mqtt
    )
    
    try:
        # Start the service (blocks until shutdown)
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
