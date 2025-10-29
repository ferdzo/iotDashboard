import datetime

from pydantic import BaseModel


class Device(BaseModel):
    """IoT devices registered in the system."""

    id: str
    name: str
    location: str | None = None
    is_active: bool = True
    created_at: datetime.datetime

class DeviceCertificate(BaseModel):
    """X.509 certificates issued to devices for mTLS authentication."""

    device_id: str
    certificate_pem: str
    private_key_pem: str | None = None
    issued_at: datetime.datetime
    expires_at: datetime.datetime
    revoked_at: datetime.datetime | None = None

class DeviceRegistrationRequest(BaseModel):
    """Request model for registering a new device."""

    name: str
    location: str | None = None

class DeviceRegistrationResponse(BaseModel):
    """Response model after registering a new device."""

    device_id: str
    ca_certificate_pem: str
    certificate_pem: str
    private_key_pem: str
    expires_at: datetime.datetime
