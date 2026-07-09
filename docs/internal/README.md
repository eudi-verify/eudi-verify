# Maintainer-only notes (`docs/internal/`)

Canonical public/private rules: `.cursor/rules/docs-boundary.mdc`.

Files named `*.local.md` in this directory are **gitignored** (see root `.gitignore`). Use them for operational decisions, server-specific runbooks, and infra context that must not land in the public repo.

**Committed (public):** this README only.

**Gitignored examples:**

| File                  | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `cdn-origin.local.md` | CDN origin lockdown, cron, DNS cutover notes |

**Also gitignored at repo root:** `PLAN.local.md` — funding strategy and session bootstrap (not infra runbooks).

**Related public docs:**

- `docs/deploy-cdn-examples.md` — provider-generic CDN supplements

Off-repo reusable playbooks live on the maintainer machine; see `docs-boundary.mdc`.

When adding a new private note, prefer a focused `*.local.md` file here over growing `PLAN.local.md`.
