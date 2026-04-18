#!/bin/sh
set -e

export FLASK_APP=run.py

echo "==> Waiting for database and running migrations..."
until flask db upgrade 2>&1; do
  echo "    Migrations failed (DB not ready?), retrying in 3s..."
  sleep 3
done
echo "==> Migrations complete."

echo "==> Starting ticketing service on port ${FLASK_PORT:-5001}..."
exec python run.py
