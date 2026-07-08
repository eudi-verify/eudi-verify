#!/bin/sh
set -e

# ponytail: shell must stay PID 1 (no exec) so trap kills API child on systemd stop
API_PID=
cleanup() {
  if [ -n "$API_PID" ]; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_LISTEN="${API_PORT:-3000}"
STATIC_LISTEN="${PORT:-3001}"

cd "$ROOT/examples/server"
PORT="$API_LISTEN" node --import tsx server.ts &
API_PID=$!

cd "$ROOT/examples/html-vanilla"
PORT="$STATIC_LISTEN" node --import tsx server.ts
