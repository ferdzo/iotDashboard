import datetime

from pydantic import BaseModel

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
