# Releasing (Maintainers)

How to cut a release and publish `@eudi-verify/*` packages to npm.

For day-to-day contribution (setup, PRs, tests), see [CONTRIBUTING.md](../CONTRIBUTING.md). Contributors add [Changesets](https://github.com/changesets/changesets) with their PRs; maintainers run the steps below when it is time to ship.

## Prerequisites

- Maintainer access to the `@eudi-verify` npm org (publish permission on scoped packages)
- Node.js 22+ and `pnpm` (same as [CONTRIBUTING.md](../CONTRIBUTING.md))
- At least one merged changeset on `main` (or your release branch) since the last publish

## 1. Bump versions

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

Replace `0.X.Y` with the new version (use the version from `packages/server/package.json` or the changeset output):

```bash
git tag v0.X.Y
git push origin main
git push origin v0.X.Y
```

## 5. GitHub release

```bash
gh release create v0.X.Y --title "v0.X.Y" --notes "<paste changelog summary>"
```

Or create the release in the GitHub UI from the tag.

## Checklist

- [ ] Changesets merged since last release
- [ ] `pnpm verify` passes on the release commit
- [ ] `pnpm changeset version` committed as `chore: release`
- [ ] Packages published to npm (`@eudi-verify/server`, `@eudi-verify/client`, `@eudi-verify/embed`)
- [ ] Git tag `v0.X.Y` pushed
- [ ] GitHub release created with changelog notes
