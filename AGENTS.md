# AGENTS.md — eudi-verify

Framework-agnostic EUDI Wallet verifier kit. See [README.md](README.md) for overview.

## Read first

- [CONTRIBUTING.md](CONTRIBUTING.md) — setup, `pnpm verify`, commit style, AI policy
- [docs/SUPPORTED.md](docs/SUPPORTED.md) — supported vs roadmap (canonical for public claims)
- [docs/INTEGRATION.md](docs/INTEGRATION.md) — end-to-end integration
- [THREAT_MODEL.md](THREAT_MODEL.md) — security controls and threat status
- [openapi/eudi-verifier.yaml](openapi/eudi-verifier.yaml) — API contract
- `docs/rules/docs-boundary.md` — public vs private docs (canonical); private notes in `*.local.md` / `docs/internal/`

## Verify first

- **Don't assume** — read the code, check docs, or run read-only checks before stating something as fact.
- **Resolve, then ask** — try to answer open questions yourself; escalate only what research can't settle or what is a genuine decision for me.
- **Push back** — I make mistakes. If my premises look wrong, say so with reasoning instead of complying silently.

## Hard constraints

- **No live deploys, commits, or pushes** unless the user explicitly requests them in that message — no `git push`, `gh pr create`, issue/PR comments, `scp`/`rsync`, or remote restarts/provision scripts. Plan Build / "complete all todos" / plan checklists do **not** authorize remote writes; give copy-paste steps for the user to run (see `docs/rules/no-live-deploy.md`)
- **No GitHub co-author / product branding** — never add `Co-authored-by:` for Cursor/bots (pollutes contributors) or "Made with Cursor" (or similar) on PR bodies. Do keep the repo's `AI-assisted:` commit footer when drafting commit text (see `.cursor/rules/commit-style.mdc` / `CONTRIBUTING.md`)
- **Node.js 22+**, pnpm workspaces, TypeScript strict mode

- **Public accuracy**: `docs/SUPPORTED.md` is canonical — do not claim unsupported platforms or packages exist
- **Public vs private docs**: classify before writing — maintainer ops and post-merge admin go in gitignored `*.local.md`, not `CONTRIBUTING.md` / PR templates / workflow comments; see `docs/rules/docs-boundary.md`
- **Sovereignty**: no US identity SaaS in core; see `docs/rules/project-context.md`
- **Security**: update [THREAT_MODEL.md](THREAT_MODEL.md) when changing security controls
- **Verify locally**: `pnpm verify` mirrors CI before claiming checks pass
- **Planning**: read-only planning phase before code changes — rules in [docs/rules/plan-mode.md](docs/rules/plan-mode.md); enter via Cursor Plan mode + `@plan-mode`, or Claude Code `/plan` followed by `/plan-mode`

## Agent rules

Rule text lives once, in plain markdown under [`docs/rules/`](docs/rules/). Editor-specific files (`.cursor/rules/*.mdc`, `.claude/rules/`, `.claude/skills/`) are adapters that point at it, so there is one place to edit no matter which tool you use. Using any of them is optional: the conventions themselves are required and are also documented in `CONTRIBUTING.md` and `docs/`. Minimal-diff discipline lives in global editor settings, not a project copy. See [docs/rules/ai-tooling.md](docs/rules/ai-tooling.md).

| Rule                | When                                                                     | Canon                                     |
| ------------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| `project-context`   | Always — architecture, standards                                         | `docs/rules/project-context.md`           |
| `docs-boundary`     | On-demand — classifying public vs private, or adding a new committed doc | `docs/rules/docs-boundary.md`             |
| `public-docs`       | Always — supported vs roadmap wording (within public docs)               | `docs/rules/public-docs.md`               |
| `no-live-deploy`    | Always — no commit/push/PR/deploy without an explicit ask                | `docs/rules/no-live-deploy.md`            |
| `copy-voice`        | Always — demo/docs/UI prose: no em-dash; don't rewrite wording unasked   | `docs/rules/copy-voice.md`                |
| `ai-tooling`        | Always — AI tooling is optional, never endorsed unevaluated              | `docs/rules/ai-tooling.md`                |
| `docs-sync`         | When editing packages/docs (file-triggered)                              | `docs/rules/docs-sync.md`                 |
| `plan-mode`         | Manual — structured planning                                             | `docs/rules/plan-mode.md`                 |
| `plan-sync`         | WP / roadmap status changes                                              | `.cursor/rules/plan-sync.mdc`             |
| `threat-model-sync` | Security control changes                                                 | `.cursor/rules/threat-model-sync.mdc`     |
| `commit-style`      | Commits                                                                  | `.cursor/rules/commit-style.mdc`          |
| `maintainer-local`  | Gitignored – project-lead deploy hosts, backup, private docs workflow    | `docs/internal/maintainer-local.local.md` |

The last four have no `docs/rules/` twin on purpose: a rule only needs one when a tool has to load it without being asked. On-demand rules are reached by a pointer instead, so the `.mdc` stays canonical.

## Documentation maintenance

When changing architecture or public API, update this file only if the hard constraints section is affected. Package and integration detail belongs in package READMEs and `docs/`.
