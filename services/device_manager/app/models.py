import datetime
from typing import Any

from pydantic import BaseModel


class DeviceRegistrationRequest(BaseModel):
    name: str
    location: str | None = None
    protocol: str = "mqtt"
    connection_config: dict[str, Any] | None = None


class DeviceRegistrationResponse(BaseModel):
    device_id: str
    protocol: str
    certificate_id: str | None = None
    ca_certificate_pem: str | None = None
    certificate_pem: str | None = None
    private_key_pem: str | None = None
    expires_at: datetime.datetime | None = None
    onboarding_token: str | None = None
    credential_id: str | None = None
    api_key: str | None = None
    webhook_secret: str | None = None


class DeviceResponse(BaseModel):
    id: str
    name: str
    location: str | None = None
    protocol: str
    connection_config: dict[str, Any] | None = None
    created_at: datetime.datetime

class DeviceCertificateResponse(BaseModel):
    certificate_id: str
    device_id: str
    ca_certificate_pem: str
    certificate_pem: str
    private_key_pem: str
    expires_at: datetime.datetime


class DeviceCredentials(BaseModel):
    certificate_id: str
    device_id: str
    certificate_pem: bytes
    private_key_pem: bytes
    expires_at: datetime.datetime
