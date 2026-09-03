import logging
import time

import psycopg2

logger = logging.getLogger(__name__)


class DeviceRegistry:
    """Cached read-only view of registered, active devices.

    Refreshes from the devices table every ``ttl_sec``. Fail-open: after
    ``max_failures`` consecutive refresh failures the last-known cache
    freezes and every device is accepted (with a warning) until a refresh
    recovers. An initial load failure raises so misconfiguration fails fast
    at startup instead of silently accepting everything.
    """

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
        self._known: set = set()
        self._loaded_at = 0.0
        self._failures = 0
        self.refresh(raise_on_error=True)
        logger.info(f"Device registry loaded ({len(self._known)} active devices)")

    def refresh(self, raise_on_error: bool = False) -> bool:
        try:
            conn = psycopg2.connect(self.database_url, connect_timeout=5)
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT id FROM devices WHERE is_active")
                    self._known = {row[0] for row in cur.fetchall()}
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

    def is_known(self, device_id: str) -> bool:
        if time.monotonic() - self._loaded_at >= self.ttl_sec:
            self.refresh()
        if self._failures >= self.max_failures:
            return True
        return device_id in self._known
