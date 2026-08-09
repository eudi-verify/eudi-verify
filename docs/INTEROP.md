# Interop notes (lab)

Honest status of real-wallet OpenID4VP against `@eudi-verify/server`, distilled from lab runs. Platform support and roadmap stay in [SUPPORTED.md](./SUPPORTED.md). Integration how-to stays in [INTEGRATION.md](./INTEGRATION.md).

**Scope of what was tested:** EU Age Verification (AV) reference wallet on iOS presenting `eu.europa.ec.av.1` / `age_over_18` to `Openid4vpEngine` (`@openeudi/openid4vp`), earlier end-to-end runs against the EU reference verifier stack, and a free OpenID Foundation conformance suite happy-flow run against the HAIP 1.0 Final `direct_post.jwt` path (see below). **Not a certification claim** — a free suite run is not certification. Not full PID coverage.

---

## What works

| Area                                                           | Result                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reference verifier + AV wallet (EU stack)                      | End-to-end presentation completes (lab)                                                                                                                                                                                                                                                                                              |
| `Openid4vpEngine` + plain `direct_post`                        | Wallet POSTs `vp_token` + `state` to `/callback`                                                                                                                                                                                                                                                                                     |
| mdoc `eu.europa.ec.av.1` / `age_over_18`                       | Claims verified; server mints `eudi_v1` token                                                                                                                                                                                                                                                                                        |
| SessionTranscript                                              | OpenID4VP 1.0 unencrypted handover (plain `direct_post`, no JWE `apu`)                                                                                                                                                                                                                                                               |
| Example stack                                                  | `EUDI_MODE=production` on `examples/server` + `examples/html-vanilla`                                                                                                                                                                                                                                                                |
| Negative binding                                               | Mutating `clientId` / `responseUri` / `nonce` rejects the presentation                                                                                                                                                                                                                                                               |
| `Openid4vpEngine` + `haip` (HAIP 1.0 Final, `direct_post.jwt`) | Passed the free OpenID Foundation conformance suite `oid4vp-1final-verifier-happy-flow` test (plan 1, `iso_mdl` + `direct_post.jwt`, 2026-08-09): `x509_hash` client_id, JAR (`request_uri`), signed request object, per-session response-encryption key, DCQL, `redirect_uri` echo. FAILURE 0. Free suite run, not a certification. |

**Lab config that matched the happy path:** `client_id=redirect_uri:<response_uri>`, DCQL by value, `response_mode=direct_post`, trust skip (see below).

**LAN footgun:** when `BASE_URL` uses a LAN IP, the API must listen on `HOST=0.0.0.0`. Binding only `127.0.0.1` makes the phone unable to POST `/callback` (wallet shows a generic present/share failure). See [examples/server/README.md](../examples/server/README.md).

---

## Partial

| Area                    | Status                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Issuer trust            | Lab used `EUDI_TRUST=skip` → `trustLevel: none`. Code supports `StaticTrustStore` / `EUDI_TRUST=static` + trusted certs; acceptance-CA anchored lab run not completed yet |
| Claim / profile breadth | AV `age_over_18` only on the production engine path                                                                                                                       |
| Example UX              | Page chrome stays demo-branded; omit widget `demo-mode` so the in-widget banner follows `X-Eudi-Mode` from `POST /sessions`                                               |

---

## Missing / not attempted

| Area                                       | Notes                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| W3C Digital Credentials API (DC API)       | Skipped in the current engine path                                                                                          |
| ZKP presentations                          | Roadmap                                                                                                                     |
| mdoc batch / credential sets               | Not implemented                                                                                                             |
| `direct_post.jwt` on the plain AV lab path | AV wallet lab run used plain `direct_post`; `direct_post.jwt` only exercised via the `haip` config block (see "What works") |
| EU LOTL / national trusted lists           | `LotlTrustStore` roadmap; no live trusted-list enrollment documented here                                                   |
| German / SPRIND sandbox wallets            | Not in this report                                                                                                          |

---

## How to reproduce (high level)

1. Build packages: `pnpm install && pnpm build` at the repo root.
2. Start the shared API in production mode (LAN-reachable `BASE_URL`, `HOST=0.0.0.0`, lab `EUDI_TRUST=skip` as needed): see [examples/server/README.md](../examples/server/README.md).
3. Start `examples/html-vanilla` (or React/Vue) against that API.
4. Present from an AV-compatible wallet that can reach the callback URL.

Demo mode (`OpenEudiEngine`) remains the default for public examples and [demo.eudi-verify.eu](https://demo.eudi-verify.eu/). Production OpenID4VP is opt-in via `EUDI_MODE=production`.

---

## Related

- [SUPPORTED.md](./SUPPORTED.md): supported platforms vs roadmap
- [THREAT_MODEL.md](../THREAT_MODEL.md): trust level, replay, production-path threats
- [packages/server/README.md](../packages/server/README.md): engine configuration
