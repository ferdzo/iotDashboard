#!/bin/bash
set -e

CERT_DIR="certs"
DOMAINS="${@:-localhost}"

mkdir -p "$CERT_DIR"

echo "Generating CA..."
openssl genrsa -out "$CERT_DIR/ca.key" 4096
openssl req -new -x509 -days 3650 -key "$CERT_DIR/ca.key" -out "$CERT_DIR/ca.crt" \
    -subj "/C=MK/ST=State/L=City/O=IoTDashboard/OU=DeviceManager/CN=IoT Device CA"

echo "Generating server certificate..."
openssl genrsa -out "$CERT_DIR/server.key" 4096
openssl req -new -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" \
    -subj "/C=MK/ST=State/L=City/O=IoTDashboard/OU=MQTT/CN=${1:-localhost}"

echo "subjectAltName = @alt_names" > "$CERT_DIR/server.ext"
echo "[alt_names]" >> "$CERT_DIR/server.ext"

INDEX=1
for DOMAIN in $DOMAINS; do
    if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "IP.$INDEX = $DOMAIN" >> "$CERT_DIR/server.ext"
    else
        echo "DNS.$INDEX = $DOMAIN" >> "$CERT_DIR/server.ext"
    fi
    INDEX=$((INDEX + 1))
done

openssl x509 -req -in "$CERT_DIR/server.csr" -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" \
    -CAcreateserial -out "$CERT_DIR/server.crt" -days 365 -sha256 -extfile "$CERT_DIR/server.ext"

rm "$CERT_DIR/server.csr" "$CERT_DIR/server.ext" "$CERT_DIR/ca.srl"
chmod 600 "$CERT_DIR/ca.key" "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/ca.crt" "$CERT_DIR/server.crt"

echo "Done! Server cert valid for: $DOMAINS"
