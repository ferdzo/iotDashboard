#!/bin/bash
set -e

CERT_DIR="certs"
SERVER_IP="${1:-localhost}"

mkdir -p "$CERT_DIR"

openssl genrsa -out "$CERT_DIR/ca.key" 4096
openssl req -new -x509 -days 3650 -key "$CERT_DIR/ca.key" -out "$CERT_DIR/ca.crt" \
    -subj "/C=MK/ST=State/L=City/O=IoTDashboard/OU=DeviceManager/CN=IoT Device CA"

openssl genrsa -out "$CERT_DIR/server.key" 4096
openssl req -new -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" \
    -subj "/C=MK/ST=State/L=City/O=IoTDashboard/OU=MQTT/CN=$SERVER_IP"

cat > "$CERT_DIR/server.ext" << EOF
subjectAltName = @alt_names
[alt_names]
IP.1 = $SERVER_IP
DNS.1 = localhost
EOF

openssl x509 -req -in "$CERT_DIR/server.csr" -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" \
    -CAcreateserial -out "$CERT_DIR/server.crt" -days 365 -sha256 -extfile "$CERT_DIR/server.ext"

rm "$CERT_DIR/server.csr" "$CERT_DIR/server.ext" "$CERT_DIR/ca.srl"

chmod 600 "$CERT_DIR/ca.key" "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/ca.crt" "$CERT_DIR/server.crt"

echo "Certificates created:"
echo "  CA: $CERT_DIR/ca.crt"
echo "  Server: $CERT_DIR/server.crt (valid for $SERVER_IP)"
