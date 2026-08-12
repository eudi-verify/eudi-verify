# Private notes convention

Canonical public/private rules: `docs/rules/docs-boundary.md`.

**This directory is public in git** — only this README is committed. Privacy is by **filename**, not folder: `*.local.md` anywhere in the repo is gitignored (see root `.gitignore`).

Maintainers may add `docs/internal/<topic>.local.md` for ops runbooks (deploy paths, GitHub admin, cron, etc.). Those files must not be committed or linked from public docs.

| File                                    | Topic                                   |
| --------------------------------------- | --------------------------------------- |
| `runbook.local.md`                      | Maintainer tracker                      |
| `openeudi-reply.local.md`               | Draft upstream reply                    |
| `openid4vp-lab-notes.local.md`          | OpenID4VP lab notes                     |
| `cdn-origin.local.md`                   | CDN → origin ops                        |
| `cdn-apex.local.md`                     | Apex DNS / CDN                          |
| `launch-monitor.local.md`               | Launch probe / ops-watch                |
| `ci-branch-protection.local.md`         | Branch protection admin                 |
| `haip-spike-plan-v2.local.md`           | HAIP spike plan (v1 deleted 2026-08-12) |
| `haip-conformance-suite-howto.local.md` | How to (re)run the OIDF HAIP suite      |
| `sprind-sandbox-call.local.md`          | SPRIND / German sandbox call prep       |
| `outreach-plan.local.md`                | Outreach plan                           |
| `maintainer-local.local.md`             | This-machine deploy targets, backup     |
| `oidf-certification-handoff.local.md`   | OIDF HAIP self-cert: decision record    |
| `oidf-cert-exec-plan.local.md`          | OIDF self-cert: the executable steps    |

**Related public docs:**

- `docs/deploy-eu.md` — provider-generic EU deployment
- `docs/deploy-cdn-examples.md` — provider-generic CDN supplements

Distill generic guidance into public `docs/`; keep hostnames, IPs, SSH aliases, and admin checklists in gitignored `*.local.md` only.
