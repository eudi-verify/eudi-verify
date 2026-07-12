#!/usr/bin/env bash
# Scan committed source/docs for trojan-source patterns and off-screen code padding.
# ponytail: git ls-files only — never node_modules; CI mirrors local via pnpm verify.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MIN_SPACE_RUN=80
MAX_CODE_LINE=500

is_ignored_path() {
  case "$1" in
    *node_modules/* | */dist/* | *playwright-report/* | pnpm-lock.yaml) return 0 ;;
  esac
  return 1
}

code_files=()
md_files=()
while IFS= read -r -d '' path; do
  is_ignored_path "$path" && continue
  case "$path" in
    *.ts | *.tsx | *.mts | *.cts | *.mjs | *.js | *.sh | *.yaml | *.yml | *.json | *.html)
      code_files+=("$path")
      ;;
    *.md) md_files+=("$path") ;;
  esac
done < <(git ls-files -z)

echo "==> Trojan-source scan (code): ${#code_files[@]} files"
if ((${#code_files[@]} > 0)); then
  npx --yes anti-trojan-source "${code_files[@]}"
fi

echo "==> Bidi / zero-width scan (markdown): ${#md_files[@]} files"
if ((${#md_files[@]} > 0)); then
  bidi_found=0
  rg -n --pcre2 '[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{2064}\x{FEFF}]' "${md_files[@]}" && bidi_found=1 || true
  if ((bidi_found != 0)); then
    echo "check-source-security: invisible Unicode in markdown" >&2
    exit 1
  fi
fi

echo "==> Off-screen padding scan (code)"
if ((${#code_files[@]} > 0)); then
  padding_found=0
  rg -n " {${MIN_SPACE_RUN},}" "${code_files[@]}" && padding_found=1 || true
  if ((padding_found != 0)); then
    echo "check-source-security: suspicious space padding in code" >&2
    exit 1
  fi
fi

echo "==> Long-line scan (code, max ${MAX_CODE_LINE} chars)"
long_lines=0
for path in "${code_files[@]}"; do
  line_no=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_no=$((line_no + 1))
    if ((${#line} > MAX_CODE_LINE)); then
      echo "${path}:${line_no}: ${#line} chars (max ${MAX_CODE_LINE})" >&2
      long_lines=1
    fi
  done <"$path"
done
if ((long_lines != 0)); then
  exit 1
fi

echo "Source security check OK"
