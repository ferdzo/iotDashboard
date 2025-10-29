import logging
from typing import List
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

from config import config
from schema import TelemetryReading
from models import Telemetry


class DatabaseWriter:
    """
    Database writer for telemetry data.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        connection_string = config.database.get_connection_string()

        self.engine = create_engine(
            connection_string,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )

        self.SessionLocal = sessionmaker(bind=self.engine)

        self.logger.info("Database writer initialized")

    def write_batch(self, readings: List[TelemetryReading]) -> bool:
        """Write a batch of telemetry readings to the database"""
        if not readings:
            return True

        session = self.SessionLocal()
        try:
            # Convert to database objects using the correct field mapping
            db_objects = [
                Telemetry(
                    time=reading.time,
                    device_id=reading.device_id,
                    metric=reading.metric,
                    value=reading.value,
                    unit=reading.unit,
                )
                for reading in readings
            ]

            # Bulk insert
            session.bulk_save_objects(db_objects)
            session.commit()

            self.logger.debug(f"Wrote {len(readings)} readings to database")
            return True

        except Exception as e:
            self.logger.error(f"Failed to write batch: {e}")
            session.rollback()
            return False
        finally:
            session.close()

    def health_check(self) -> bool:
        """Check if database connection is healthy"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(select(1))
                return result.fetchone()[0] == 1
        except Exception as e:
            self.logger.error(f"Database health check failed: {e}")
            return False

    def close(self):
        """Close database engine and all connections"""
        if hasattr(self, "engine") and self.engine:
            self.engine.dispose()
            self.logger.info("Database engine closed")
