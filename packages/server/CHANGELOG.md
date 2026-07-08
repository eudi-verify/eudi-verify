# @eudi-verify/server

## 1.1.1

### Patch Changes

- [#25](https://github.com/eudi-verify/eudi-verify/pull/25) [`aa62611`](https://github.com/eudi-verify/eudi-verify/commit/aa62611b29b6f6921ab529bff748e9de7c863678) Thanks [@mkascel](https://github.com/mkascel)! - Fix client IP extraction behind reverse proxies/CDNs so rate limiting keys on real visitor IP instead of edge IP.

## 1.1.0

## 1.0.3

### Patch Changes

- ebfbdf7: Return sessionId from verifyToken response so callers can correlate receipts without decoding the JWT

## 1.0.2

### Patch Changes

- af85387: Relicense from AGPL-3.0 to Apache-2.0.

  **What changed:** All published packages are now licensed under Apache-2.0 instead of AGPL-3.0. This is a permissive relicense — it removes the AGPL copyleft and network-use (Section 13) obligations and grants more rights, so no action is required to stay compliant. Apache-2.0 includes an explicit patent grant.

  **Why:** Apache-2.0 maximizes adoption (open-source and proprietary integrations alike), aligns with the EUDI/`@openeudi` ecosystem, and avoids the copyleft friction that blocks many public-sector and enterprise adopters.

## 1.0.1

## 1.0.0

### Major Changes

- fb3d627: Relicense from Apache-2.0 to AGPL-3.0

  **What changed:** All published packages (`@eudi-verify/server`, `@eudi-verify/client`, `@eudi-verify/embed`) are now licensed under AGPL-3.0 instead of Apache-2.0.

  **How to update:** No code changes required. Review AGPL-3.0 obligations — notably Section 13 (remote network interaction) — to confirm compliance with your use case. Versions 0.1.x remain available under Apache-2.0 if AGPL is not suitable.

## 0.1.2

## 0.1.1
