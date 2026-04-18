#!/bin/sh
# Zapíše env proměnné do .env souboru, který Vite čte při startu dev serveru
cat > /app/.env << EOF
VITE_RAVETURE_API_URL=${VITE_RAVETURE_API_URL:-http://localhost:5050}
VITE_TICKETING_API_URL=${VITE_TICKETING_API_URL:-http://localhost:5001}
VITE_TICKETING_API_KEY=${VITE_TICKETING_API_KEY:-rt_dev_docker_key}
VITE_USE_GOPAY=${VITE_USE_GOPAY:-false}
EOF

echo "==> Starting frontend dev server..."
exec npm run dev -- --host
