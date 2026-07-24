@AGENTS.md

# Claude Code notes

The imports above are the canonical policy (also read natively by Cursor via `AGENTS.md` and enforced there via `.cursor/rules/*.mdc`). Nothing below restates that policy — it only maps Claude Code's activation model onto it.

Minimal-diff discipline: ponytail plugin (installed globally, not repeated here).

## When planning

@docs/agent-plan-mode.md

Claude Code's `/plan` (or `Shift+Tab` into plan mode) enforces read-only at the tool level; the imported doc above defines what a good plan looks like while in that mode.

## On-demand rules

These stay as Cursor `.mdc` files (single source; Claude Code cannot `@`-import `.mdc`). Instead of listing them here for you to remember, they're wired as self-triggering skills under `.claude/skills/` — each one is a thin pointer (description for relevance-matching, body says "read the `.mdc`"), so nothing is duplicated and nothing loads until it's relevant:

- `commit-style` — fires when writing a commit message
- `plan-sync` — fires when completing/starting a work package
- `threat-model-sync` — fires when changing security controls
- `docs-sync` — fires on both intent match and file-path match (`packages/*/src/**`, etc.)

## Scope

Project-specific. Do not add eudi-verify policy to `~/.claude/CLAUDE.md`. Private/maintainer-only notes belong in `CLAUDE.local.md` (gitignored), not here.
