# @eudi-verify/client

## 1.0.1

### Patch Changes

- 1fd4a66: fix: map cancelled wallet sessions to rejected state

  When polling returns `cancelled`, verification state is now `rejected` with
  error "Request was declined" instead of resetting to `idle`.

- 1fd4a66: Change cancel-paths and url-fragments in example demos

## 1.0.0

### Major Changes

- fb3d627: Relicense from Apache-2.0 to AGPL-3.0

  **What changed:** All published packages (`@eudi-verify/server`, `@eudi-verify/client`, `@eudi-verify/embed`) are now licensed under AGPL-3.0 instead of Apache-2.0.

  **How to update:** No code changes required. Review AGPL-3.0 obligations — notably Section 13 (remote network interaction) — to confirm compliance with your use case. Versions 0.1.x remain available under Apache-2.0 if AGPL is not suitable.

## 0.1.2

## 0.1.1

### Patch Changes

- a056e1b: Fix QR code generation for wallet URLs.
