"""API client for the device_manager microservice."""

import os
import requests
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime


@dataclass
class DeviceRegistrationResponse:
    device_id: str
    protocol: str
    certificate_id: Optional[str] = None
    ca_certificate_pem: Optional[str] = None
    certificate_pem: Optional[str] = None
    private_key_pem: Optional[str] = None
    expires_at: Optional[datetime] = None
    onboarding_token: Optional[str] = None  # One-time token for secure onboarding
    credential_id: Optional[str] = None
    api_key: Optional[str] = None
    webhook_secret: Optional[str] = None


@dataclass
class DeviceInfo:
    id: str
    name: str
    location: Optional[str]
    protocol: str
    connection_config: Optional[Dict[str, Any]]
    created_at: datetime


class DeviceManagerAPIError(Exception):
    def __init__(self, status_code: int, message: str, details: Optional[Dict] = None):
        self.status_code = status_code
        self.message = message
        self.details = details or {}
        super().__init__(f"API Error {status_code}: {message}")


class DeviceManagerClient:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.getenv("DEVICE_MANAGER_URL", "http://localhost:8000")
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def _request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response
        except requests.exceptions.HTTPError as e:
            try:
                error_data = e.response.json()
                message = error_data.get("detail", str(e))
            except (ValueError, AttributeError):
                message = str(e)

            raise DeviceManagerAPIError(
                status_code=e.response.status_code,
                message=message,
                details=error_data if "error_data" in locals() else {},
            )
        except requests.exceptions.RequestException as e:
            raise DeviceManagerAPIError(
                status_code=0, message=f"Connection error: {str(e)}"
            )

    def register_device(
        self, 
        name: str, 
        location: Optional[str] = None,
        protocol: str = "mqtt",
        connection_config: Optional[Dict[str, Any]] = None
    ) -> DeviceRegistrationResponse:
        payload = {"name": name, "protocol": protocol}
        if location:
            payload["location"] = location
        if connection_config:
            payload["connection_config"] = connection_config

        response = self._request("POST", "/devices/register", json=payload)
        data = response.json()

        return DeviceRegistrationResponse(
            device_id=data["device_id"],
            protocol=data["protocol"],
            certificate_id=data.get("certificate_id"),
            ca_certificate_pem=data.get("ca_certificate_pem"),
            certificate_pem=data.get("certificate_pem"),
            private_key_pem=data.get("private_key_pem"),
            expires_at=datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00")) if data.get("expires_at") else None,
            onboarding_token=data.get("onboarding_token"),
            credential_id=data.get("credential_id"),
            api_key=data.get("api_key"),
            webhook_secret=data.get("webhook_secret"),
        )

    def get_device(self, device_id: str) -> DeviceInfo:
        response = self._request("GET", f"/devices/{device_id}")
        data = response.json()

        return DeviceInfo(
            id=data["id"],
            name=data["name"],
            location=data.get("location"),
            protocol=data["protocol"],
            connection_config=data.get("connection_config"),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
        )

    def list_devices(self) -> List[DeviceInfo]:
        response = self._request("GET", "/devices/")
        data = response.json()

        return [
            DeviceInfo(
                id=device["id"],
                name=device["name"],
                location=device.get("location"),
                protocol=device["protocol"],
                connection_config=device.get("connection_config"),
                created_at=datetime.fromisoformat(
                    device["created_at"].replace("Z", "+00:00")
                ),
            )
            for device in data
        ]

    def revoke_certificate(self, device_id: str) -> Dict[str, Any]:
        response = self._request("POST", f"/devices/{device_id}/revoke")
        return response.json()

    def renew_certificate(self, device_id: str) -> DeviceRegistrationResponse:
        response = self._request("POST", f"/devices/{device_id}/renew")
        data = response.json()
        
        return DeviceRegistrationResponse(
            device_id=data["device_id"],
            protocol=data["protocol"],
            certificate_id=data.get("certificate_id"),
            ca_certificate_pem=data.get("ca_certificate_pem"),
            certificate_pem=data.get("certificate_pem"),
            private_key_pem=data.get("private_key_pem"),
            expires_at=datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00")) if data.get("expires_at") else None,
            credential_id=data.get("credential_id"),
            api_key=data.get("api_key"),
            webhook_secret=data.get("webhook_secret"),
        )

    def delete_device(self, device_id: str) -> Dict[str, Any]:
        """Delete a device and its associated certificates."""
        response = self._request("POST", f"/devices/{device_id}/delete")
        return response.json()

    def get_ca_certificate(self) -> str:
        response = self._request("GET", "/ca_certificate")
        return response.text

    def get_crl(self) -> str:
        response = self._request("GET", "/crl")
        return response.text

    def get_device_credentials(self, device_id: str, token: str) -> DeviceRegistrationResponse:
        """Fetch device credentials using one-time onboarding token."""
        response = self._request("GET", f"/devices/{device_id}/credentials", params={"token": token})
        data = response.json()
        
        # DeviceCertificateResponse from FastAPI doesn't include protocol
        # We'll use "mqtt" as default since credentials endpoint is only for MQTT devices
        return DeviceRegistrationResponse(
            device_id=data["device_id"],
            protocol="mqtt",  # Credentials endpoint is only for MQTT devices
            certificate_id=data.get("certificate_id"),
            ca_certificate_pem=data.get("ca_certificate_pem"),
            certificate_pem=data.get("certificate_pem"),
            private_key_pem=data.get("private_key_pem"),
            expires_at=datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00")) if data.get("expires_at") else None,
            credential_id=None,
            api_key=None,
            webhook_secret=None,
        )

    def health_check(self) -> bool:
        try:
            response = self.session.get(f"{self.base_url}/docs", timeout=2)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False


default_client = DeviceManagerClient()


def register_device(
    name: str, 
    location: Optional[str] = None,
    protocol: str = "mqtt",
    connection_config: Optional[Dict[str, Any]] = None
) -> DeviceRegistrationResponse:
    return default_client.register_device(name, location, protocol, connection_config)


def get_device(device_id: str) -> DeviceInfo:
    return default_client.get_device(device_id)


def list_devices() -> List[DeviceInfo]:
    return default_client.list_devices()


def revoke_certificate(device_id: str) -> Dict[str, Any]:
    return default_client.revoke_certificate(device_id)


def renew_certificate(device_id: str) -> Dict[str, Any]:
    return default_client.renew_certificate(device_id)


def delete_device(device_id: str) -> Dict[str, Any]:
    return default_client.delete_device(device_id)
