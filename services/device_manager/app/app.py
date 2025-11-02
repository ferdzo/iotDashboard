import datetime
import logging

from fastapi import FastAPI, HTTPException

from app.cert_manager import CertificateManager
from app.database import get_db_context
from app.db_models import Device, DeviceCertificate
from app.models import (
    DeviceRegistrationRequest,
    DeviceRegistrationResponse,
    DeviceResponse,
)

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
    Register a new device.
    - MQTT devices: issues X.509 certificate for mTLS
    - HTTP/webhook devices: generates API key or HMAC secret
    """
    try:
        if request.protocol == "mqtt":
            cert_response = cert_manager.register_device(
                name=request.name,
                location=request.location,
            )

            with get_db_context() as db:
                device = Device(
                    id=cert_response.device_id,
                    name=request.name,
                    location=request.location,
                    protocol=request.protocol,
                    connection_config=request.connection_config,
                    created_at=datetime.datetime.now(datetime.UTC),
                )
                db.add(device)

                device_cert = DeviceCertificate(
                    id=cert_response.certificate_id,
                    device_id=cert_response.device_id,
                    certificate_pem=cert_response.certificate_pem,
                    private_key_pem=cert_response.private_key_pem,
                    issued_at=datetime.datetime.now(datetime.UTC),
                    expires_at=cert_response.expires_at,
                )
                db.add(device_cert)

            return DeviceRegistrationResponse(
                device_id=cert_response.device_id,
                protocol=request.protocol,
                certificate_id=cert_response.certificate_id,
                ca_certificate_pem=cert_response.ca_certificate_pem,
                certificate_pem=cert_response.certificate_pem,
                private_key_pem=cert_response.private_key_pem,
                expires_at=cert_response.expires_at,
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Protocol '{request.protocol}' not yet implemented. Only 'mqtt' is supported.",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to register device {request.name}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to register device. Please try again."
        ) from e


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
        raise HTTPException(status_code=500, detail="Failed to retrieve CA certificate.") from e


@app.get("/devices/{device_id}")
async def get_device(device_id: str) -> DeviceResponse:
    """
    Retrieve device information by ID.
    """
    try:
        with get_db_context() as db:
            device = db.query(Device).filter(Device.id == device_id).first()
            if not device:
                raise HTTPException(status_code=404, detail="Device not found")

            return DeviceResponse(
                id=device.id,
                name=device.name,
                location=device.location,
                protocol=device.protocol,
                connection_config=device.connection_config,
                created_at=device.created_at,
            )

    except Exception as e:
        logger.error(f"Failed to retrieve device {device_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve device information.") from e


@app.get("/devices/")
async def list_devices() -> list[DeviceResponse]:
    """
    List all registered devices.
    """
    try:
        with get_db_context() as db:
            devices = db.query(Device).all()
            return [
                DeviceResponse(
                    id=device.id,
                    name=device.name,
                    location=device.location,
                    protocol=device.protocol,
                    connection_config=device.connection_config,
                    created_at=device.created_at,
                )
                for device in devices
            ]

    except Exception as e:
        logger.error(f"Failed to list devices: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list devices.") from e


@app.post("/devices/{device_id}/revoke")
async def revoke_device_certificate(device_id: str):
    """
    Revoke a device's certificate by:
    1. Marking it as revoked in the database
    2. Adding it to the Certificate Revocation List (CRL)
    """
    try:
        with get_db_context() as db:
            device_cert = (
                db.query(DeviceCertificate).filter(DeviceCertificate.device_id == device_id).first()
            )
            if not device_cert:
                raise HTTPException(status_code=404, detail="Device certificate not found")

            if device_cert.revoked_at:
                raise HTTPException(status_code=400, detail="Certificate already revoked")

            cert_manager.revoke_certificate(device_cert.certificate_pem)

            device_cert.revoked_at = datetime.datetime.now(datetime.UTC)
            db.commit()

            logger.info(f"Successfully revoked certificate for device {device_id}")

            return {
                "device_id": device_id,
                "revoked_at": device_cert.revoked_at.isoformat(),
                "message": "Certificate revoked successfully",
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to revoke device {device_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to revoke device certificate.") from e


@app.get("/crl")
async def get_crl():
    """
    Get the Certificate Revocation List (CRL) in PEM format.
    Mosquitto and other MQTT clients can check this to validate certificates.
    """
    try:
        crl_pem = cert_manager.get_crl_pem()
        if not crl_pem:
            return {"message": "No certificates have been revoked yet"}
        return {"crl_pem": crl_pem}
    except Exception as e:
        logger.error(f"Failed to retrieve CRL: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve CRL.") from e


@app.post("/devices/{device_id}/renew")
async def renew_certificate(device_id: str):
    """
    Renew a device's certificate by issuing a new one and revoking the old one.

    This endpoint:
    1. Retrieves the current certificate from DB
    2. Generates a new certificate with new keys
    3. Revokes the old certificate (adds to CRL)
    4. Updates the database with the new certificate
    5. Returns the new credentials
    """
    try:
        with get_db_context() as db:
            # Get current certificate
            device_cert = (
                db.query(DeviceCertificate)
                .filter(
                    DeviceCertificate.device_id == device_id,
                    # DeviceCertificate.revoked_at.is_(None)
                )
                .first()
            )
            if not device_cert:
                raise HTTPException(
                    status_code=404, detail="No active certificate found for device"
                )

            # Check if certificate is about to expire (optional warning)
            days_until_expiry = (device_cert.expires_at - datetime.datetime.now(datetime.UTC)).days
            if days_until_expiry > 30:
                logger.warning(
                    f"Certificate for device {device_id} renewed early "
                    f"({days_until_expiry} days remaining)"
                )

            # Revoke old certificate and add to CRL
            cert_manager.revoke_certificate(device_cert.certificate_pem)
            device_cert.revoked_at = datetime.datetime.now(datetime.UTC)

            # Generate new certificate with new keys
            new_cert_pem, new_key_pem = cert_manager.renew_certificate(
                current_cert_pem=device_cert.certificate_pem, validity_days=365, key_size=4096
            )

            # Extract certificate ID (serial number) from the new certificate
            from cryptography import x509

            new_cert = x509.load_pem_x509_certificate(new_cert_pem)
            new_cert_id = format(new_cert.serial_number, "x")

            # Create new certificate record in DB
            now = datetime.datetime.now(datetime.UTC)
            new_device_cert = DeviceCertificate(
                id=new_cert_id,
                device_id=device_id,
                certificate_pem=new_cert_pem.decode("utf-8"),
                private_key_pem=new_key_pem.decode("utf-8"),
                issued_at=now,
                expires_at=now + datetime.timedelta(days=365),
            )
            db.add(new_device_cert)
            db.commit()

            logger.info(f"Successfully renewed certificate for device {device_id}")

            device = db.query(Device).filter(Device.id == device_id).first()

            return DeviceRegistrationResponse(
                device_id=device_id,
                protocol=device.protocol if device else "mqtt",
                certificate_id=new_cert_id,
                ca_certificate_pem=cert_manager.get_ca_certificate_pem(),
                certificate_pem=new_device_cert.certificate_pem,
                private_key_pem=new_device_cert.private_key_pem,
                expires_at=new_device_cert.expires_at,
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to renew certificate for device {device_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to renew device certificate.") from e
