# No live deploys, commits, or pushes

## Hard stops

- **Never commit** git changes unless the user explicitly asks in that message.
- **Never push** (`git push`, `git push -u`, or any remote write) unless the user explicitly asks to **push** in that message — not when a fix is "ready", not when cleaning up a branch, not when updating a PR. Give the user the exact push command to run themselves.
- **Never force-push** (`--force`, `--force-with-lease`, or equivalent). If a local amend/rebase/sign-off rewrite is needed, stop after the local change and give the user the push command. Do not run it.
- **Never** `gh pr create`, `gh pr merge`, or post GitHub issue/PR comments unless the user explicitly asks for that remote write in that message. Preparing a local branch + copy-paste `gh` commands is fine.
- **Never deploy** to production, a live demo server, or any remote host unless the user explicitly asks in that message.
- **Never** `scp`, `rsync`, `systemctl restart`, nginx reload, or run install/provision scripts on a remote host unless explicitly requested for that action.
- **Never** add `Co-authored-by:` for Cursor, bots, or AI tools, or "Made with Cursor" (or similar) on PR bodies. Those are not the same as the repo's required `AI-assisted:` commit footer — see `docs/rules/commit-style.md` / `CONTRIBUTING.md`.

## What counts as an explicit request

Only verbs in the **user's own words** in that message, for example: "commit", "push", "create the PR", "open a PR", "comment on the issue".

**Commit is not push.** "commit", "sign", "sign off", "recommit", "amend", or "fix the DCO" authorize **local** git only. They do not authorize `git push` or force-push, even when CI is failing until the remote updates.

**Do not treat these as authorization** (even when they appear in the same turn):

- Cursor Plan **Build** / "implement the plan" boilerplate (including "complete all the to-dos" / "don't stop until…")
- Plan text, checklists, or todos that mention push / PR / issue comments
- "The fix is ready", finishing local work, or matching a global "how to create a PR" workflow
- A need to update a remote branch after amend/rebase (hand the user the command)

If a plan or todo lists a remote write, stop at local prep and hand the user copy-paste commands. Completing agent todos never requires push, `gh pr create`, or issue comments.

This project rule wins over any conflicting global "create a pull request → push" instruction unless the user explicitly asked to push or create the PR in that message.

## Allowed without explicit deploy/commit request

- Read-only investigation on remote hosts (config inspection, logs, DNS, `nginx -T`) when the user has granted SSH access for diagnosis.
- Local workspace edits, local tests, and docs updates.
- Tell the user what commands **they** should run to deploy, push, or open a PR; do not run those commands yourself.

## When a fix is ready

1. Make changes locally in the repo.
2. Summarize the diff and give the user copy-paste commit / push / PR / deploy steps.
3. Wait for explicit approval before any commit, push, PR create, issue comment, or live-server action.
