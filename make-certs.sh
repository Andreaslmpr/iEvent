#!/usr/bin/env bash
# Δημιουργεί self-signed πιστοποιητικό για ανάπτυξη σε localhost.
set -e
cd "$(dirname "$0")"
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout certs/key.pem -out certs/cert.pem \
  -subj "/C=GR/ST=Attica/L=Athens/O=StayApp/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
echo "Έτοιμα: certs/cert.pem, certs/key.pem"
