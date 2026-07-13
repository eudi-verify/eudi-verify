# Private notes convention

Canonical public/private rules: `.cursor/rules/docs-boundary.mdc`.

**This directory is public in git** — only this README is committed. Privacy is by **filename**, not folder: `*.local.md` anywhere in the repo is gitignored (see root `.gitignore`).

Maintainers may add `docs/internal/<topic>.local.md` for ops runbooks (deploy paths, GitHub admin, cron, etc.). Those files must not be committed or linked from public docs.

**Related public docs:**

- `docs/deploy-eu.md` — provider-generic EU deployment
- `docs/deploy-cdn-examples.md` — provider-generic CDN supplements

Distill generic guidance into public `docs/`; keep hostnames, IPs, SSH aliases, and admin checklists in gitignored `*.local.md` only.
