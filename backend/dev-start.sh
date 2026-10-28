#!/bin/sh
# Dev container entrypoint (docker-compose.dev.yml): install deps into /deps
# (a bind mount, so they persist across restarts), then run uvicorn with reload.
set -e

hash=$(cat requirements.txt requirements-dev.txt | md5sum | cut -d' ' -f1)
if [ "$(cat /deps/.requirements-hash 2>/dev/null)" = "$hash" ]; then
    echo "[dev] Python dependencies up to date"
else
    echo "[dev] Installing Python dependencies (first run takes a few minutes)..."
    pip install --target /deps --progress-bar off -r requirements.txt -r requirements-dev.txt
    echo "$hash" > /deps/.requirements-hash
fi

echo "[dev] Starting uvicorn on :8000"
exec python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
