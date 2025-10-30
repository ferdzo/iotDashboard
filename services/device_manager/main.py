import datetime
import logging

from fastapi import FastAPI, HTTPException

from cert_manager import CertificateManager
from database import get_db_context
from db_models import Device, DeviceCertificate  # SQLAlchemy ORM models
from models import DeviceRegistrationRequest, DeviceRegistrationResponse  # Pydantic API models

logger = logging.getLogger(__name__)

app = FastAPI()

cert_manager = CertificateManager()


@app.get("/")
async def hello():
    return {"Hello": "World"}


@app.post("/devices/register")
async def register_device(
    request: DeviceRegistrationRequest,
) -> DeviceRegistrationResponse:
    """
    Register a new device and issue an X.509 certificate.
    """
    try:
        response = cert_manager.register_device(
            name=request.name,
            location=request.location,
        )

        with get_db_context() as db:
            device = Device(
                id=response.device_id,
                name=request.name,
                location=request.location,
                created_at=datetime.datetime.now(datetime.UTC),
            )
            db.add(device)

            device_cert = DeviceCertificate(
                device_id=response.device_id,
                certificate_pem=response.certificate_pem,
                private_key_pem=response.private_key_pem,
                issued_at=datetime.datetime.now(datetime.UTC),
                expires_at=response.expires_at,
            )
            db.add(device_cert)

    except Exception as e:
        logger.error(
            f"Failed to register device {request.name}: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=500, detail="Failed to register device. Please try again."
        ) from e

    return response


@app.get("/ca_certificate")
async def get_ca_certificate() -> str:
    """
    Retrieve the CA certificate in PEM format.
    """
    try:
        ca_cert_pem = cert_manager.get_ca_certificate_pem()
        return ca_cert_pem
    except Exception as e:
        logger.error(f"Failed to retrieve CA certificate: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to retrieve CA certificate."
        ) from e