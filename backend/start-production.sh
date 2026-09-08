#!/usr/bin/env bash

set -euo pipefail


echo "Starting VIZORA production initialization..."


if [[ -n "${VIZORA_STORAGE_DIR:-}" ]]; then
  mkdir -p "${VIZORA_STORAGE_DIR}"
  mkdir -p "${VIZORA_STORAGE_DIR}/uploads"
fi


echo "Applying database migrations..."

python -m alembic upgrade head


echo "Starting VIZORA API..."

exec python -m uvicorn \
  app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --proxy-headers