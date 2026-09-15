"""HTTP ingress sibling module.

Accepts ``POST /ingest`` with ``{device_id, metric, value}`` so devices
that cannot speak MQTT (or prefer webhooks) can deliver readings over
plain HTTP. This module is a *sibling* of the MQTT path, not a new
deployable service: it reuses the exact same downstream contract — the
``(device_id, metric, value) -> None`` message-handler callback (in
production ``MQTTIngestionService._handle_sensor_data``) which writes to
the ``mqtt:ingestion`` Redis stream with identical fields.

Authentication is a raw per-device secret (issued by device_manager at
``POST /devices/register`` for ``http``/``webhook`` protocols) presented
as ``Authorization: Bearer <secret>`` or ``X-API-Key: <secret>``. Only
the SHA-256 hex digest is stored (``device_credentials.credential_hash``)
and compared here. Invalid credentials get 401 and never touch the
stream; unknown/inactive devices get 403 and never touch the stream.

Nothing in this module changes the MQTT path: ``mqtt_client.py`` and
``_handle_sensor_data`` are untouched; the HTTP server is started
alongside (not instead of) the MQTT loop in ``main.py``.
"""

import hashlib
import logging
import math
from typing import Callable, Optional

import psycopg2
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, field_validator

from src.config import config

logger = logging.getLogger(__name__)

#: Protocols allowed through the HTTP ingress path. Mirrors the
#: ``protocol`` values device_manager issues credentials for.
HTTP_PROTOCOLS = ("http", "webhook")

MessageHandler = Callable[[str, str, float], None]
DeviceValidator = Callable[[str], bool]
CredentialVerifier = Callable[[str, str], bool]


class IngestRequest(BaseModel):
    device_id: str
    metric: str
    value: float

    @field_validator("device_id", "metric")
    @classmethod
    def _non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must be non-empty")
        return v.strip()

    @field_validator("value")
    @classmethod
    def _finite(cls, v: float) -> float:
        # Same hardening as the MQTT chokepoint: nan/inf never enter the stream.
        if not math.isfinite(v):
            raise ValueError("must be a finite number")
        return v


def verify_device_credential(
    device_id: str,
    raw_credential: str,
    database_url: Optional[str] = None,
) -> bool:
    """Return True iff ``raw_credential`` matches a live credential row.

    Compares the SHA-256 hex digest against
    ``device_credentials.credential_hash`` for rows that are not revoked,
    not expired, and belong to an active device registered for an
    HTTP-style protocol. Any lookup failure fails closed (False) so a
    registry/DB outage yields 401s, never unauthenticated writes.
    """
    if not device_id or not raw_credential:
        return False
    url = database_url or config.database.url
    if not url:
        logger.error("DATABASE_URL is not configured; rejecting HTTP ingest")
        return False
    digest = hashlib.sha256(raw_credential.encode("utf-8")).hexdigest()
    try:
        conn = psycopg2.connect(url, connect_timeout=5)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 1
                      FROM device_credentials c
                      JOIN devices d ON d.id = c.device_id
                     WHERE c.device_id = %s
                       AND c.credential_hash = %s
                       AND c.revoked_at IS NULL
                       AND (c.expires_at IS NULL OR c.expires_at > NOW())
                       AND d.is_active
                       AND d.protocol IN ('http', 'webhook')
                     LIMIT 1
                    """,
                    (device_id, digest),
                )
                return cur.fetchone() is not None
        finally:
            conn.close()
    except Exception as e:
        logger.warning(f"Credential lookup failed for {device_id!r}: {e}")
        return False


def http_device_validator(
    device_id: str,
    is_known: Callable[..., bool],
) -> bool:
    """Accept devices the registry knows under an HTTP-style protocol."""
    return bool(
        is_known(device_id, "http") or is_known(device_id, "webhook")
    )


def create_http_app(
    message_handler: MessageHandler,
    device_validator: Optional[DeviceValidator] = None,
    credential_verifier: Optional[CredentialVerifier] = None,
    on_ingested: Optional[Callable[[], None]] = None,
) -> FastAPI:
    """Build the ingest FastAPI app around an already-wired handler.

    Args:
        message_handler: ``(device_id, metric, value)`` sink — in
            production ``MQTTIngestionService._handle_sensor_data``.
        device_validator: predicate taking ``device_id``; rejected
            devices get 403 before any stream write. Defaults to accept
            (credential check already enforces active http/webhook
            registration); pass the registry-backed validator in prod.
        credential_verifier: ``(device_id, raw_secret) -> bool``.
            Defaults to :func:`verify_device_credential`.
        on_ingested: hook run after a successful handler call (production
            passes ``redis_writer.flush`` so the entry is visible in
            ``mqtt:ingestion`` immediately instead of waiting for the
            pipeline batch to fill).
    """
    verifier = credential_verifier or verify_device_credential
    app = FastAPI(title="MQTT Ingestion HTTP sibling")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/ingest")
    def ingest(
        body: IngestRequest,
        authorization: Optional[str] = Header(default=None),
        x_api_key: Optional[str] = Header(default=None),
    ):
        raw = None
        if authorization and authorization.lower().startswith("bearer "):
            raw = authorization[7:].strip()
        elif x_api_key:
            raw = x_api_key.strip()
        if not raw:
            raise HTTPException(status_code=401, detail="Missing credentials")
        if not verifier(body.device_id, raw):
            logger.warning(
                f"Rejecting HTTP ingest for {body.device_id!r} "
                "(reason=invalid-credential)"
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if device_validator is not None and not device_validator(body.device_id):
            logger.warning(
                f"Rejecting HTTP ingest for {body.device_id!r} "
                "(reason=unknown-device)"
            )
            raise HTTPException(
                status_code=403, detail="Unknown or inactive device"
            )
        message_handler(body.device_id, body.metric, body.value)
        if on_ingested is not None:
            on_ingested()
        logger.info(f"Ingested {body.device_id}/{body.metric}: {body.value}")
        return {
            "status": "ok",
            "device_id": body.device_id,
            "metric": body.metric,
            "value": body.value,
        }

    return app
