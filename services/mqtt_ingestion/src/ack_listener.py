"""Device ack listener (todo 8): status topics → command_log transitions.

Subscribes ``devices/+/status`` and consumes payloads of the form::

    {"req_id": "<uuid>", "status": "acked" | "failed", "detail": "..."}

- ``requested`` rows transition to ``acked``/``failed`` with ``acked_at=now()``.
  On ``failed`` (or any ack carrying ``detail``) the detail is merged into the
  row's ``payload`` JSON under ``ack_detail``; the original command payload
  keys are preserved (audit trail intact, rows never deleted).
- Unknown ``req_id`` → warning log, message ignored (no crash).
- Malformed topic/payload (bad JSON, missing ``req_id``, unknown ``status``
  value) → warning log + drop counter, loop stays alive.
- Only ``state='requested'`` rows transition; terminal states
  (``acked``/``failed``/``expired``) are never regressed, so the listener can
  never resurrect an expired command.

Co-location: runs in the same mqtt_ingestion process as the todo-9 expiry
sweep (see ``src/expiry_sweep.py::create_expiry_sweep``). It shares the DB
URL / broker config but owns its own MQTT connection — ``mqtt_client.py``
(the telemetry path) is intentionally untouched, and no second sweep loop is
created here. Every per-message failure is isolated: ``_on_message`` never
raises, so ack processing can never block or kill the telemetry loop.
"""

import json
import logging
import ssl

import paho.mqtt.client as mqtt
import psycopg2
from psycopg2.extras import Json

from src.config import config

logger = logging.getLogger(__name__)

#: Status subscription (sibling of the telemetry ``devices/#`` pattern —
#: ``devices/{id}/status`` also matches ``devices/#``, so the telemetry
#: client will drop-log these as invalid payloads; harmless, see module doc
#: of mqtt_client).
ACK_TOPIC = "devices/+/status"
ACK_QOS = 1

#: Accepted device status words (case-insensitive, whitespace-tolerant).
ACKED_VALUES = {"acked", "ack", "ok", "success", "done"}
FAILED_VALUES = {"failed", "fail", "error", "nack", "rejected"}


def normalize_status(status) -> str:
    """Map a device status word to a command_log state.

    Returns ``'acked'`` or ``'failed'``. Raises ``ValueError`` for anything
    else (missing, non-string, or unknown word) — callers treat that as a
    malformed ack: warn + ignore, never a transition.
    """
    if not isinstance(status, str):
        raise ValueError(f"status must be a string, got {type(status).__name__}")
    word = status.strip().lower()
    if word in ACKED_VALUES:
        return "acked"
    if word in FAILED_VALUES:
        return "failed"
    raise ValueError(f"unknown status value: {status!r}")


def apply_ack(database_url: str, req_id, status, detail=None) -> tuple:
    """Apply one device ack to ``command_log``.

    Args:
        database_url: Postgres DSN (shared config with the expiry sweep).
        req_id: Command request id from the ack payload.
        status: Raw device status word (mapped via :func:`normalize_status`).
        detail: Optional free-form detail; merged into the row payload as
            ``ack_detail`` when present (original keys preserved).

    Returns:
        A ``(state, transitioned)`` tuple: ``state`` is the new state
        (``'acked'``/``'failed'``), the unchanged terminal state when the
        row was already settled, or ``None`` when ``req_id`` is unknown;
        ``transitioned`` is True only when this call performed the
        ``requested`` → terminal UPDATE. Raises ``ValueError`` on bad input
        and propagates DB errors (the MQTT callback catches, logs, and
        isolates them).
    """
    if not database_url:
        raise ValueError("database_url is required for the ack listener")
    if not isinstance(req_id, str) or not req_id.strip():
        raise ValueError(f"req_id must be a non-empty string, got {req_id!r}")
    new_state = normalize_status(status)

    conn = psycopg2.connect(database_url, connect_timeout=5)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT state, payload FROM command_log WHERE req_id = %s",
                (req_id,),
            )
            row = cur.fetchone()
            if row is None:
                logger.warning(f"Ignoring ack for unknown req_id: {req_id!r}")
                conn.rollback()
                return None, False
            state, payload = row
            if state != "requested":
                logger.info(
                    f"Ignoring ack for already-settled req_id {req_id!r} "
                    f"(state={state})"
                )
                conn.rollback()
                return state, False
            merged = dict(payload) if isinstance(payload, dict) else {}
            if detail is not None:
                merged["ack_detail"] = detail
            cur.execute(
                "UPDATE command_log SET state = %s, acked_at = now(), "
                "payload = %s WHERE req_id = %s",
                (new_state, Json(merged), req_id),
            )
        conn.commit()
    finally:
        conn.close()
    logger.info(f"Command {req_id} transitioned requested->{new_state}")
    return new_state, True


class AckListener:
    """Background MQTT subscriber applying device acks to ``command_log``.

    Owns a dedicated paho client on ``devices/+/status`` (QoS 1) running
    ``loop_start`` in a daemon thread, so ``start()`` never blocks the
    telemetry ``loop_forever`` in the same process. ``stop()`` disconnects
    cleanly. Message handling never raises out of the MQTT thread.
    """

    def __init__(
        self,
        database_url: str | None = None,
        broker: str | None = None,
        port: int | None = None,
    ):
        self.database_url = database_url or config.database.url
        if not self.database_url:
            raise ValueError("database_url is required for the ack listener")
        self.broker = broker or config.mqtt.broker
        self.port = port or config.mqtt.port
        self.client = mqtt.Client()
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        if config.mqtt.username:
            self.client.username_pw_set(config.mqtt.username, config.mqtt.password)
        self.acked_total = 0
        self.failed_total = 0
        self.unknown_total = 0
        self.settled_total = 0
        self.dropped_total = 0
        self.error_total = 0
        self.last_error: str | None = None

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            client.subscribe(ACK_TOPIC, qos=ACK_QOS)
            logger.info(f"Ack listener subscribed to {ACK_TOPIC}")
        else:
            logger.error(f"Ack listener failed to connect, code: {rc}")

    def _on_message(self, client, userdata, msg) -> None:
        try:
            parts = msg.topic.split("/")
            if len(parts) != 3 or parts[0] != "devices" or parts[2] != "status":
                self.dropped_total += 1
                logger.warning(
                    f"Dropping ack with invalid topic shape: {msg.topic} "
                    f"(dropped_total={self.dropped_total})"
                )
                return
            device_id = parts[1]
            if not device_id or not device_id.strip():
                self.dropped_total += 1
                logger.warning(
                    f"Dropping ack with empty device_id: {msg.topic} "
                    f"(dropped_total={self.dropped_total})"
                )
                return
            try:
                payload = json.loads(msg.payload.decode())
            except (ValueError, UnicodeDecodeError) as e:
                self.dropped_total += 1
                logger.warning(
                    f"Dropping malformed ack payload on {msg.topic}: {e} "
                    f"(dropped_total={self.dropped_total})"
                )
                return
            if not isinstance(payload, dict):
                self.dropped_total += 1
                logger.warning(
                    f"Dropping non-object ack payload on {msg.topic} "
                    f"(dropped_total={self.dropped_total})"
                )
                return
            try:
                outcome, transitioned = apply_ack(
                    self.database_url,
                    payload.get("req_id"),
                    payload.get("status"),
                    payload.get("detail"),
                )
            except ValueError as e:
                self.dropped_total += 1
                logger.warning(
                    f"Dropping invalid ack on {msg.topic}: {e} "
                    f"(dropped_total={self.dropped_total})"
                )
                return
            if outcome is None:
                self.unknown_total += 1
                return
            if not transitioned:
                self.settled_total += 1
                return
            if outcome == "acked":
                self.acked_total += 1
            elif outcome == "failed":
                self.failed_total += 1
        except Exception as e:
            # Isolation seam: a DB outage or any unexpected error must never
            # propagate into the paho network thread (and never touch the
            # telemetry loop). Log and keep listening.
            self.error_total += 1
            self.last_error = str(e)
            logger.error(f"Ack processing failed, continuing to listen: {e}")

    def start(self) -> "AckListener":
        """Connect and start the background network loop (non-blocking)."""
        try:
            if config.mqtt.tls:
                if not config.mqtt.ca_cert:
                    raise RuntimeError("MQTT_TLS is set but MQTT_CA_CERT is missing")
                self.client.tls_set(
                    ca_certs=config.mqtt.ca_cert,
                    certfile=config.mqtt.client_cert,
                    keyfile=config.mqtt.client_key,
                    tls_version=ssl.PROTOCOL_TLS_CLIENT,
                )
            self.client.connect(self.broker, self.port, config.mqtt.keepalive)
        except Exception as e:
            self.last_error = str(e)
            logger.error(f"Ack listener failed to start: {e}")
            raise
        self.client.loop_start()
        logger.info(
            f"Ack listener started (broker={self.broker}:{self.port}, "
            f"topic={ACK_TOPIC})"
        )
        return self

    def stop(self) -> None:
        """Stop the network loop and disconnect."""
        try:
            self.client.loop_stop()
        finally:
            try:
                self.client.disconnect()
            except Exception:
                pass
        logger.info("Ack listener stopped")


def create_ack_listener(database_url: str | None = None) -> AckListener:
    """Factory / import seam mirroring ``create_expiry_sweep``.

    Shares the process and DB config with the expiry sweep; creates no
    sweep loop of its own.
    """
    return AckListener(database_url=database_url)
