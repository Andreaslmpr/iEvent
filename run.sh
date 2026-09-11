#!/usr/bin/env bash
# Εκκίνηση του StayApp API πάνω από HTTPS (εκφώνηση §1: SSL/TLS υποχρεωτικό).
set -e
cd "$(dirname "$0")"

if [ ! -f certs/cert.pem ]; then
  echo "Λείπουν τα πιστοποιητικά. Τρέξε πρώτα: bash make-certs.sh" >&2
  exit 1
fi

exec .venv/bin/python -m uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --ssl-keyfile  certs/key.pem \
  --ssl-certfile certs/cert.pem \
  --reload
