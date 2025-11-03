"""
SQLAlchemy models for db_write service.

These models mirror the schema in db_migrations/models.py.
Keep them in sync when schema changes occur.
"""

from sqlalchemy import Column, Float, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class Telemetry(Base):
    """
    Time-series telemetry data from devices.
    
    This model is used by the db_write service to insert data.
    """

    __tablename__ = "telemetry"

    time = Column(DateTime(timezone=True), primary_key=True, nullable=False)
    device_id = Column(Text, primary_key=True, nullable=False)
    metric = Column(Text, primary_key=True, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(Text)

    def __repr__(self):
        return f"<Telemetry(device={self.device_id}, metric={self.metric}, value={self.value})>"
