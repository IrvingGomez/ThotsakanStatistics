#!/bin/sh
# Dev container entrypoint (docker-compose.dev.yml): reinstall node_modules (a named
# volume, so it persists across restarts) only when package-lock.json changed, then
# run the Vite dev server.
set -e

hash=$(md5sum package-lock.json | cut -d' ' -f1)
if [ "$(cat node_modules/.package-lock-hash 2>/dev/null)" = "$hash" ]; then
    echo "[dev] Node dependencies up to date"
else
    echo "[dev] Installing Node dependencies (first run takes a few minutes)..."
    npm ci
    echo "$hash" > node_modules/.package-lock-hash
fi

echo "[dev] Starting Vite on :5173"
exec npm run dev -- --host 0.0.0.0
