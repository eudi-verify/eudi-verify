#!/usr/bin/env bash
# Fails if a published package depends on a non-registry spec (git/github/tarball
# URL). pnpm 11+ consumers reject these as transitive deps (ERR_PNPM_EXOTIC_SUBDEP);
# `pnpm install --frozen-lockfile` in CI never re-resolves them, so nothing else
# in `pnpm verify` catches this before it ships.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail=0
for pkg in packages/*/package.json; do
  node -e "
    const pkg = require('./$pkg');
    const specs = { ...pkg.dependencies, ...pkg.peerDependencies };
    for (const [name, spec] of Object.entries(specs)) {
      if (/^(git\+|git:|github:|https?:\/\/)/.test(spec)) {
        console.error(\`$pkg: \${name} depends on non-registry spec '\${spec}'\`);
        process.exit(1);
      }
    }
  " || fail=1
done

if [ "$fail" -ne 0 ]; then
  echo "Non-registry dependency found in a published package — pnpm 11+ consumers can't install it (ERR_PNPM_EXOTIC_SUBDEP). Pin to a released npm version instead." >&2
  exit 1
fi

echo "Publishable dependency check OK"
