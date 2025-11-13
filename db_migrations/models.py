"""
Database models for the IoT Dashboard.

To modify schema:
1. Edit models here
2. Run: alembic revision --autogenerate -m "description"
3. Review the generated migration in alembic/versions/
4. Run: alembic upgrade head
"""

from sqlalchemy import Boolean, Column, Float, ForeignKey, Index, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Device(Base):
    """IoT devices registered in the system."""

    __tablename__ = "devices"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    location = Column(Text)
    protocol = Column(Text, nullable=False, default="mqtt")
    connection_config = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Device(id={self.id}, name={self.name}, protocol={self.protocol})>"
class DeviceCertificate(Base):
    """X.509 certificates issued to devices for mTLS authentication."""

    __tablename__ = "device_certificates"

    id = Column(Text, primary_key=True)
    device_id = Column(
        Text, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False
    )
    certificate_pem = Column(Text, nullable=False)
    private_key_pem = Column(Text)
    issued_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True))

    __table_args__ = (
        Index("idx_device_certificates_device_id", "device_id"),
        Index("idx_device_certificates_active", "device_id", "revoked_at"),
    )

    def __repr__(self):
        return f"<DeviceCertificate(id={self.id}, device_id={self.device_id}, expires={self.expires_at})>"


class DeviceCredential(Base):
    """Authentication credentials for non-mTLS protocols (HTTP, webhook, etc)."""

    __tablename__ = "device_credentials"

    id = Column(Text, primary_key=True)
    device_id = Column(
        Text, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False
    )
    credential_type = Column(Text, nullable=False)
    credential_hash = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True))
    revoked_at = Column(DateTime(timezone=True))

    __table_args__ = (
        Index("idx_device_credentials_device_id", "device_id"),
        Index("idx_device_credentials_active", "device_id", "revoked_at"),
    )

    def __repr__(self):
        return f"<DeviceCredential(id={self.id}, device_id={self.device_id}, type={self.credential_type})>"


class DeviceOnboardingToken(Base):
    """One-time tokens for secure device onboarding via QR code."""

    __tablename__ = "device_onboarding_tokens"

    token = Column(Text, primary_key=True)
    device_id = Column(
        Text, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False
    )
    certificate_id = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True))

    __table_args__ = (
        Index("idx_onboarding_tokens_device_id", "device_id"),
        Index("idx_onboarding_tokens_expires", "expires_at"),
    )

    def __repr__(self):
        return f"<DeviceOnboardingToken(device_id={self.device_id}, used={self.used_at is not None})>"


class   Telemetry(Base):
    """
    Time-series telemetry data from devices.
    """

    __tablename__ = "telemetry"

    time = Column(DateTime(timezone=True), primary_key=True, nullable=False)
    device_id = Column(Text, ForeignKey("devices.id"), primary_key=True, nullable=False)
    metric = Column(Text, primary_key=True, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(Text)

    __table_args__ = (Index("idx_telemetry_device_time", "device_id", "time"),)

    def __repr__(self):
        return f"<Telemetry(device={self.device_id}, metric={self.metric}, value={self.value})>"
