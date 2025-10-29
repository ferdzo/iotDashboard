#!/bin/bash
# Script to generate a Certificate Authority (CA) for IoT devices
CERT_DIR="certs"
CA_KEY="$CERT_DIR/ca.key"
CA_CERT="$CERT_DIR/ca.crt"

# Create certs directory
mkdir -p "$CERT_DIR"

echo "Generating CA Certificate Authority..."

# Generate CA private key (4096-bit RSA)
openssl genrsa -out "$CA_KEY" 4096
echo "Generated CA private key: $CA_KEY"

# Generate CA certificate (valid for 10 years)
openssl req -new -x509 -days 3650 -key "$CA_KEY" -out "$CA_CERT" \
    -subj "/C=US/ST=State/L=City/O=IoTDashboard/OU=DeviceManager/CN=IoT Device CA"
echo "Generated CA certificate: $CA_CERT"

# Set secure permissions
chmod 600 "$CA_KEY"
chmod 644 "$CA_CERT"

echo ""
echo "CA Certificate Authority created successfully!"
echo ""
echo "CA Certificate Details:"
openssl x509 -in "$CA_CERT" -noout -text | grep -A 2 "Subject:"
echo ""
echo "Valid from:"
openssl x509 -in "$CA_CERT" -noout -startdate
echo "Valid until:"
openssl x509 -in "$CA_CERT" -noout -enddate
