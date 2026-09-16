import logging
import time

import psycopg2

logger = logging.getLogger(__name__)


class DeviceRegistry:
    """Cached read-only view of registered, active devices.

    Keys cache by device id to (protocol) so the guard enforces both
    ``is_active`` (rows filtered at refresh) and protocol match. Refreshes
    from the devices table every ``ttl_sec`` (default 60s). Fail-open: after
    ``max_failures`` consecutive refresh failures the last-known cache
    freezes and every device is accepted (with a warning + fail-open
    counter) until a refresh recovers. An initial load failure raises so
    misconfiguration fails fast at startup instead of silently accepting
    everything. Refresh failures never raise out of ``is_known`` so a
    registry outage cannot block the MQTT message loop.
    """

    #: Protocol expected for messages arriving via the MQTT ingestion path.
    MQTT_PROTOCOL = "mqtt"

    def __init__(
        self,
        database_url: str,
        ttl_sec: int = 60,
        max_failures: int = 3,
    ):
        if not database_url:
            raise ValueError("DATABASE_URL is required for the device registry")
        self.database_url = database_url
        self.ttl_sec = ttl_sec
        self.max_failures = max_failures
        self._known: dict = {}
        self._loaded_at = 0.0
        self._failures = 0
        self.fail_open_total = 0
        self.refresh(raise_on_error=True)
        logger.info(f"Device registry loaded ({len(self._known)} active devices)")

    def refresh(self, raise_on_error: bool = False) -> bool:
        try:
            conn = psycopg2.connect(self.database_url, connect_timeout=5)
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id, protocol FROM devices WHERE is_active"
                    )
                    self._known = {
                        row[0]: (row[1] or self.MQTT_PROTOCOL)
                        for row in cur.fetchall()
                    }
            finally:
                conn.close()
            self._loaded_at = time.monotonic()
            if self._failures:
                logger.warning(
                    f"Device registry recovered ({len(self._known)} devices)"
                )
            self._failures = 0
            return True
        except Exception as e:
            self._failures += 1
            if raise_on_error:
                raise
            logger.warning(f"Device registry refresh failed ({self._failures}x): {e}")
            return False

    def is_known(self, device_id: str, protocol: str = MQTT_PROTOCOL) -> bool:
        if time.monotonic() - self._loaded_at >= self.ttl_sec:
            self.refresh()
        if self._failures >= self.max_failures:
            self.fail_open_total += 1
            logger.warning(
                f"Device registry fail-open, accepting {device_id!r} "
                f"(failures={self._failures} "
                f"fail_open_total={self.fail_open_total})"
            )
            return True
        return self._known.get(device_id) == protocol
