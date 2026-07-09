# Maintainer-only notes (`docs/internal/`)

Canonical public/private rules: `.cursor/rules/docs-boundary.mdc`.

Files named `*.local.md` in this directory are **gitignored** (see root `.gitignore`). Use them for operational decisions, server-specific runbooks, and infra context that must not land in the public repo.

**Committed (public):** this README only.

**Gitignored pattern:** `docs/internal/<topic>.local.md` — one focused file per topic (CDN cutover, deploy paths, cron, etc.). Do not commit these files or link to them from public docs.

**Related public docs:**

- `docs/deploy-eu.md` — provider-generic EU deployment
- `docs/deploy-cdn-examples.md` — provider-generic CDN supplements

Distill generic guidance into public `docs/`; keep hostnames, IPs, SSH aliases, and real cron paths in gitignored notes only. See `docs-boundary.mdc` for the full boundary.

When adding private context, prefer a new `*.local.md` file here over growing any other local-only note at the repo root.
