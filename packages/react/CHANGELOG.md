# @eudi-verify/react

## 1.0.3

### Patch Changes

- @eudi-verify/client@1.0.3
- @eudi-verify/embed@1.0.3

## 1.0.2

### Patch Changes

- af85387: Align `@eudi-verify/react` with the unified package version line. It now joins the fixed release group alongside `@eudi-verify/server`, `@eudi-verify/client`, and `@eudi-verify/embed`, so all four packages share a single version from this release onward. No API changes.
- af85387: Relicense from AGPL-3.0 to Apache-2.0.

  **What changed:** All published packages are now licensed under Apache-2.0 instead of AGPL-3.0. This is a permissive relicense — it removes the AGPL copyleft and network-use (Section 13) obligations and grants more rights, so no action is required to stay compliant. Apache-2.0 includes an explicit patent grant.

  **Why:** Apache-2.0 maximizes adoption (open-source and proprietary integrations alike), aligns with the EUDI/`@openeudi` ecosystem, and avoids the copyleft friction that blocks many public-sector and enterprise adopters.

- Updated dependencies [af85387]
  - @eudi-verify/client@1.0.2
  - @eudi-verify/embed@1.0.2

## 0.2.0

### Minor Changes

- 1fd4a66: feat: add React wrapper component

  New `@eudi-verify/react` package provides idiomatic React integration:

  - `<EudiVerify>` component with typed props and callbacks
  - `useEudiVerify` hook for headless custom UI
  - Full TypeScript support with discriminated unions
  - Imperative API via ref handle
  - Works with Next.js (use `'use client'` directive)
  - Example app in `examples/react/`

  See packages/react/README.md for full documentation.

### Patch Changes

- 1fd4a66: Change cancel-paths and url-fragments in example demos
- Updated dependencies [1fd4a66]
- Updated dependencies [1fd4a66]
  - @eudi-verify/client@1.0.1
  - @eudi-verify/embed@1.0.1
