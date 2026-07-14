# Releasing (Maintainers)

How to cut a release and publish `@eudi-verify/*` packages to npm.

For day-to-day contribution (setup, PRs, tests), see [CONTRIBUTING.md](../CONTRIBUTING.md). Maintainers add a changeset on the PR branch before merging package changes ([Changesets section](../CONTRIBUTING.md#changesets)); the steps below are for cutting a release.

## Prerequisites

- Maintainer access to the `@eudi-verify` npm org (publish permission on scoped packages)
- Node.js 22+ and `pnpm` (same as [CONTRIBUTING.md](../CONTRIBUTING.md))
- Playwright browsers for pre-release e2e: `pnpm exec playwright install` (once per machine; from repo root)
- At least one merged changeset on `main` (or your release branch) since the last publish
- `GITHUB_TOKEN` in your environment when running `pnpm changeset version` (see below)

### GitHub token for changelog generation

`.changeset/config.json` uses `@changesets/changelog-github`, which calls the GitHub API to link PRs and authors in **package** `CHANGELOG.md` files. This is separate from GitHub **release** notes (§5). `pnpm changeset version` fails without `GITHUB_TOKEN`.

**Recommended (classic PAT):** one-time setup, no `gh` required:

1. Create a token with `read:user` and `repo:status` only ([GitHub token settings](https://github.com/settings/tokens/new?scopes=read:user,repo:status&description=changesets)).
2. Add to `~/.zshrc` or `~/.bashrc`:

```bash
export GITHUB_TOKEN=ghp_…   # your PAT — read:user + repo:status only
```

3. Open a new shell (or `source` your profile), then run `pnpm changeset version`.

No `repo` or `write` scope is needed. After the `export` is in your profile, you should not see this error again unless the token is revoked or expires.

**Optional (`gh` shortcut):** if you use GitHub CLI elsewhere, `export GITHUB_TOKEN=$(gh auth token)` works for the current shell; refresh with `gh auth refresh` when it expires.

## Before merging package PRs

When a PR changes `@eudi-verify/server`, `client`, or `embed`:

```bash
git fetch origin pull/<PR>/head:pr-<PR> && git switch pr-<PR>   # or checkout the fork branch
pnpm changeset          # interactive — pick package(s), semver, changelog line
git add .changeset/
git commit -m "chore: add changeset for #<PR>"
git push                # to the PR branch, then merge
```

Published packages are **lockstep-versioned** (`.changeset/config.json` `fixed` group) — bumping one bumps all three at release. Select only packages the PR changed; default to **patch** for bugfixes, **minor** for features, **major** only for breaking changes.

Contributors are not required to add changesets. Skip this for docs-only, CI, or example-only PRs.

## 1. Bump versions

Preview what will be released first — this lists every package and its computed
next version without changing anything:

```bash
pnpm changeset status --verbose
```

If the versions look right, apply the bumps (`GITHUB_TOKEN` must be set — see [GitHub token](#github-token-for-changelog-generation)):

```bash
pnpm changeset version
```

Review generated version bumps, changelogs, and `package.json` / lockfile changes.

Update public version strings to match (same version as `packages/server/package.json`):

- `docs/SUPPORTED.md` — `**Current release:** vX.Y.Z`
- `THREAT_MODEL.md` and `DEPENDENCY.md` — footer `**Version**: X.Y.Z`

`pnpm verify` runs `scripts/check-docs-version.sh` and fails if those lag.

**Temporary manual step** (until [#10](https://github.com/eudi-verify/eudi-verify/issues/10) merges): Update hardcoded `VERSION` constants in:

- `packages/server/src/index.ts`
- `packages/client/src/index.ts`
- `packages/embed/src/index.ts`
- `packages/react/src/index.ts`

Change each `export const VERSION = "X.Y.Z"` to match the new package version. This will be automated once package versions are derived from `package.json` at build time.

Commit:

```bash
git add -A
git commit -m "chore: release"
```

## 2. Authenticate with npm

Interactive (local):

```bash
npm login
npm whoami   # confirm you are logged in
```

For CI or automation, use a granular npm access token with publish rights on `@eudi-verify/*`. Store it in `~/.npmrc` or `NPM_TOKEN` — never commit tokens to the repo.

If your account has 2FA enabled, use an automation token with bypass 2FA for non-interactive publishes.

## 3. Publish packages

From the repo root:

```bash
pnpm -r publish --access public
```

Scoped packages require `--access public` on first publish. Dry run first if unsure:

```bash
pnpm -r publish --access public --dry-run
```

## 4. Tag and push

Replace `0.X.Y` with the new version (from `packages/server/package.json` after `pnpm changeset version`). The tag must point at the **`chore: release`** commit on `main`.

### One-time: enable signed tags (recommended)

GitHub shows a **Verified** badge when tags are signed. Prefer **SSH signing** (simpler on GitHub than GPG):

```bash
# List keys — use a dedicated signing key if you have one
ls ~/.ssh/*.pub

git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub   # your public key path
git config --global tag.gpgSign true                        # sign tags by default
```

Add the **same public key** in GitHub → **Settings** → **SSH and GPG keys** → **New SSH key** → type **Signing key**.

<details>
<summary>GPG instead of SSH</summary>

```bash
gpg --full-generate-key
gpg --list-secret-keys --keyid-format=long
git config --global user.signingkey <KEY_ID>
git config --global tag.gpgSign true
```

Upload the public key to GitHub → **Settings** → **SSH and GPG keys** → **New GPG key**.

</details>

### Create a signed tag

Use **only** the CLI for release tags. Do not create the tag in the GitHub UI first — UI-created tags are usually lightweight and will conflict with signed annotated tags on other machines.

Annotated + signed (required for releases):

```bash
git tag -s v0.X.Y -m "v0.X.Y"
git tag -v v0.X.Y    # verify signature locally
git push origin main
git push origin v0.X.Y
```

If `v0.X.Y` already exists on the remote as a lightweight tag, delete it before pushing the signed tag (maintainers only, only before others depend on the release):

```bash
git push origin :refs/tags/v0.X.Y
git push origin v0.X.Y
```

Unsigned tags (`git tag v0.X.Y` without `-s`) are not acceptable for npm releases once signing is configured.

**Demo / pre-npm milestone** (no npm publish): same flow — tag the commit you want reviewers to cite, e.g. `v0.1.0-demo`, and create a GitHub release. Skip [§3 Publish packages](#3-publish-packages) if packages are not on npm yet.

### Troubleshooting: conflicting tags on `git pull`

Symptom: `would clobber existing tag v0.X.Y` or a GUI reports conflicting tags.

Cause: local and remote tags share a name but differ in type (annotated vs lightweight) or commit.

Fix for contributors (take the remote tag, then pull):

```bash
git fetch origin tag v0.X.Y --force
git pull origin main
```

Verify:

```bash
git rev-parse 'v0.X.Y^{commit}'   # should match the chore: release commit on main
```

## 5. GitHub release

Create the release **after** pushing the signed tag (§4). Use the GitHub UI so you can preview auto-generated notes before publishing:

1. Repo → **Releases** → **Draft a new release**
2. **Choose a tag:** select the existing `v0.X.Y` tag (do **not** type a new tag name — that creates a conflicting lightweight tag)
3. Click **Generate release notes** — GitHub builds the body from merged PRs since the last tag, grouped by [`.github/release.yml`](../.github/release.yml) (Breaking Changes, Features, Bug Fixes, etc.)
4. Review and edit the draft; add a short intro at the top if you want a highlight
5. **Publish release**

<details>
<summary>CLI alternative (`gh`)</summary>

```bash
gh release create v0.X.Y --title "v0.X.Y" --generate-notes
```

`--generate-notes` uses the same config as the UI. To prepend a hand-written intro, add `--notes "<intro>"` alongside `--generate-notes`. The CLI publishes immediately — no preview step — so prefer the UI when you want to review first.

</details>

## Checklist

- [ ] Changesets merged since last release
- [ ] `pnpm verify` passes on the release commit
- [ ] `pnpm test:e2e` passes (embed widget + Vue example; not part of CI/`verify`)
- [ ] `pnpm changeset version` committed as `chore: release`
- [ ] `docs/SUPPORTED.md`, `THREAT_MODEL.md`, `DEPENDENCY.md` version strings updated
- [ ] **Temporary:** `VERSION` constants updated in `packages/*/src/index.ts` (until [#10](https://github.com/eudi-verify/eudi-verify/issues/10))
- [ ] Packages published to npm (`@eudi-verify/server`, `@eudi-verify/client`, `@eudi-verify/embed`, `@eudi-verify/react`)
- [ ] Git tag `v0.X.Y` pushed (**signed** with `git tag -s` when signing is configured)
- [ ] `git tag -v v0.X.Y` passes locally
- [ ] GitHub release created with changelog notes; tag shows **Verified** on GitHub
