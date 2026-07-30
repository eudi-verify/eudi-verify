# Commit Message Style

## Format

Use [Conventional Commits](https://www.conventionalcommits.org/) with the following types:

### Types

| Type          | Use                                         |
| ------------- | ------------------------------------------- |
| `feat`        | New feature or enhancement                  |
| `fix`         | Bug fix                                     |
| `docs`        | Documentation changes                       |
| `chore`       | Maintenance, tooling, dependencies          |
| `test`        | Test changes                                |
| `refactor`    | Code restructuring without behavior change  |
| `requirement` | Grant/compliance requirement implementation |

### Scopes (optional)

Use scopes to indicate the package or area:

- `feat(server):` — server package
- `feat(client):` — client package
- `feat(embed):` — embed package
- `feat(demo):` — demo/example changes

### Structure

**Single-line:**

```
type(scope): brief description in imperative mood
```

**Multi-line:**

```
type(scope): brief summary

- Bullet point detail
- Another detail
- More context
```

### Examples

```
feat: add age verification widget

fix(server): correct token TTL validation

requirement: add WP6 security documentation

chore: update dependencies
```

### AI-assisted footer

For substantive AI-assisted work, add metadata after the commit body. Tool and model/version are required. Do not include prompt text or prompt summaries:

```
feat(embed): add keyboard trap for modal focus

- Trap focus inside verification dialog
- Restore focus on close

AI-assisted: <tool> (<model-or-version>)
```

Name the tool that actually did the work, for example:

```
AI-assisted: Cursor (claude-opus-5)
AI-assisted: Claude Code (claude-opus-5)
```

If you edited AI-generated code manually, add `(edited)`:

```
AI-assisted: Claude Code (claude-opus-5) (edited)
```

**Do include** the `AI-assisted:` footer when drafting commit text for the user (required by [CONTRIBUTING.md](../../CONTRIBUTING.md)).

### DCO sign-off (required)

Every commit must include a `Signed-off-by:` trailer (Developer Certificate of Origin). CI rejects unsigned commits. Use `git commit -s` (or `git commit --amend -s` when amending). The trailer must match the committer name/email from git config:

```
Signed-off-by: Jane Doe <jane@example.com>
```

Place it after the `AI-assisted:` footer when both are present. Full policy: [CONTRIBUTING.md](../../CONTRIBUTING.md) (License & DCO).

**Do not** add:

- `Co-authored-by:` for Cursor, bots, or AI tools (pollutes the GitHub contributors list)
- "Made with Cursor" or similar product badges in PR bodies

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for full AI-assisted development policy.

## Rules

1. Use imperative mood ("add feature" not "added feature")
2. Keep first line under 72 characters
3. Capitalize first word of description
4. No period at end of first line
5. Blank line before bullet points
6. Add `AI-assisted:` metadata for substantive AI contributions (see above)
7. Always add `Signed-off-by:` via `git commit -s` (DCO; required)
8. Never add `Co-authored-by:` bot/Cursor lines or "Made with Cursor" PR branding
