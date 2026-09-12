#!/usr/bin/env bash
# Δημιουργεί self-signed πιστοποιητικό για ανάπτυξη σε localhost.
set -e
cd "$(dirname "$0")"

# Το Git Bash των Windows μετατρέπει το "/C=GR/ST=..." του -subj σε διαδρομή
# (C:/Program Files/Git/C=GR/...) και το openssl το απορρίπτει. Σε Linux/macOS
# η μεταβλητή αγνοείται, οπότε είναι ασφαλής παντού.
export MSYS_NO_PATHCONV=1

mkdir -p certs
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout certs/key.pem -out certs/cert.pem \
  -subj "/C=GR/ST=Attica/L=Athens/O=StayApp/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
echo "Έτοιμα: certs/cert.pem, certs/key.pem"
