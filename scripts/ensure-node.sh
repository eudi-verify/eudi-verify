#!/usr/bin/env bash
# Ensure Node.js 22+ (required by pnpm 11 and package.json engines).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -f "$ROOT/.nvmrc" ] && [ -f "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm use --silent 2>/dev/null || nvm install --silent
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but not found." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node.js 22+ required (found $(node -v))." >&2
  echo "Run: nvm use" >&2
  exit 1
fi
