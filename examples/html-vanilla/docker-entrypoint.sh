#!/bin/sh
set -e

API_PID=
cleanup() {
  if [ -n "$API_PID" ]; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

cd /app/examples/server
PORT="${API_PORT:-3000}" node --import tsx server.ts &
API_PID=$!

cd /app/examples/html-vanilla
PORT="${PORT:-3001}" node --import tsx server.ts
