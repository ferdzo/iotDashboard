import logging
import paho.mqtt.client as mqtt
from typing import Callable
from config import config

logger = logging.getLogger(__name__)

class MQTTClient:
    def __init__(self, message_handler: Callable[[str, str, float], None]):
        """
        Args:
            message_handler: Function that takes (device_id, sensor_type, value)
        """
        self.message_handler = message_handler
        self.client = mqtt.Client()
        self._setup_callbacks()
        
    def _setup_callbacks(self):
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        
        if config.mqtt.username:
            self.client.username_pw_set(
                config.mqtt.username, 
                config.mqtt.password
            )
    
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info(f"Connected to MQTT broker {config.mqtt.broker}")
            client.subscribe(config.mqtt.topic_pattern)
            logger.info(f"Subscribed to {config.mqtt.topic_pattern}")
        else:
            logger.error(f"Failed to connect to MQTT broker, code: {rc}")
    
    def _on_message(self, client, userdata, msg):
        try:
            topic_parts = msg.topic.split('/')
            if len(topic_parts) != 3 or topic_parts[0] != 'devices':
                logger.warning(f"Invalid topic format: {msg.topic}")
                return
                
            device_id = topic_parts[1]
            sensor_type = topic_parts[2]
            
            try:
                value = float(msg.payload.decode())
            except ValueError:
                logger.error(f"Invalid payload for {msg.topic}: {msg.payload}")
                return
            
            self.message_handler(device_id, sensor_type, value)
            
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
    
    def _on_disconnect(self, client, userdata, rc):
        if rc != 0:
            logger.warning("Unexpected MQTT disconnection")
        else:
            logger.info("MQTT client disconnected")
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client.connect(
                config.mqtt.broker, 
                config.mqtt.port, 
                config.mqtt.keepalive
            )
            return True
        except Exception as e:
            logger.error(f"Failed to connect to MQTT: {e}")
            return False
    
    def start_loop(self):
        """Start the MQTT loop (blocking)"""
        self.client.loop_forever()
    
    def stop(self):
        """Stop the MQTT client"""
        self.client.disconnect()