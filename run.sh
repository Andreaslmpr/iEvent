#!/usr/bin/env bash
# Εκκίνηση του StayApp API πάνω από HTTPS (εκφώνηση §1: SSL/TLS υποχρεωτικό).
set -e
cd "$(dirname "$0")"

if [ ! -f certs/cert.pem ]; then
  echo "Λείπουν τα πιστοποιητικά. Τρέξε πρώτα: bash make-certs.sh" >&2
  exit 1
fi

# Το venv έχει διαφορετική δομή ανά πλατφόρμα: bin/ σε Linux/macOS,
# Scripts/ σε Windows (Git Bash). Διαλέγουμε ό,τι υπάρχει.
PYTHON=".venv/bin/python"
[ -x "$PYTHON" ] || PYTHON=".venv/Scripts/python.exe"

if [ ! -x "$PYTHON" ]; then
  echo "Λείπει το virtualenv. Τρέξε πρώτα:" >&2
  echo "  python -m venv .venv && .venv/bin/pip install -r requirements.txt" >&2
  echo "  (σε Windows: .venv/Scripts/pip install -r requirements.txt)" >&2
  exit 1
fi

# Η κονσόλα των Windows είναι cp1252 και σκάει σε κάθε print με ελληνικά
# (π.χ. το μήνυμα του seed_admin στο main.py). Το UTF-8 το λύνει παντού.
export PYTHONIOENCODING=utf-8

exec "$PYTHON" -m uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --ssl-keyfile  certs/key.pem \
  --ssl-certfile certs/cert.pem \
  --reload
