# AGENTS.md — eudi-verify

Framework-agnostic EUDI Wallet verifier kit. See [README.md](README.md) for overview.

## Read first

- [CONTRIBUTING.md](CONTRIBUTING.md) — setup, `pnpm verify`, commit style, AI policy
- [docs/SUPPORTED.md](docs/SUPPORTED.md) — supported vs roadmap (canonical for public claims)
- [docs/INTEGRATION.md](docs/INTEGRATION.md) — end-to-end integration
- [THREAT_MODEL.md](THREAT_MODEL.md) — security controls and threat status
- [openapi/eudi-verifier.yaml](openapi/eudi-verifier.yaml) — API contract
- `.cursor/rules/docs-boundary.mdc` — public vs private docs (canonical); private notes in `*.local.md` / `docs/internal/`

## Verify first

- **Don't assume** — read the code, check docs, or run read-only checks before stating something as fact.
- **Resolve, then ask** — try to answer open questions yourself; escalate only what research can't settle or what is a genuine decision for me.
- **Push back** — I make mistakes. If my premises look wrong, say so with reasoning instead of complying silently.

## Hard constraints

- **No live deploys, commits, or pushes** unless the user explicitly requests them in that message — no `git push`, `scp`/`rsync`, or remote restarts/provision scripts; give copy-paste steps for the user to run (see `.cursor/rules/no-live-deploy.mdc`)
- **Node.js 22+**, pnpm workspaces, TypeScript strict mode
- **Public accuracy**: `docs/SUPPORTED.md` is canonical — do not claim unsupported platforms or packages exist
- **Public vs private docs**: classify before writing — maintainer ops and post-merge admin go in gitignored `*.local.md`, not `CONTRIBUTING.md` / PR templates / workflow comments; see `.cursor/rules/docs-boundary.mdc`
- **Sovereignty**: no US identity SaaS in core; see `.cursor/rules/project-context.mdc`
- **Security**: update [THREAT_MODEL.md](THREAT_MODEL.md) when changing security controls
- **Verify locally**: `pnpm verify` mirrors CI before claiming checks pass
- **Planning**: Cursor Plan mode + `@plan-mode` (`.cursor/rules/plan-mode.mdc`)

## Cursor rules (optional)

`.cursor/rules/` mirrors project conventions for Cursor users. Policy for all contributors lives in `CONTRIBUTING.md` and `docs/`. Gitignored rules (`ponytail.mdc`, `maintainer-local.mdc`) load only on machines that have them — see `.gitignore`. See `.cursor/rules/ai-tooling.mdc`.

| Rule                    | When                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `project-context.mdc`   | Always — architecture, standards                                              |
| `docs-boundary.mdc`     | Always — public vs private docs (canonical)                                   |
| `public-docs.mdc`       | Always — supported vs roadmap wording (within public docs)                    |
| `docs-sync.mdc`         | When editing packages/docs (globs)                                            |
| `plan-mode.mdc`         | Manual `@plan-mode` — structured planning                                     |
| `plan-sync.mdc`         | WP / roadmap status changes                                                   |
| `threat-model-sync.mdc` | Security control changes                                                      |
| `commit-style.mdc`      | Commits                                                                       |
| `ponytail.mdc`          | Gitignored — minimal-diff discipline (maintainer machine; also in User Rules) |
| `maintainer-local.mdc`  | Gitignored — project-lead deploy hosts, backup, private docs workflow         |

## Documentation maintenance

When changing architecture or public API, update this file only if the hard constraints section is affected. Package and integration detail belongs in package READMEs and `docs/`.
