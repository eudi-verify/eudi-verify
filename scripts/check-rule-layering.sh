#!/usr/bin/env bash
# Deterministic structural check for the canon/pointer rule layering
# (see docs/rules/*.md, .cursor/rules/*.mdc, .claude/skills, .claude/rules).
# No AI involved: plain file-existence and grep checks. Run before/after
# touching any rule file. Exits non-zero with a list of every failure found.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail=0
note() { echo "FAIL: $1" >&2; fail=1; }

# 1. Every .cursor/rules/*.mdc points at a docs/rules/*.md that exists,
#    and its body (everything after the closing --- frontmatter fence)
#    isn't so long it looks like restated canon rather than a pointer.
for mdc in .cursor/rules/*.mdc; do
  name="$(basename "$mdc" .mdc)"
  body="$(awk '/^---$/{c++; next} c>=2' "$mdc")"
  body_lines="$(echo "$body" | grep -cve '^\s*$' -e '^#')"

  canon_ref="$(echo "$body" | grep -oE '(docs/rules|docs/internal)/[A-Za-z0-9_.-]+\.md' | head -1)"
  if [[ -z "$canon_ref" ]]; then
    note "$mdc: no docs/rules/*.md (or docs/internal/*.local.md) reference in body, every rule needs a canon pointer"
  elif [[ ! -f "$canon_ref" ]]; then
    note "$mdc: points at '$canon_ref', which does not exist"
  fi

  if [[ "$body_lines" -gt 4 ]]; then
    note "$mdc: body has $body_lines non-blank/non-heading lines, looks like restated canon, not a pointer (want <=4)"
  fi
done

# 2. Every docs/rules/*.md is referenced by at least one .mdc or SKILL.md,
#    so canon never goes orphaned when a rule is renamed or deleted.
for canon in docs/rules/*.md; do
  refname="$(basename "$canon")"
  if ! grep -rlq "$refname" .cursor/rules/*.mdc .claude/skills/*/SKILL.md .claude/rules/*.md 2>/dev/null; then
    note "$canon: not referenced by any .mdc, SKILL.md, or .claude/rules symlink"
  fi
done

# 3. Every .claude/skills/*/SKILL.md points at a docs/rules/*.md that exists.
for skill in .claude/skills/*/SKILL.md; do
  canon_ref="$(grep -oE 'docs/rules/[A-Za-z0-9_-]+\.md' "$skill" | head -1)"
  if [[ -z "$canon_ref" ]]; then
    # plan-mode's skill intentionally routes through .cursor/rules/plan-mode.mdc
    if ! grep -q '\.cursor/rules/' "$skill"; then
      note "$skill: no docs/rules/*.md or .cursor/rules/*.mdc reference"
    fi
  elif [[ ! -f "$canon_ref" ]]; then
    note "$skill: points at '$canon_ref', which does not exist"
  fi
done

# 4. Every .claude/rules/*.md is a symlink, not a plain file (would mean
#    canon got duplicated instead of shared), and it isn't dangling.
for link in .claude/rules/*.md; do
  [[ -e "$link" || -L "$link" ]] || continue
  if [[ ! -L "$link" ]]; then
    note "$link: is a regular file, expected a symlink to docs/rules/ or docs/internal/"
  elif [[ ! -e "$link" ]]; then
    note "$link: broken symlink -> $(readlink "$link")"
  fi
done

# 5. Every row in the AGENTS.md rule table names a Canon file that exists.
while IFS= read -r canon_path; do
  [[ -f "$canon_path" ]] || note "AGENTS.md: rule table references '$canon_path', which does not exist"
done < <(grep -oE '`(docs/rules|docs/internal)/[A-Za-z0-9_./-]+\.md`' AGENTS.md | tr -d '`')

if [[ "$fail" -eq 0 ]]; then
  echo "Rule layering check OK ($(ls .cursor/rules/*.mdc | wc -l | tr -d ' ') rules)"
fi
exit "$fail"
