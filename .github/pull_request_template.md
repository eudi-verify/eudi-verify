## Summary

<!-- What does this change and why? Link related issues if any. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Docs / maintenance only

## How tested

<!-- What you ran and how to reproduce (Node version, example app, env vars). `pnpm verify` is enough for most PRs. -->

## Checklist

<!-- Delete optional bullets at the bottom if they don't apply. -->

- [ ] `pnpm verify` passes locally
- [ ] Self-reviewed; I can explain the design decisions
- [ ] All commits signed off per the [DCO](../DCO) (`git commit -s`)
- [ ] No secrets or credentials committed; considered security/privacy impact
- [ ] Docs / OpenAPI updated (`packages/*/README.md`, `docs/INTEGRATION.md`, `openapi/eudi-verifier.yaml`)
- [ ] Tests added or updated for behavior changes
- [ ] Embed E2E checked (`cd packages/embed && pnpm test:e2e`) — UI/a11y changes only
- [ ] [THREAT_MODEL.md](../THREAT_MODEL.md) updated — security control changes only

**Maintainers:** add a changeset on the PR branch before merge if this changes a published package — see [RELEASING.md § Before merging](../docs/RELEASING.md#before-merging-package-prs).
