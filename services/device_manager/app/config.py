import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuration settings for the Device Manager service."""

    DATABASE_URL = os.getenv("DATABASE_URL")

    SERVICE_DIR = Path(__file__).parent
    CERTS_DIR = SERVICE_DIR / "certs"
    CA_CERT_PATH = os.getenv("CA_CERT_PATH", str(CERTS_DIR / "ca.crt"))
    CA_KEY_PATH = os.getenv("CA_KEY_PATH", str(CERTS_DIR / "ca.key"))
    CRL_PATH = os.getenv("CRL_PATH", str(CERTS_DIR / "ca.crl"))

    # Certificate settings
    CERT_VALIDITY_DAYS = int(os.getenv("CERT_VALIDITY_DAYS", "365"))
    CERT_KEY_SIZE = int(os.getenv("CERT_KEY_SIZE", "4096"))

    # Device ID settings
    DEVICE_ID_LENGTH = int(os.getenv("DEVICE_ID_LENGTH", "8"))

    # Service settings
    SERVICE_HOST = os.getenv("DEVICE_MANAGER_HOST", "0.0.0.0")
    SERVICE_PORT = int(os.getenv("DEVICE_MANAGER_PORT", "8000"))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # MQTT command-publish settings (BFF actuation path, todo 7).
    # Uses a dedicated command client identity (MQTT_COMMAND_CERT/KEY),
    # separate from the ingestion identity, following the tls_set pattern
    # in services/mqtt_ingestion/src/mqtt_client.py.
    MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
    MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_TLS = os.getenv("MQTT_TLS", "False").lower() in ("1", "true", "yes")
    MQTT_CA_CERT = os.getenv("MQTT_CA_CERT")
    MQTT_COMMAND_CERT = os.getenv("MQTT_COMMAND_CERT")
    MQTT_COMMAND_KEY = os.getenv("MQTT_COMMAND_KEY")


config = Config()
