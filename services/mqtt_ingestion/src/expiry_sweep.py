"""Periodic expiry sweep for device commands (todo 9).

Marks ``command_log`` rows stuck in ``requested`` past their per-row
``ttl_sec`` deadline as ``expired``. Runs on a 60s interval in the same
mqtt_ingestion process as the (todo 8) ack listener.

Import seam for todo 8: the ack listener should live in its own module
(e.g. ``src/ack_listener.py`` — NOT created here) and share this
process. Either module can import the other one's factory; this module
exposes ``create_expiry_sweep`` so the listener (or ``main.py``) can
start the sweep without importing loop internals::

    from src.expiry_sweep import create_expiry_sweep
    sweep = create_expiry_sweep(database_url)
    sweep.start()
    ...
    sweep.stop()

Guarantees:
- Only ``state='requested'`` rows whose ``created_at + ttl_sec`` is in
  the past transition to ``expired``. ``acked``/``failed``/``expired``
  rows are never touched, so an expired command can never be published
  retroactively (expiry is terminal).
- Rows are NEVER deleted — the audit trail is preserved.
- A DB outage is logged and retried at the next interval; the sweep
  never raises out of its thread and never blocks the telemetry loop.
"""

import logging
import os
import threading
import time

import psycopg2

logger = logging.getLogger(__name__)

#: Sweep period in seconds (overridable via env for tests/ops).
SWEEP_INTERVAL_SEC = int(os.getenv("COMMAND_SWEEP_INTERVAL_SEC", "60"))

#: Documented default TTL; the per-row source of truth is command_log.ttl_sec.
DEFAULT_TTL_SEC = 300

EXPIRE_SQL = """
UPDATE command_log
   SET state = 'expired'
 WHERE state = 'requested'
   AND created_at + make_interval(secs => ttl_sec) < now()
"""


def expire_stale_commands(database_url: str) -> int:
    """Expire overdue ``requested`` commands once.

    Returns the number of rows transitioned to ``expired`` (0 when
    nothing is overdue). Never deletes rows. Raises on DB errors so
    callers/tests can distinguish failure from an empty sweep; the
    background loop (:class:`ExpirySweep`) catches, logs, and retries.
    """
    if not database_url:
        raise ValueError("database_url is required for the expiry sweep")
    conn = psycopg2.connect(database_url, connect_timeout=5)
    try:
        with conn.cursor() as cur:
            cur.execute(EXPIRE_SQL)
            expired = cur.rowcount
        conn.commit()
    finally:
        conn.close()
    if expired:
        logger.info(f"Command expiry sweep: {expired} command(s) expired")
    return expired


class ExpirySweep:
    """Background 60s loop calling :func:`expire_stale_commands`.

    Runs on a daemon thread; ``stop()`` wakes it promptly via an event
    so shutdown never waits out the full interval.
    """

    def __init__(self, database_url: str, interval_sec: int = SWEEP_INTERVAL_SEC):
        if not database_url:
            raise ValueError("database_url is required for the expiry sweep")
        if interval_sec <= 0:
            raise ValueError("interval_sec must be positive")
        self.database_url = database_url
        self.interval_sec = interval_sec
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.swept_total = 0
        self.expired_total = 0
        self.last_error: str | None = None

    def _run_once(self) -> None:
        try:
            expired = expire_stale_commands(self.database_url)
        except Exception as e:
            self.last_error = str(e)
            logger.error(f"Command expiry sweep failed, retrying next interval: {e}")
            return
        self.last_error = None
        self.swept_total += 1
        self.expired_total += expired

    def _loop(self) -> None:
        while not self._stop.wait(self.interval_sec):
            self._run_once()

    def start(self) -> "ExpirySweep":
        if self._thread is not None and self._thread.is_alive():
            return self
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._loop, name="command-expiry-sweep", daemon=True
        )
        self._thread.start()
        logger.info(
            f"Command expiry sweep started (interval={self.interval_sec}s)"
        )
        return self

    def stop(self, timeout: float = 10.0) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=timeout)
            if self._thread.is_alive():
                logger.warning("Command expiry sweep thread did not stop cleanly")
            self._thread = None
        logger.info("Command expiry sweep stopped")


def create_expiry_sweep(
    database_url: str, interval_sec: int = SWEEP_INTERVAL_SEC
) -> ExpirySweep:
    """Factory / import seam for co-location with the ack listener (todo 8)."""
    return ExpirySweep(database_url, interval_sec=interval_sec)


if __name__ == "__main__":
    # Cron-style entrypoint: single sweep pass, exit 0/1.
    # Usage: COMMAND_SWEEP_DATABASE_URL=postgresql://... python -m src.expiry_sweep
    # (or DATABASE_URL). Never deletes rows.
    url = os.getenv("COMMAND_SWEEP_DATABASE_URL") or os.getenv("DATABASE_URL")
    try:
        count = expire_stale_commands(url or "")
    except Exception as e:
        logger.error(f"Expiry sweep pass failed: {e}")
        raise SystemExit(1)
    print(f"expired={count}")
