---
paths:
  - "packages/*/src/**"
  - "packages/*/README.md"
  - "docs/INTEGRATION.md"
  - "docs/integration-*.md"
  - "docs/SUPPORTED.md"
  - ".github/internal/wp/WP9.md"
  - "README.md"
---

# Documentation Sync

See also **[public-docs.md](./public-docs.md)** — supported vs roadmap accuracy (always applies).

## When to Update Docs

After modifying package implementations, check if documentation needs updates:

| Changed                                                                                                    | Update                                                                                                       |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `packages/server/src/**`                                                                                   | `packages/server/README.md`                                                                                  |
| **Engine capability** (a `VerifierEngine` gains or loses a protocol, format, profile, or trust capability) | `docs/ARF_ALIGNMENT.md`, `docs/integration-architecture.md`, `docs/PLAN.md` status line, `docs/SUPPORTED.md` |
| `packages/client/src/**`                                                                                   | `packages/client/README.md`                                                                                  |
| `packages/embed/src/**`                                                                                    | `packages/embed/README.md`                                                                                   |
| Any public API change                                                                                      | `docs/INTEGRATION.md`, `docs/integration-*.md`                                                               |
| Support matrix (stack, example, package status)                                                            | `docs/SUPPORTED.md` + `README.md`                                                                            |
| WP9 React package or example                                                                               | `.github/internal/wp/WP9.md`, `packages/react/README.md`, `docs/INTEGRATION.md`                              |
| New WP or scope change                                                                                     | `docs/PLAN.md`                                                                                               |

## What to Check

- **Exports changed?** → Update API reference section
- **New config option?** → Add to configuration table
- **Breaking change?** → Update code examples
- **New error type?** → Add to error handling section

## Roadmap words go stale silently

Any doc that says a capability is **"roadmap", "planned", "not yet", or "coming"** is a claim with an expiry date, and nothing fails when it expires. Tests do not cover prose, and a doc organised by concept (`ARF_ALIGNMENT.md`) or by architecture (`integration-architecture.md`) gives no signal to someone editing a source file.

So when a capability ships, grep before assuming the docs already know:

```
grep -rniE "roadmap|not yet|planned|not implemented" docs/ README.md | grep -i <capability>
```

`docs/SUPPORTED.md` is canonical and usually gets updated. The files that drift are the ones nobody thinks of because they are not named after the code that changed.

## Don't Over-Document

- Keep READMEs concise (devs read code)
- One working example > lengthy explanation
- Link to OpenAPI spec for full API details
- Skip obvious changes (internal refactors, test fixes)
