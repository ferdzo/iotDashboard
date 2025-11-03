import datetime
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from nanoid import generate

from app.config import config
from app.models import DeviceCertificateResponse, DeviceCredentials

lowercase_numbers = "abcdefghijklmnopqrstuvwxyz0123456789"


class CertificateManager:
    """Manages device certificate generation and handling"""

    def __init__(self):
        self.ca_cert: x509.Certificate = self.load_ca_certificate(config.CA_CERT_PATH)
        self.ca_key: rsa.RSAPrivateKey = self.load_ca_private_key(config.CA_KEY_PATH)
        self.ca_cert_pem: bytes = self.ca_cert.public_bytes(serialization.Encoding.PEM)


    def generate_device_id(self) -> str:
        """Generate a unique device ID using nanoid."""
        return generate(alphabet=lowercase_numbers, size=config.DEVICE_ID_LENGTH)


    def load_ca_certificate(self, ca_cert_path: str) -> x509.Certificate:
        """Load a CA certificate from file."""
        with open(ca_cert_path, "rb") as f:
            ca_data = f.read()
        ca_cert = x509.load_pem_x509_certificate(ca_data)
        return ca_cert


    def load_ca_private_key(self, ca_key_path: str, password: bytes = None) -> rsa.RSAPrivateKey:
        """Load a CA private key from file."""
        from cryptography.hazmat.primitives import serialization

        with open(ca_key_path, "rb") as f:
            key_data = f.read()
        ca_key = serialization.load_pem_private_key(key_data, password=password)
        return ca_key


    def generate_device_key(self, key_size: int = 4096) -> rsa.RSAPrivateKey:
        """Generate an RSA private key for a device."""
        return rsa.generate_private_key(public_exponent=65537, key_size=key_size)


    def generate_device_certificate(
        self,
        device_id: str,
        ca_cert: x509.Certificate,
        ca_key: rsa.RSAPrivateKey,
        device_key: rsa.RSAPrivateKey,
        validity_days: int = 365,
        key_size: int = 4096,
    ) -> tuple[bytes, bytes]:
        """Generate an X.509 certificate for a device signed by the CA."""

        subject = x509.Name(
            [
                x509.NameAttribute(NameOID.COMMON_NAME, device_id),
            ]
        )

        issuer = ca_cert.subject
        now = datetime.datetime.now(datetime.UTC)
        device_cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(device_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now)
            .not_valid_after(now + datetime.timedelta(days=validity_days))
            .add_extension(
                x509.BasicConstraints(ca=False, path_length=None),
                critical=True,
            )
            .sign(private_key=ca_key, algorithm=hashes.SHA256())
        )

        cert_pem = device_cert.public_bytes(serialization.Encoding.PEM)
        key_pem = device_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )

        return cert_pem, key_pem


    def create_device_credentials(
        self, device_id: str, validity_days: int = 365, key_size: int = 4096
    ) -> DeviceCredentials:
        """Create device credentials: private key and signed certificate.
        Returns:
            DeviceCredentials model with certificate_id, device_id, certificate_pem, private_key_pem, expires_at
        """
        device_key = self.generate_device_key(key_size=key_size)

        cert_pem, key_pem = self.generate_device_certificate(
            device_id=device_id,
            ca_cert=self.ca_cert,
            ca_key=self.ca_key,
            device_key=device_key,
            validity_days=validity_days,
            key_size=key_size,
        )

        # Extract serial number from certificate to use as ID
        cert = x509.load_pem_x509_certificate(cert_pem)
        cert_id = format(cert.serial_number, 'x')

        expires_at = datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=validity_days)

        return DeviceCredentials(
            certificate_id=cert_id,
            device_id=device_id,
            certificate_pem=cert_pem,
            private_key_pem=key_pem,
            expires_at=expires_at,
        )


    def register_device(self, name: str, location: str | None = None) -> DeviceCertificateResponse:
        """Register a new device and generate its credentials.
        Returns:
            DeviceCertificateResponse
        """
        device_id = self.generate_device_id()
        credentials = self.create_device_credentials(device_id=device_id)

        return DeviceCertificateResponse(
            certificate_id=credentials.certificate_id,
            device_id=credentials.device_id,
            ca_certificate_pem=self.ca_cert_pem.decode("utf-8"),
            certificate_pem=credentials.certificate_pem.decode("utf-8"),
            private_key_pem=credentials.private_key_pem.decode("utf-8"),
            expires_at=credentials.expires_at,
        )


    def get_ca_certificate_pem(self) -> str:
        """Get the CA certificate in PEM format as a string."""
        return self.ca_cert_pem.decode("utf-8")


    def revoke_certificate(
        self, certificate_pem: str, reason: x509.ReasonFlags = x509.ReasonFlags.unspecified
    ) -> None:
        """
        Revoke a device certificate by adding it to the CRL.

        Args:
            certificate_pem: PEM-encoded certificate to revoke
            reason: Revocation reason (default: unspecified)
        """
        # Load the certificate to get serial number
        cert = x509.load_pem_x509_certificate(certificate_pem.encode())

        # Load existing CRL or create new one
        crl_path = Path(config.CRL_PATH)
        revoked_certs = []

        if crl_path.exists():
            with open(crl_path, "rb") as f:
                existing_crl = x509.load_pem_x509_crl(f.read())
                # Copy existing revoked certificates
                revoked_certs = list(existing_crl)

        # Add the new revoked certificate
        revoked_cert = (
            x509.RevokedCertificateBuilder()
            .serial_number(cert.serial_number)
            .revocation_date(datetime.datetime.now(datetime.UTC))
            .add_extension(
                x509.CRLReason(reason),
                critical=False,
            )
            .build()
        )
        revoked_certs.append(revoked_cert)

        # Build new CRL with all revoked certificates
        crl_builder = x509.CertificateRevocationListBuilder()
        crl_builder = crl_builder.issuer_name(self.ca_cert.subject)
        crl_builder = crl_builder.last_update(datetime.datetime.now(datetime.UTC))
        crl_builder = crl_builder.next_update(
            datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=30)
        )

        for revoked in revoked_certs:
            crl_builder = crl_builder.add_revoked_certificate(revoked)

        # Sign the CRL with CA key
        crl = crl_builder.sign(private_key=self.ca_key, algorithm=hashes.SHA256())

        # Write CRL to file
        crl_path.parent.mkdir(parents=True, exist_ok=True)
        with open(crl_path, "wb") as f:
            f.write(crl.public_bytes(serialization.Encoding.PEM))


    def get_crl_pem(self) -> str | None:
        """Get the current CRL in PEM format."""
        crl_path = Path(config.CRL_PATH)
        if not crl_path.exists():
            return None

        with open(crl_path, "rb") as f:
            return f.read().decode("utf-8")


    def renew_certificate(
        self,
        current_cert_pem: str,
        validity_days: int = 365,
        key_size: int = 4096,
    ) -> tuple[bytes, bytes]:
        """Renew a device certificate before expiration.
        Args:
            current_cert_pem: PEM-encoded current certificate
            validity_days: Validity period for new certificate
            key_size: Key size for new device key
        Returns:
            tuple of (new_cert_pem, new_key_pem)
        """
        # Load current certificate
        current_cert = x509.load_pem_x509_certificate(current_cert_pem.encode())
        device_id = current_cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value

        # Generate new device key
        new_device_key = self.generate_device_key(key_size=key_size)

        # Generate new device certificate
        new_cert_pem, new_key_pem = self.generate_device_certificate(
            device_id=device_id,
            ca_cert=self.ca_cert,
            ca_key=self.ca_key,
            device_key=new_device_key,
            validity_days=validity_days,
            key_size=key_size,
        )

        return new_cert_pem, new_key_pem
