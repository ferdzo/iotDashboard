"""API client for the device_manager microservice."""

import os
import requests
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime


@dataclass
class DeviceRegistrationResponse:
    device_id: str
    certificate_id: str
    certificate: str
    private_key: str
    ca_certificate: str


@dataclass
class DeviceInfo:
    id: str
    name: str
    location: Optional[str]
    is_active: bool
    created_at: datetime
    certificates: List[Dict[str, Any]]


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

    def register_device(self, name: str, location: Optional[str] = None) -> DeviceRegistrationResponse:
        payload = {"name": name}
        if location:
            payload["location"] = location

        response = self._request("POST", "/devices/register", json=payload)
        data = response.json()

        return DeviceRegistrationResponse(
            device_id=data["device_id"],
            certificate_id=data["certificate_id"],
            certificate=data["certificate"],
            private_key=data["private_key"],
            ca_certificate=data["ca_certificate"],
        )

    def get_device(self, device_id: str) -> DeviceInfo:
        response = self._request("GET", f"/devices/{device_id}")
        data = response.json()

        return DeviceInfo(
            id=data["id"],
            name=data["name"],
            location=data.get("location"),
            is_active=data["is_active"],
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
            certificates=data.get("certificates", []),
        )

    def list_devices(self) -> List[DeviceInfo]:
        response = self._request("GET", "/devices/")
        data = response.json()

        return [
            DeviceInfo(
                id=device["id"],
                name=device["name"],
                location=device.get("location"),
                is_active=device["is_active"],
                created_at=datetime.fromisoformat(
                    device["created_at"].replace("Z", "+00:00")
                ),
                certificates=device.get("certificates", []),
            )
            for device in data
        ]

    def revoke_certificate(self, device_id: str) -> Dict[str, Any]:
        response = self._request("POST", f"/devices/{device_id}/revoke")
        return response.json()

    def renew_certificate(self, device_id: str) -> Dict[str, Any]:
        response = self._request("POST", f"/devices/{device_id}/renew")
        return response.json()

    def get_ca_certificate(self) -> str:
        response = self._request("GET", "/ca_certificate")
        return response.text

    def get_crl(self) -> str:
        response = self._request("GET", "/crl")
        return response.text

    def health_check(self) -> bool:
        try:
            response = self.session.get(f"{self.base_url}/docs", timeout=2)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False


default_client = DeviceManagerClient()


def register_device(name: str, location: Optional[str] = None) -> DeviceRegistrationResponse:
    return default_client.register_device(name, location)


def get_device(device_id: str) -> DeviceInfo:
    return default_client.get_device(device_id)


def list_devices() -> List[DeviceInfo]:
    return default_client.list_devices()


def revoke_certificate(device_id: str) -> Dict[str, Any]:
    return default_client.revoke_certificate(device_id)


def renew_certificate(device_id: str) -> Dict[str, Any]:
    return default_client.renew_certificate(device_id)
