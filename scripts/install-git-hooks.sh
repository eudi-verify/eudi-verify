#!/usr/bin/env bash
# Install git hooks from scripts/git-hooks/ into .git/hooks/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK_SRC="$ROOT/scripts/git-hooks/pre-push"
HOOK_DEST="$ROOT/.git/hooks/pre-push"

if [[ ! -d "$ROOT/.git" ]]; then
  echo "Not a git repository: $ROOT" >&2
  exit 1
fi

cp "$HOOK_SRC" "$HOOK_DEST"
chmod +x "$HOOK_DEST"
echo "Installed pre-push hook -> $HOOK_DEST"
echo "It runs 'pnpm verify' before every push. Skip with: git push --no-verify"
