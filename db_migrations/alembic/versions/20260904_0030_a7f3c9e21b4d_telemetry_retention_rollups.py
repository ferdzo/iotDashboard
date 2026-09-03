"""telemetry retention, compression and rollups

Revision ID: a7f3c9e21b4d
Revises: dc7b523353d3
Create Date: 2026-09-04 00:30:00.000000+00:00

Scope: telemetry hypertable and the telemetry_hourly/telemetry_daily
continuous aggregates ONLY. This database is shared with other projects
(vehicle_positions, arrival_records, hourly_route_delays) — nothing here
may touch those objects. All policy calls use if_not_exists so re-running
is safe.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a7f3c9e21b4d'
down_revision: Union[str, Sequence[str], None] = 'dc7b523353d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        "ALTER TABLE telemetry SET ("
        "timescaledb.compress, "
        "timescaledb.compress_segmentby = 'device_id,metric', "
        "timescaledb.compress_orderby = 'time DESC');"
    )
    op.execute(
        "SELECT add_compression_policy('telemetry', INTERVAL '7 days', "
        "if_not_exists => TRUE);"
    )
    op.execute(
        "SELECT add_retention_policy('telemetry', INTERVAL '90 days', "
        "if_not_exists => TRUE);"
    )
    op.execute(
        "CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_hourly "
        "WITH (timescaledb.continuous) AS "
        "SELECT time_bucket(INTERVAL '1 hour', time) AS bucket, "
        "device_id, metric, "
        "AVG(value) AS avg_value, MIN(value) AS min_value, "
        "MAX(value) AS max_value, COUNT(*) AS sample_count "
        "FROM telemetry GROUP BY bucket, device_id, metric WITH NO DATA;"
    )
    op.execute(
        "CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_daily "
        "WITH (timescaledb.continuous) AS "
        "SELECT time_bucket(INTERVAL '1 day', time) AS bucket, "
        "device_id, metric, "
        "AVG(value) AS avg_value, MIN(value) AS min_value, "
        "MAX(value) AS max_value, COUNT(*) AS sample_count "
        "FROM telemetry GROUP BY bucket, device_id, metric WITH NO DATA;"
    )
    op.execute(
        "SELECT add_continuous_aggregate_policy('telemetry_hourly', "
        "start_offset => INTERVAL '3 hours', end_offset => INTERVAL '1 hour', "
        "schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE);"
    )
    op.execute(
        "SELECT add_continuous_aggregate_policy('telemetry_daily', "
        "start_offset => INTERVAL '3 days', end_offset => INTERVAL '1 day', "
        "schedule_interval => INTERVAL '1 day', if_not_exists => TRUE);"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("SELECT remove_continuous_aggregate_policy('telemetry_hourly', if_exists => TRUE);")
    op.execute("SELECT remove_continuous_aggregate_policy('telemetry_daily', if_exists => TRUE);")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS telemetry_hourly;")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS telemetry_daily;")
    op.execute("SELECT remove_compression_policy('telemetry', if_exists => TRUE);")
    op.execute("SELECT remove_retention_policy('telemetry', if_exists => TRUE);")
