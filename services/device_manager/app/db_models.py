"""
SQLAlchemy ORM models for device manager service.

These models mirror the database schema defined in db_migrations.
Kept separate to make the service independent.
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Device(Base):
    """IoT devices registered in the system."""

    __tablename__ = "devices"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    location = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Device(id={self.id}, name={self.name})>"


class DeviceCertificate(Base):
    """X.509 certificates issued to devices for mTLS authentication."""

    __tablename__ = "device_certificates"

    id = Column(Text, primary_key=True)
    device_id = Column(
        Text, ForeignKey("devices.id", ondelete="CASCADE"), primary_key=True
    )
    certificate_pem = Column(Text, nullable=False)
    private_key_pem = Column(Text)
    issued_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True))

    def __repr__(self):
        return f"<DeviceCertificate(device_id={self.device_id}, expires={self.expires_at})>"
