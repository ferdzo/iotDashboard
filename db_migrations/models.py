"""
Database models for the IoT Dashboard.

To modify schema:
1. Edit models here
2. Run: alembic revision --autogenerate -m "description"
3. Review the generated migration in alembic/versions/
4. Run: alembic upgrade head
"""
from sqlalchemy import Boolean, Column, Float, ForeignKey, Index,Text, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class Device(Base):
    """IoT devices registered in the system."""
    __tablename__ = 'devices'
    
    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    location = Column(Text)
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<Device(id={self.id}, name={self.name})>"


class Telemetry(Base):
    """
    Time-series telemetry data from devices.
    This will be converted to a TimescaleDB hypertable.
    """
    __tablename__ = 'telemetry'
    
    time = Column(DateTime(timezone=True), primary_key=True, nullable=False)
    device_id = Column(Text, ForeignKey('devices.id'), primary_key=True, nullable=False)
    metric = Column(Text, primary_key=True, nullable=False)  # e.g., 'light', 'temperature'
    value = Column(Float, nullable=False)
    unit = Column(Text)
    
    __table_args__ = (
        Index('idx_telemetry_device_time', 'device_id', 'time'),
    )
    
    def __repr__(self):
        return f"<Telemetry(device={self.device_id}, metric={self.metric}, value={self.value})>"

