"""MQTT command publisher for the device_manager BFF actuation path.

Publishes device commands QoS1 to ``devices/{device_id}/commands/{action}``
using a dedicated mTLS command client identity (separate from the ingestion
identity), following the ``tls_set`` pattern in
``services/mqtt_ingestion/src/mqtt_client.py``.

Retained messages are never used here: commands carry an explicit expiry and
must not linger on the broker as last-desired-state.
"""

import json
import logging
import ssl
from typing import Any

import paho.mqtt.client as mqtt

from app.config import config

logger = logging.getLogger(__name__)

COMMAND_QOS = 1


def build_command_topic(device_id: str, action: str) -> str:
    return f"devices/{device_id}/commands/{action}"


def publish_command(
    device_id: str,
    action: str,
    payload: dict[str, Any],
    timeout_sec: int = 10,
) -> None:
    """Publish one command message QoS1 (no retain) and return.

    Raises:
        RuntimeError: if the broker connection or publish fails.
    """
    topic = build_command_topic(device_id, action)
    body = json.dumps(payload)

    client = mqtt.Client()
    try:
        if config.MQTT_TLS:
            if not config.MQTT_CA_CERT:
                raise RuntimeError("MQTT_TLS is set but MQTT_CA_CERT is missing")
            # Same tls_set shape as the ingestion client; identity here is
            # the dedicated command certificate (MQTT_COMMAND_CERT/KEY),
            # not the ingestion one.
            client.tls_set(
                ca_certs=config.MQTT_CA_CERT,
                certfile=config.MQTT_COMMAND_CERT,
                keyfile=config.MQTT_COMMAND_KEY,
                tls_version=ssl.PROTOCOL_TLS_CLIENT,
            )
        rc = client.connect(config.MQTT_BROKER, config.MQTT_PORT, keepalive=60)
        if rc != 0:
            raise RuntimeError(f"MQTT connect returned rc={rc}")
        # QoS1 needs the network loop to receive the PUBACK.
        client.loop_start()
        try:
            info = client.publish(topic, body, qos=COMMAND_QOS, retain=False)
            info.wait_for_publish(timeout=timeout_sec)
            if not info.is_published():
                raise RuntimeError("MQTT publish not acknowledged within timeout")
        finally:
            client.loop_stop()
        logger.info(
            f"Published command to {topic} "
            f"(req_id={payload.get('req_id')}, qos={COMMAND_QOS})"
        )
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"MQTT command publish failed: {e}") from e
    finally:
        try:
            client.disconnect()
        except Exception:
            pass
