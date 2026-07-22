# Releasing (Maintainers)

How to cut a release and publish `@eudi-verify/*` packages to npm.

For day-to-day contribution (setup, PRs, tests), see [CONTRIBUTING.md](../CONTRIBUTING.md). Maintainers add a changeset on the PR branch before merging package changes ([Changesets section](../CONTRIBUTING.md#changesets)); the steps below are for cutting a release.

## Prerequisites

- Maintainer access to the `@eudi-verify` npm org
- Node.js 22+ and `pnpm` (same as [CONTRIBUTING.md](../CONTRIBUTING.md))
- `GITHUB_TOKEN` set in the environment ([one-time setup](#github-token-for-changelog-generation))
- Signed tags configured if you want Verified tags on GitHub ([one-time setup](#signed-tags))
- Playwright browsers installed once per machine: `pnpm exec playwright install` (needed for `pnpm test:e2e`)
- At least one merged changeset on `main` since the last publish

## Before merging package PRs

When a PR changes `@eudi-verify/server`, `client`, `embed`, or `react`:

```bash
git fetch origin pull/<PR>/head:pr-<PR> && git switch pr-<PR>   # or checkout the fork branch
pnpm changeset          # interactive: pick package(s), semver, changelog line
git add .changeset/
git commit -m "chore: add changeset for #<PR>"
git push                # to the PR branch, then merge
```

Published packages are **lockstep-versioned** (`.changeset/config.json` `fixed` group): bumping one bumps all at release. Select only packages the PR changed; default to **patch** for bugfixes, **minor** for features, **major** only for breaking changes.

Contributors are not required to add changesets. Skip this for docs-only, CI, or example-only PRs.

## Release steps

Do these in order on an up-to-date `main`.

### 1. Preview and bump versions

```bash
pnpm changeset status --verbose
```

If the versions look right (`GITHUB_TOKEN` must be set):

```bash
pnpm changeset version
```

Review generated version bumps, changelogs, and `package.json` / lockfile changes.

### 2. Sync docs and VERSION constants

Update public version strings to match `packages/server/package.json`:

- `docs/SUPPORTED.md`: `**Current release:** vX.Y.Z`
- `THREAT_MODEL.md` and `DEPENDENCY.md`: footer `**Version**: X.Y.Z`

`pnpm verify` runs `scripts/check-docs-version.sh` and fails if those lag.

Regenerate committed package `VERSION` constants:

```bash
pnpm sync:versions
```

This writes `packages/*/src/version.ts`. Build / `prepublishOnly` also regenerate at publish time; run `sync:versions` here so the release commit keeps source in sync. Do this on every release after `pnpm changeset version`.

### 3. Verify (including e2e)

```bash
pnpm verify
pnpm test:e2e
```

`pnpm verify` mirrors CI. **`pnpm test:e2e` is not part of CI or `verify`**. Run it every release (embed widget + Vue + React examples). Easy to skip; do not.

### 4. Commit the release

```bash
git add -A
git commit -m "chore: release"
```

### 5. Publish packages

```bash
npm whoami   # must be logged in; see npm login under Troubleshooting if needed
pnpm -r publish --access public
```

Dry run first if unsure:

```bash
pnpm -r publish --access public --dry-run
```

### 6. Tag and push

The tag must point at the **`chore: release`** commit on `main`. Read the version from `package.json` so you do not type it:

```bash
V="v$(node -p "require('./packages/server/package.json').version")"
git tag -s "$V" -m "$V"
git tag -v "$V"    # verify signature locally
git push origin main
git push origin "$V"
```

Use **only** the CLI for release tags. Do not create the tag in the GitHub UI first: UI-created tags are usually lightweight and will conflict with signed annotated tags.

Unsigned tags (`git tag` without `-s`) are not acceptable for npm releases once signing is configured.

**Demo / pre-npm milestone** (no npm publish): same flow: tag the commit you want reviewers to cite, e.g. `v0.1.0-demo`, and create a GitHub release. Skip [§5 Publish packages](#5-publish-packages) if packages are not on npm yet.

### 7. GitHub release

Create the release **after** pushing the signed tag. Prefer the GitHub UI so you can preview notes:

1. Repo → **Releases** → **Draft a new release**
2. **Choose a tag:** select the existing `vX.Y.Z` tag (do **not** type a new tag name: that creates a conflicting lightweight tag)
3. Click **Generate release notes**. GitHub builds the body from merged PRs since the last tag, grouped by [`.github/release.yml`](../.github/release.yml)
4. Review and edit the draft; add a short intro at the top if you want a highlight
5. **Publish release**

<details>
<summary>CLI alternative (<code>gh</code>)</summary>

```bash
gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes
```

`--generate-notes` uses the same config as the UI. To prepend a hand-written intro, add `--notes "<intro>"` alongside `--generate-notes`. The CLI publishes immediately (no preview step), so prefer the UI when you want to review first.

</details>

## Checklist

- [ ] Changesets merged since last release
- [ ] `pnpm changeset version` applied
- [ ] `docs/SUPPORTED.md`, `THREAT_MODEL.md`, `DEPENDENCY.md` version strings updated
- [ ] `pnpm sync:versions` run (committed `version.ts` matches package versions)
- [ ] `pnpm verify` passes on the release commit
- [ ] `pnpm test:e2e` passes (not part of CI/`verify`; do not skip)
- [ ] `chore: release` committed
- [ ] Packages published to npm (`@eudi-verify/server`, `@eudi-verify/client`, `@eudi-verify/embed`, `@eudi-verify/react`)
- [ ] Git tag `vX.Y.Z` pushed (**signed** with `git tag -s`)
- [ ] `git tag -v vX.Y.Z` passes locally
- [ ] GitHub release created with changelog notes; tag shows **Verified** on GitHub

---

## One-time setup

### GitHub token for changelog generation

`.changeset/config.json` uses `@changesets/changelog-github`, which calls the GitHub API to link PRs and authors in **package** `CHANGELOG.md` files. This is separate from GitHub **release** notes (§7). `pnpm changeset version` fails without `GITHUB_TOKEN`.

**Recommended (classic PAT):**

1. Create a token with `read:user` and `repo:status` only ([GitHub token settings](https://github.com/settings/tokens/new?scopes=read:user,repo:status&description=changesets)).
2. Add to `~/.zshrc` or `~/.bashrc`:

```bash
export GITHUB_TOKEN=ghp_…   # your PAT: read:user + repo:status only
```

3. Open a new shell (or `source` your profile), then run `pnpm changeset version`.

No `repo` or `write` scope is needed. After the `export` is in your profile, you should not see this error again unless the token is revoked or expires.

**Optional (`gh` shortcut):** `export GITHUB_TOKEN=$(gh auth token)` works for the current shell; refresh with `gh auth refresh` when it expires.

### Signed tags

GitHub shows a **Verified** badge when tags are signed. Prefer **SSH signing** (simpler on GitHub than GPG):

```bash
# List keys: use a dedicated signing key if you have one
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

---

## Troubleshooting

### npm login / 2FA

```bash
npm login
npm whoami
```

For CI or automation, use a granular npm access token with publish rights on `@eudi-verify/*`. Store it in `~/.npmrc` or `NPM_TOKEN`; never commit tokens to the repo.

If your account has 2FA enabled, use an automation token with bypass 2FA for non-interactive publishes.

### Conflicting tags on `git pull`

Symptom: `would clobber existing tag vX.Y.Z` or a GUI reports conflicting tags.

Cause: local and remote tags share a name but differ in type (annotated vs lightweight) or commit.

Fix (take the remote tag, then pull):

```bash
git fetch origin tag vX.Y.Z --force
git pull origin main
```

Verify:

```bash
git rev-parse 'vX.Y.Z^{commit}'   # should match the chore: release commit on main
```

If `vX.Y.Z` already exists on the remote as a lightweight tag, delete it before pushing the signed tag (maintainers only, only before others depend on the release):

```bash
git push origin :refs/tags/vX.Y.Z
git push origin vX.Y.Z
```
