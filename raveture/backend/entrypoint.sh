#!/bin/sh
set -e

export FLASK_APP=run.py

echo "==> Waiting for database and running migrations..."
until flask db upgrade 2>&1; do
  echo "    Migrations failed (DB not ready?), retrying in 3s..."
  sleep 3
done
echo "==> Migrations complete."

echo "==> Seeding admin user..."
python scripts/seed_admin.py 2>/dev/null && echo "==> Admin seeded." || echo "==> Admin seed skipped (already exists or error)."

echo "==> Starting backend on port ${FLASK_PORT:-5050}..."
exec python run.py
