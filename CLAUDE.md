@AGENTS.md

# Claude Code notes

`AGENTS.md` above is the canonical policy, shared with every other agent tool. Nothing here restates it: this file only maps Claude Code's activation model onto it.

Minimal-diff discipline: ponytail plugin (installed globally, not repeated here).

## Where the rules live

Canon is plain markdown in `docs/rules/*.md`, never in a tool's own format. Cursor reads it through `.cursor/rules/*.mdc`; Claude Code reads it through two adapters, chosen to match how each rule is meant to fire:

| Rule fires                      | Claude Code adapter                                                              |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Always                          | `.claude/rules/<name>.md` — symlink to canon, loaded every session               |
| When matching files are touched | `.claude/rules/<name>.md` — symlink to canon, which carries `paths:` frontmatter |
| When the task calls for it      | `.claude/skills/<name>/SKILL.md` — pointer, fires on description match           |
| Only when you ask               | `.claude/skills/<name>/SKILL.md` with `disable-model-invocation: true`           |

Adapters never restate canon. Edit `docs/rules/*.md` (or, for the three on-demand rules whose canon is still the `.mdc`, edit that) and both tools pick the change up.

## Planning

`/plan`, `Shift+Tab`, or `--permission-mode plan` enforce read-only at the tool level. They do not load the repo's planning rules: run `/plan-mode` for those.

## Scope

Project-specific. Do not add eudi-verify policy to `~/.claude/CLAUDE.md`. Private/maintainer-only notes belong in `CLAUDE.local.md` (gitignored), not here.
