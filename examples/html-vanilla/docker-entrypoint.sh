#!/bin/sh
set -e

cd /app/examples/server
node --import tsx server.ts &

cd /app/examples/html-vanilla
exec node --import tsx server.ts
