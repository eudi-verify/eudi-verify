# Interop notes (lab)

Honest status of real-wallet OpenID4VP against `@eudi-verify/server`, distilled from lab runs. Platform support and roadmap stay in [SUPPORTED.md](./SUPPORTED.md). Integration how-to stays in [INTEGRATION.md](./INTEGRATION.md).

**Scope of what was tested:** EU Age Verification (AV) reference wallet on iOS presenting `eu.europa.ec.av.1` / `age_over_18` to `Openid4vpEngine` (`@openeudi/openid4vp`), earlier end-to-end runs against the EU reference verifier stack, the German EUDI Ecosystem Sandbox wallet (iOS, SPRIND) presenting a PID in both SD-JWT VC and mdoc form, once with issuer trust anchored (`trustLevel: anchored`), and the full applicable OpenID Foundation HAIP conformance suite plan against the HAIP 1.0 Final `direct_post.jwt` path (see below), run on both the free demo suite and the production suite. **OpenID Certified** for the HAIP verifier profile below: the mark covers `iso_mdl` + `direct_post.jwt` only, not the AV lab path and not full PID coverage.

---

## What works

| Area                                                           | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference verifier + AV wallet (EU stack)                      | End-to-end presentation completes (lab)                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `Openid4vpEngine` + plain `direct_post`                        | Wallet POSTs `vp_token` + `state` to `/callback`                                                                                                                                                                                                                                                                                                                                                                                                                           |
| mdoc `eu.europa.ec.av.1` / `age_over_18`                       | Claims verified; server mints `eudi_v1` token                                                                                                                                                                                                                                                                                                                                                                                                                              |
| SessionTranscript                                              | OpenID4VP 1.0 unencrypted handover (plain `direct_post`, no JWE `apu`)                                                                                                                                                                                                                                                                                                                                                                                                     |
| Example stack                                                  | `EUDI_MODE=production` on `examples/server` + `examples/html-vanilla`                                                                                                                                                                                                                                                                                                                                                                                                      |
| Negative binding                                               | Mutating `clientId` / `responseUri` / `nonce` rejects the presentation                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Openid4vpEngine` + `haip` (HAIP 1.0 Final, `direct_post.jwt`) | Passed all 4 applicable OpenID Foundation HAIP conformance suite modules (`iso_mdl` + `direct_post.jwt`; the other 8 in the plan are SD-JWT VC-only and not instantiated for an mdoc-only verifier): `happy-flow`, `request-uri-fetched-twice`, `invalid-session-transcript` all FAILURE 0; `request-uri-method-post` self-skips (verifier never emits `request_uri_method`). Run on both the free demo suite and the production suite (2026-08-14). Certified: see below. |

### German EUDI Ecosystem Sandbox (2026-08-28)

Registered as a relying party with the sandbox registrar, obtained an X.509 access certificate by CSR, and ran the sandbox wallet (iOS) against `examples/server` on the `haip` path.

| Area                                                       | Result                                                                                                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Registrar-issued access certificate in the JAR `x5c`       | Wallet chains it to the sandbox registrar CA, checks the CRL, and reports the relying party as trusted                                        |
| `client_id` prefix `x509_hash`                             | Accepted. The certificate's SAN host names are not compared against the host actually serving `request_uri` / `response_uri`                  |
| SD-JWT VC PID, `urn:eudi:pid:de:1`, `age_equal_or_over.18` | Presentation verified                                                                                                                         |
| mdoc PID, `eu.europa.ec.eudi.pid.1`, `age_over_18`         | Presentation verified with a single-format request. The claim is in the base namespace, so no doctype-specific namespace mapping was needed   |
| Dual-format DCQL via `credential_sets`                     | Wallet resolves both options against credentials it holds and presents one of them. Which one is the wallet's choice                          |
| Registration certificate / `verifier_info`                 | Not required by this wallet for an age claim. Still expected by the sandbox's own request validator, so treat it as a profile-conformance gap |

Those runs used `EUDI_TRUST=skip`, so `trustLevel` was `none`. What they establish is that the wallet trusts the verifier, which is the opposite direction from issuer trust anchoring. That second direction was closed three days later.

### Anchored issuer trust (2026-08-31)

Re-ran the mdoc PID presentation with `EUDI_TRUST=static` and the sandbox PID provider CA as the trust anchor.

| Area                        | Result                                                                                                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trustLevel`                | `anchored`. The issued token carries it, and the presentation verified with `age_over_18: true`                                                                                                                      |
| Trust anchor source         | The sandbox publishes its PID provider CAs in an ETSI TS 119 602 list of trusted entities, alongside the registrar list. Four CAs, covering the real and demo PID branches                                           |
| Anchor that matched         | The sandbox PID's mdoc issuer chains to the Bundesdruckerei preprod PID provider CA. The other three published CAs are not exercised by this credential                                                              |
| Reader-side certificate DNs | The registrar CA served by the sandbox API is the one to anchor against. An older copy of the same key published under a different DN spelling fails name-based path building, while signature checking still passes |

Anchoring both directions at once means the wallet trusts the verifier's access certificate and the verifier trusts the credential's issuer, which is the full trust seam for a presentation. Anchoring is per-anchor and not transitive: a sandbox that rotates to a different PID provider CA needs its new anchor configured.

`EUDI_TRUSTED_CERTS` in `examples/server` accepts a comma-separated list, so a run can anchor on several candidate CAs when it is not yet known which one a credential chains to.

**OpenID Certified (2026-08-14):** entity `eudi-verify`, deployment `1.4.0`, profile _OID4VP-1.0+HAIP-1.0 Verifier `iso_mdl` `direct_post.jwt`_. Listing: [certified-oid4vp-haip-final](https://openid.net/certification/certified-oid4vp-haip-final/) · [public test results](https://www.certification.openid.net/plan-detail.html?plan=YuR6NiK5aGzUF&public=true). Self-certification under the OpenID Foundation program: it certifies this verifier profile, not the wallet side and not other credential formats. The certified build is the engine with `@openeudi/openid4vp` pinned to fork commit `e08c2a81`, which ships on npm from `@eudi-verify/server` 1.4.1: the submitted deployment string `1.4.0` names the repo state that was tested, and npm 1.4.0 predates that pin. That fork work is now upstream in `@openeudi/openid4vp` 0.10.0 ([openeudi/openid4vp#33](https://github.com/openeudi/openid4vp/pull/33)), which this package depends on by semver range.

**Lab config that matched the happy path:** `client_id=redirect_uri:<response_uri>`, DCQL by value, `response_mode=direct_post`, trust skip (see below).

**LAN footgun:** when `BASE_URL` uses a LAN IP, the API must listen on `HOST=0.0.0.0`. Binding only `127.0.0.1` makes the phone unable to POST `/callback` (wallet shows a generic present/share failure). See [examples/server/README.md](../examples/server/README.md).

---

## Partial

| Area                    | Status                                                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Issuer trust            | Anchored against the German sandbox PID provider CA on 2026-08-31 → `trustLevel: anchored` (see above). Still partial because it is one static anchor for one credential: the AV lab runs remain `EUDI_TRUST=skip` → `trustLevel: none`, and there is no trusted-list-driven anchoring yet |
| Claim / profile breadth | Age claims only on the production engine path: AV `age_over_18`, and German PID `age_over_18` / `age_equal_or_over.18`                                                                                                                                                                     |
| Example UX              | Page chrome stays demo-branded; omit widget `demo-mode` so the in-widget banner follows `X-Eudi-Mode` from `POST /sessions`                                                                                                                                                                |

---

## Missing / not attempted

| Area                                       | Notes                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| W3C Digital Credentials API (DC API)       | Skipped in the current engine path                                                                                          |
| ZKP presentations                          | Roadmap                                                                                                                     |
| mdoc batch                                 | Not implemented                                                                                                             |
| `direct_post.jwt` on the plain AV lab path | AV wallet lab run used plain `direct_post`; `direct_post.jwt` only exercised via the `haip` config block (see "What works") |
| EU LOTL / national trusted lists           | `LotlTrustStore` roadmap; no live trusted-list enrollment documented here                                                   |
| PID attributes beyond age                  | Only age claims requested so far, on both formats                                                                           |

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
