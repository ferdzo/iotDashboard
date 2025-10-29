from fastapi import FastAPI

from cert_manager import CertificateManager
from models import DeviceRegistrationRequest, DeviceRegistrationResponse

app = FastAPI()

cert_manager = CertificateManager()

@app.get("/")
async def hello():
    return {"Hello": "World"}

@app.post("/devices/register")
async def register_device(request: DeviceRegistrationRequest) -> DeviceRegistrationResponse:
    """
    Register a new device and issue an X.509 certificate.
    """
    response = cert_manager.register_device(
        name=request.name,
        location=request.location,
    )


    return response

