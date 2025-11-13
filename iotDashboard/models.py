"""
Django models that mirror the SQLAlchemy schema from db_migrations/models.py.

These models are read-only (managed=False) and query the microservices database.
For write operations, use the device_manager API client instead.
"""

from django.db import models


class Device(models.Model):
    """IoT devices registered in the system."""

    id = models.CharField(max_length=8, primary_key=True)
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, null=True, blank=True)
    protocol = models.CharField(max_length=50, default="mqtt")
    connection_config = models.JSONField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "devices"

    def __str__(self):
        return f"{self.name} ({self.id}) [{self.protocol}]"

    @property
    def active_certificate(self):
        """Get the active (non-revoked) certificate for this device."""
        return self.certificates.filter(revoked_at__isnull=True).first()

    @property
    def certificate_status(self):
        """Get human-readable certificate status for MQTT devices."""
        if self.protocol != "mqtt":
            return "N/A"
        cert = self.active_certificate
        if not cert:
            return "No Certificate"
        if cert.is_expired:
            return "Expired"
        if cert.is_expiring_soon:
            return "Expiring Soon"
        return "Valid"


class DeviceCertificate(models.Model):
    """X.509 certificates issued to devices for mTLS authentication."""

    id = models.CharField(
        max_length=255, primary_key=True
    )  # Certificate serial number (hex)
    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="certificates", db_column="device_id"
    )
    certificate_pem = models.TextField()
    private_key_pem = models.TextField(null=True, blank=True)  # Optional backup
    issued_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False  # Don't create/modify this table
        db_table = "device_certificates"
        indexes = [
            models.Index(fields=["device"]),
            models.Index(fields=["device", "revoked_at"]),
        ]

    def __str__(self):
        status = "Revoked" if self.revoked_at else "Active"
        return f"Certificate {self.id[:8]}... for {self.device.name} ({status})"

    @property
    def is_revoked(self):
        """Check if certificate is revoked."""
        return self.revoked_at is not None

    @property
    def is_expired(self):
        """Check if certificate is expired."""
        from django.utils import timezone

        return timezone.now() > self.expires_at

    @property
    def is_expiring_soon(self):
        """Check if certificate expires within 30 days."""
        from django.utils import timezone
        from datetime import timedelta

        return (
            not self.is_expired
            and self.expires_at < timezone.now() + timedelta(days=30)
        )

    @property
    def is_valid(self):
        """Check if certificate is valid (not revoked and not expired)."""
        return not self.is_revoked and not self.is_expired

    @property
    def days_until_expiry(self):
        """Calculate days until certificate expires."""
        from django.utils import timezone

        if self.is_expired:
            return 0
        delta = self.expires_at - timezone.now()
        return delta.days


class DeviceCredential(models.Model):
    """Authentication credentials for non-mTLS protocols (HTTP, webhook, etc)."""

    id = models.CharField(max_length=255, primary_key=True)
    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="credentials", db_column="device_id"
    )
    credential_type = models.CharField(max_length=50)
    credential_hash = models.TextField()
    created_at = models.DateTimeField()
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "device_credentials"
        indexes = [
            models.Index(fields=["device"]),
            models.Index(fields=["device", "revoked_at"]),
        ]

    def __str__(self):
        status = "Revoked" if self.revoked_at else "Active"
        return f"{self.credential_type} for {self.device.name} ({status})"

    @property
    def is_revoked(self):
        return self.revoked_at is not None

    @property
    def is_expired(self):
        from django.utils import timezone
        return self.expires_at and timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.is_revoked and not self.is_expired


class Telemetry(models.Model):
    """Time-series telemetry data from devices (TimescaleDB hypertable).
    
    Note: This table has a composite primary key (time, device_id, metric).
    Since Django doesn't support composite PKs well, we mark time as the PK
    but queries should filter by (time, device_id, metric) together.
    """

    time = models.DateTimeField(primary_key=True)
    device_id = models.CharField(max_length=255, db_column="device_id")
    metric = models.CharField(max_length=255)
    value = models.FloatField()
    unit = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        managed = False
        db_table = "telemetry"
        # Note: The actual database has composite PK (time, device_id, metric)
        # Django limitation: can only mark one field as PK
        unique_together = [["time", "device_id", "metric"]]

    def __str__(self):
        return f"{self.device.name} - {self.metric}: {self.value} at {self.time}"

