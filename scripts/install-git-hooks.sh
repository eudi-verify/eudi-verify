#!/usr/bin/env bash
# Install git hooks from scripts/git-hooks/ into .git/hooks/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$ROOT/scripts/git-hooks"

if [[ ! -d "$ROOT/.git" ]]; then
  echo "Not a git repository: $ROOT" >&2
  exit 1
fi

for name in pre-commit pre-push; do
  cp "$HOOKS_DIR/$name" "$ROOT/.git/hooks/$name"
  chmod +x "$ROOT/.git/hooks/$name"
  echo "Installed $name hook -> $ROOT/.git/hooks/$name"
done

echo ""
echo "pre-commit: prettier on staged files (skip with git commit --no-verify)"
echo "pre-push:   pnpm verify (skip with git push --no-verify)"
