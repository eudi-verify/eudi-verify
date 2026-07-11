#!/usr/bin/env bash
# ponytail: O(1) grep — fails release docs that lag packages/*/package.json
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(
  node -e "console.log(require('${ROOT}/packages/server/package.json').version)"
)"

check() {
  local file="$1" pattern="$2"
  if ! grep -qF "$pattern" "$file"; then
    echo "check-docs-version: expected '$pattern' in ${file#$ROOT/}" >&2
    exit 1
  fi
}

check "$ROOT/docs/SUPPORTED.md" "v${VERSION}"
check "$ROOT/THREAT_MODEL.md" "**Version**: ${VERSION}"
check "$ROOT/DEPENDENCY.md" "**Version**: ${VERSION}"

echo "Docs version check OK (${VERSION})"
