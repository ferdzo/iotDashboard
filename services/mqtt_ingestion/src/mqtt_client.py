import logging
import math
import ssl
import paho.mqtt.client as mqtt
from typing import Callable
from src.config import config

logger = logging.getLogger(__name__)


class MQTTClient:
    def __init__(
        self,
        message_handler: Callable[[str, str, float], None],
        device_validator: Callable[[str], bool] = None,
    ):
        """
        Args:
            message_handler: Function that takes (device_id, sensor_type, value)
            device_validator: Optional predicate taking device_id; messages from
                devices it rejects are dropped before dispatch.
        """
        self.message_handler = message_handler
        self.device_validator = device_validator
        self.dropped_total = 0
        self.client = mqtt.Client()
        self._setup_callbacks()

    def _setup_callbacks(self):
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect

        if config.mqtt.username:
            self.client.username_pw_set(config.mqtt.username, config.mqtt.password)

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info(f"Connected to MQTT broker {config.mqtt.broker}")
            client.subscribe(config.mqtt.topic_pattern)
            logger.info(f"Subscribed to {config.mqtt.topic_pattern}")
        else:
            logger.error(f"Failed to connect to MQTT broker, code: {rc}")

    def _on_message(self, client, userdata, msg):
        try:
            topic_parts = msg.topic.split("/")
            if len(topic_parts) != 3 or topic_parts[0] != "devices":
                self.dropped_total += 1
                logger.warning(
                    f"Dropping message with invalid topic shape: {msg.topic} "
                    f"(reason=invalid-topic-shape "
                    f"dropped_total={self.dropped_total})"
                )
                return

            device_id = topic_parts[1]
            sensor_type = topic_parts[2]

            if not device_id or not device_id.strip():
                self.dropped_total += 1
                logger.warning(
                    f"Dropping message with empty device_id: {msg.topic} "
                    f"(reason=empty-device-id "
                    f"dropped_total={self.dropped_total})"
                )
                return

            if not sensor_type or not sensor_type.strip():
                self.dropped_total += 1
                logger.warning(
                    f"Dropping message with empty metric: {msg.topic} "
                    f"(reason=empty-metric "
                    f"dropped_total={self.dropped_total})"
                )
                return

            if self.device_validator is not None and not self.device_validator(device_id):
                self.dropped_total += 1
                logger.warning(
                    f"Dropping message from unknown/inactive device: {device_id} "
                    f"(reason=unknown-device "
                    f"dropped_total={self.dropped_total})"
                )
                return

            try:
                value = float(msg.payload.decode())
            except (ValueError, UnicodeDecodeError):
                self.dropped_total += 1
                logger.warning(
                    f"Dropping message with invalid payload for {msg.topic}: "
                    f"{msg.payload!r} (reason=invalid-payload "
                    f"dropped_total={self.dropped_total})"
                )
                return

            if not math.isfinite(value):
                self.dropped_total += 1
                logger.warning(
                    f"Dropping message with non-finite value for {msg.topic}: "
                    f"{value!r} (reason=non-finite-value "
                    f"dropped_total={self.dropped_total})"
                )
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
        """Connect to MQTT broker (TLS when MQTT_TLS is set)"""
        try:
            if config.mqtt.tls:
                if not config.mqtt.ca_cert:
                    logger.error("MQTT_TLS is set but MQTT_CA_CERT is missing")
                    return False
                self.client.tls_set(
                    ca_certs=config.mqtt.ca_cert,
                    certfile=config.mqtt.client_cert,
                    keyfile=config.mqtt.client_key,
                    tls_version=ssl.PROTOCOL_TLS_CLIENT,
                )
            self.client.connect(
                config.mqtt.broker, config.mqtt.port, config.mqtt.keepalive
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
