#!/usr/bin/env bash
#
# START.sh — launch the MONOLITH streetwear API (Express + MySQL)
#
# Starts server/index.js as a detached background process, writing logs to
# server.log and the process id to server.pid.
#
set -euo pipefail

# Always operate from the directory that contains this script.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# Environment defaults (only set when not already provided by the shell/.env)
# ---------------------------------------------------------------------------
export SSL_ENABLED="${SSL_ENABLED:-true}"
export SSL_CERT_PATH="${SSL_CERT_PATH:-/home/arx-app/backends/certs/certificate.crt}"
export SSL_KEY_PATH="${SSL_KEY_PATH:-/home/arx-app/backends/certs/private.key}"
export PORT="${PORT:-4118}"
export NODE_ENV="${NODE_ENV:-production}"

# ---------------------------------------------------------------------------
# Sanity checks
# ---------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "[START.sh] ERROR: node is not installed or not on PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[START.sh] ERROR: npm is not installed or not on PATH." >&2
  exit 1
fi

if [ ! -f "server/index.js" ]; then
  echo "[START.sh] ERROR: server/index.js not found in $SCRIPT_DIR." >&2
  exit 1
fi

if [ "$SSL_ENABLED" = "true" ]; then
  if [ ! -f "$SSL_CERT_PATH" ] || [ ! -f "$SSL_KEY_PATH" ]; then
    echo "[START.sh] WARNING: SSL_ENABLED=true but certificate or key file is missing."
    echo "[START.sh]          cert: $SSL_CERT_PATH"
    echo "[START.sh]          key : $SSL_KEY_PATH"
  fi
fi

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
if [ ! -d "node_modules" ]; then
  echo "[START.sh] node_modules missing — installing production dependencies..."
  npm install --omit=dev
fi

# ---------------------------------------------------------------------------
# Stop any previously started instance recorded in server.pid
# ---------------------------------------------------------------------------
if [ -f "server.pid" ]; then
  OLD_PID="$(cat server.pid 2>/dev/null || true)"
  if [ -n "${OLD_PID:-}" ] && kill -0 "$OLD_PID" >/dev/null 2>&1; then
    echo "[START.sh] Stopping previous instance (pid $OLD_PID)..."
    kill "$OLD_PID" >/dev/null 2>&1 || true
    sleep 2
    if kill -0 "$OLD_PID" >/dev/null 2>&1; then
      kill -9 "$OLD_PID" >/dev/null 2>&1 || true
    fi
  fi
  rm -f server.pid
fi

# ---------------------------------------------------------------------------
# Launch
# ---------------------------------------------------------------------------
echo "[START.sh] Starting API on port $PORT (SSL_ENABLED=$SSL_ENABLED)..."
nohup node server/index.js > server.log 2>&1 &
APP_PID=$!
echo "$APP_PID" > server.pid

sleep 2
if kill -0 "$APP_PID" >/dev/null 2>&1; then
  echo "[START.sh] API running with pid $APP_PID (logs: $SCRIPT_DIR/server.log)"
else
  echo "[START.sh] ERROR: API failed to start. Last lines of server.log:" >&2
  tail -n 40 server.log >&2 || true
  rm -f server.pid
  exit 1
fi