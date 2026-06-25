#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_LISTEN="${API_PORT:-3000}"

cd "$ROOT/examples/server"
PORT="$API_LISTEN" node --import tsx server.ts &

cd "$ROOT/examples/html-vanilla"
exec node --import tsx server.ts
