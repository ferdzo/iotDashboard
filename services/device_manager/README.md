# Device Manager Service

The Device Manager service handles device registration, certificate issuance, and lifecycle management for the IoT dashboard. It provides a REST API for device onboarding and integrates with the MQTT broker via mTLS authentication.

## Architecture

The service provides:
- **Device Registration**: REST API endpoint to register new devices
- **Certificate Management**: Generates X.509 certificates signed by internal CA
- **Device Lifecycle**: Tracks device status (active, revoked)
- **mTLS Integration**: Certificates used for MQTT broker authentication

### Technology Stack
- **FastAPI**: REST API framework
- **SQLAlchemy**: Database ORM
- **Cryptography**: X.509 certificate generation
- **Nano ID**: 8-character device identifiers
- **PostgreSQL**: Device and certificate storage

## API Endpoints

### Register Device
```http
POST /api/v1/devices/register
Content-Type: application/json

{
  "name": "Living Room Sensor",
  "location": "Living Room"
}
```

**Response (201):**
```json
{
  "device_id": "a1b2c3d4",
  "name": "Living Room Sensor",
  "location": "Living Room",
  "certificate": "-----BEGIN CERTIFICATE-----\n...",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
  "ca_certificate": "-----BEGIN CERTIFICATE-----\n...",
  "expires_at": "2026-01-15T10:30:00Z"
}
```

### Get Device
```http
GET /api/v1/devices/{device_id}
```

**Response (200):**
```json
{
  "device_id": "a1b2c3d4",
  "name": "Living Room Sensor",
  "location": "Living Room",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00Z"
}
```

### Revoke Device Certificate
```http
POST /api/v1/devices/{device_id}/revoke
```

**Response (200):**
```json
{
  "device_id": "a1b2c3d4",
  "revoked_at": "2025-06-15T10:30:00Z"
}
```