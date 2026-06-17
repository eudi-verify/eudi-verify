#!/usr/bin/env bash
# Mirrors .github/workflows/ci.yml — run locally before push: pnpm verify
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/ensure-node.sh"
cd "$ROOT"

echo "==> Install (frozen lockfile)"
pnpm install --frozen-lockfile

echo "==> Build"
pnpm build

echo "==> Typecheck"
pnpm -r typecheck

echo "==> Format check"
pnpm format:check

echo "==> Lint OpenAPI spec"
pnpm lint:api

echo "==> Test"
pnpm test

echo "==> License check"
npx --yes license-checker-rseidelsohn \
  --onlyAllow "Apache-2.0;MIT;BSD-2-Clause;BSD-3-Clause;ISC;0BSD" \
  --excludePrivatePackages

echo "==> Security audit"
pnpm audit --audit-level=high

echo ""
echo "All CI checks passed."
