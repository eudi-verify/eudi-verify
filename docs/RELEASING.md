# Releasing (Maintainers)

How to cut a release and publish `@eudi-verify/*` packages to npm.

For day-to-day contribution (setup, PRs, tests), see [CONTRIBUTING.md](../CONTRIBUTING.md). Contributors run `pnpm changeset` on feature branches and merge the generated `.changeset/*.md` with their PRs ([Changesets section](../CONTRIBUTING.md#changesets)); maintainers run the steps below when it is time to ship.

## Prerequisites

- Maintainer access to the `@eudi-verify` npm org (publish permission on scoped packages)
- Node.js 22+ and `pnpm` (same as [CONTRIBUTING.md](../CONTRIBUTING.md))
- At least one merged changeset on `main` (or your release branch) since the last publish

## 1. Bump versions

Preview what will be released first — this lists every package and its computed
next version without changing anything:

```bash
pnpm changeset status --verbose
```

If the versions look right, apply the bumps:

```bash
pnpm changeset version
```

Review generated version bumps, changelogs, and `package.json` / lockfile changes.

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

```bash
gh release create v0.X.Y --title "v0.X.Y" --notes "<paste changelog summary>"
```

Create the release **after** pushing the signed tag from the CLI (`gh release create` above, or the GitHub UI by **selecting** the existing tag — do not type a new tag name in the UI; that creates a conflicting lightweight tag).

## Checklist

- [ ] Changesets merged since last release
- [ ] `pnpm verify` passes on the release commit
- [ ] `pnpm changeset version` committed as `chore: release`
- [ ] Packages published to npm (`@eudi-verify/server`, `@eudi-verify/client`, `@eudi-verify/embed`)
- [ ] Git tag `v0.X.Y` pushed (**signed** with `git tag -s` when signing is configured)
- [ ] `git tag -v v0.X.Y` passes locally
- [ ] GitHub release created with changelog notes; tag shows **Verified** on GitHub
