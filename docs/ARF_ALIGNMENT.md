# ARF Alignment

This document maps `eudi-verify` implementation to the [EU Digital Identity Wallet Architecture and Reference Framework (ARF) v2.8](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework).

**Purpose:** Demonstrate standards compliance for EU technical reviewers, grant evaluators, and national sandbox programs.

**Status:** Demo engine by default; a production OpenID4VP engine ships alongside it and is **OpenID Certified** for the HAIP 1.0 Final verifier profile (`iso_mdl` + `direct_post.jwt`). Trust-list validation against EU Trusted Lists remains on the roadmap. Honest per-area status: [INTEROP.md](INTEROP.md) and [SUPPORTED.md](SUPPORTED.md); see also [Current Limitations](#current-limitations).

---

## Role in ARF Ecosystem

| ARF Role                          | `eudi-verify` Implementation                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Relying Party (RP) / Verifier** | Core role — `@eudi-verify/server` implements the verifier backend; `@eudi-verify/embed` provides the relying party UI widget |
| **Wallet Provider**               | Not implemented — wallet is external (EUDI Wallet apps from Member States)                                                   |
| **PID/Attestation Issuer**        | Not implemented — relies on government/trusted issuers                                                                       |

`eudi-verify` is a **Relying Party toolkit** — it helps websites verify claims from EUDI Wallets without building OpenID4VP infrastructure from scratch.

---

## OpenEUDI dependencies

| Package                   | Relationship today                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **`@openeudi/core`**      | **Direct runtime dependency** of `@eudi-verify/server`: `OpenEudiEngine` wraps its `DemoMode` |
| **`@openeudi/openid4vp`** | **Direct runtime dependency**: `Openid4vpEngine` uses it for real VP parsing and verification |

Demo mode uses `@openeudi/core` with simulated wallet responses. Production mode uses `@openeudi/openid4vp` for real OpenID4VP verification. Both sit behind the same `VerifierEngine` interface, which is the portability seam: swapping the protocol implementation is a one-file change.

---

## Protocol Alignment

### OpenID4VP (ARF § 6.2)

ARF mandates OpenID for Verifiable Presentations (OpenID4VP) as the credential presentation protocol.

| ARF Requirement           | `eudi-verify` Implementation                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **OpenID4VP flow**        | `OpenEudiEngine` on `@openeudi/core` (demo, simulated); `Openid4vpEngine` on `@openeudi/openid4vp` (production, real) |
| **Authorization Request** | `POST /sessions` → generates authorization request → QR URL (`qrUrl` in response)                                     |
| **VP Token Response**     | `POST /callback` receives VP token from wallet (production); demo mode simulates wallet response                      |
| **Selective Disclosure**  | Supported via `VerificationRequest` schema (request only needed claims: `age_over_18`, `nationality`, etc.)           |

**Demo vs Production:**

- **Demo mode (default):** simulates wallet responses via `@openeudi/core`; no real cryptographic verification
- **Production mode:** `Openid4vpEngine` performs real VP verification: issuer signature, device/holder binding, DCQL match, and nonce binding. Validated end to end against the EU Age Verification reference wallet (lab). Issuer trust anchoring is configurable (`TrustStore` / `StaticTrustStore`) and surfaced to callers as `trustLevel`; EU Trusted List ingestion is not implemented (see [§ Production Roadmap](#production-roadmap))

### HAIP (High Assurance Interoperability Profile)

**HAIP** (High Assurance Interoperability Profile) is the EU’s production OpenID4VP profile — SD-JWT VC / mDL formats, trust lists, and registered relying parties so wallets interoperate across Member States.

| HAIP Component                 | Status                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **mdoc (ISO 18013-5)** format  | ✅ Implemented and **OpenID Certified** for the `iso_mdl` verifier profile                                                |
| **SD-JWT VC** format           | Roadmap for this document's scope: see [SUPPORTED.md](SUPPORTED.md) for the current shipping position                     |
| **`direct_post.jwt`** response | ✅ Implemented: signed request object (JAR) fetched from `request_uri`, per-request ephemeral encryption key              |
| **`x509_hash` client_id**      | ✅ Implemented: `client_id` derived from the verifier's access certificate                                                |
| **Registered relying party**   | Not implemented: requires Registrar-issued access certificate + registration certificate (Member State registration)      |
| **Trust list validation**      | Not implemented: `StaticTrustStore` supports out-of-band anchors; EU Trusted List ingestion is roadmap                    |
| **Presentation flow**          | Production path available today; deploy notes in [deploy-eu.md](deploy-eu.md), honest results in [INTEROP.md](INTEROP.md) |

**OpenID Certified (2026-08-14):** entity `eudi-verify`, deployment `1.4.0`, profile _OID4VP-1.0+HAIP-1.0 Verifier `iso_mdl` `direct_post.jwt`_. [Listing](https://openid.net/certification/certified-oid4vp-haip-final/) · [public test results](https://www.certification.openid.net/plan-detail.html?plan=YuR6NiK5aGzUF&public=true). The mark covers that verifier profile only: not the wallet side, not other credential formats, and not full PID coverage.

---

## API Mapping to ARF Concepts

### Session Lifecycle

ARF describes the presentation flow as: **request → wallet response → verification**. `eudi-verify` implements this via REST API:

| ARF Concept                     | `eudi-verify` API                  | OpenAPI Reference                                      |
| ------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| **Create presentation request** | `POST /sessions`                   | [`createSession`](../openapi/eudi-verifier.yaml#L45)   |
| **Presentation request URL**    | `qrUrl` field in session response  | Encodes OpenID4VP authorization request                |
| **Session state tracking**      | `GET /sessions/{sessionId}`        | [`getSession`](../openapi/eudi-verifier.yaml#L91)      |
| **Wallet callback**             | `POST /callback` (production)      | [`walletCallback`](../openapi/eudi-verifier.yaml#L176) |
| **Verification result**         | `status: verified` + `token` field | Session response when verification succeeds            |

### Session Status State Machine

ARF implies states: _initiated → waiting → completed (success/failure)_. Our implementation:

```
pending → loading → waitingForWallet → verified | rejected | expired
```

Exposed via `GET /sessions/{sessionId}` (`status` field). See [`Session` schema](../openapi/eudi-verifier.yaml#L275) for full state list.

### Verification Token (Captcha Pattern)

ARF requires that **relying parties validate claims server-side**; clients must not be trusted.

**Our approach:**

1. Widget (client) receives opaque `token` when session status becomes `verified`
2. Merchant backend calls `POST /tokens/verify` to exchange token for verified claims
3. Token is single-use, HMAC-signed, TTL-limited (5 min default)

This implements ARF's trust boundary: **never trust client claims; always verify server-side**.

| Endpoint              | Purpose                      | OpenAPI                                             |
| --------------------- | ---------------------------- | --------------------------------------------------- |
| `POST /tokens/verify` | Server-side token validation | [`verifyToken`](../openapi/eudi-verifier.yaml#L144) |

**Token format:** `eudi_v1.<base64url(payload)>.<hmac>` — see [THREAT_MODEL.md](../THREAT_MODEL.md) for security design.

---

## Trust Model Alignment

ARF defines clear trust boundaries. Our implementation:

| ARF Trust Principle                                    | `eudi-verify` Implementation                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Wallet-issued VPs are cryptographically verifiable** | `Openid4vpEngine` on `@openeudi/openid4vp`: issuer signature, holder/device binding, DCQL match, nonce binding  |
| **Relying parties must verify VPs**                    | `VerifierEngine.handleCallback` processes wallet responses; server validates before returning `verified` status |
| **Clients (browsers) are untrusted**                   | Widget never sees verified claims; only opaque token; merchant server calls `/tokens/verify`                    |
| **Session integrity**                                  | Nonce binding in OpenID4VP flow (engine-managed); token bound to `sessionId`                                    |

**Demo mode deviation:** simulated wallet responses bypass cryptographic verification. Production mode enforces the checks above; per-threat detail is in [THREAT_MODEL.md](../THREAT_MODEL.md).

### Two trust directions, and they are asymmetric

The ARF separates authenticating the **Relying Party** from authenticating the **credential issuer**. They use different machinery, and only the second is a Trusted List lookup.

| Direction                                  | ARF machinery                                                                                                                                                                                                                                    | `eudi-verify` today                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wallet authenticates the Relying Party** | A **Registrar** registers the entity, which is the precondition for an **Access Certificate Authority** to issue a **Relying Party Access Certificate**. Intended uses ride in **Relying Party Registration Certificates**, one per intended use | Access certificate is supplied by configuration and presented in the signed request's `x5c`; `client_id` is derived from it. Registration certificates are not yet emitted |
| **Verifier authenticates the issuer**      | **PID Provider** and attestation provider trust anchors published on Member State **Trusted Lists**, discoverable via the EU List of Trusted Lists                                                                                               | `TrustStore` interface with `StaticTrustStore` for out-of-band anchors. Trusted List ingestion is roadmap                                                                  |

Note that **there is no Trusted List of Relying Parties**: the ARF treats one as infeasible at Union scale, so a wallet authenticates a Relying Party indirectly, by chaining its access certificate to an Access Certificate Authority whose own trust anchor is listed.

Practical consequence for adopters: the Relying Party side is something you **receive** through national registration, while the issuer side is something a verifier must **consume** at runtime.

---

## Selective Disclosure (ARF § 6.3.2)

ARF requires **minimal data disclosure** — wallets share only requested attributes.

**Implementation:**

```typescript
// Server API
POST /sessions
{
  "request": {
    "age_over_18": true,      // Request only age verification (not birth date)
    "nationality": true        // Optional: request nationality
  }
}
```

`VerificationRequest` schema ([`openapi/eudi-verifier.yaml`](../openapi/eudi-verifier.yaml#L293)) supports selective claims. Engine translates to OpenID4VP `claims` parameter.

**Verified response** (from `POST /tokens/verify`):

```json
{
  "verified": true,
  "claims": {
    "age_over_18": true,
    "nationality": "DE"
  }
}
```

Only requested + disclosed attributes appear in verified claims. ARF-compliant selective disclosure.

---

## Security Considerations (ARF § 8)

| ARF Security Requirement         | Implementation                                                              | Reference                                                    |
| -------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Confidentiality of user data** | HTTPS-only in production (enforced by deploy guides)                        | [deploy-eu.md](deploy-eu.md)                                 |
| **Integrity of VP tokens**       | VP signature verification via `@openeudi/openid4vp` in production mode      | [`VerifierEngine`](../packages/server/src/engine.ts)         |
| **Replay attack prevention**     | Single-use verification tokens; session nonce binding                       | [THREAT_MODEL.md](../THREAT_MODEL.md#t2-token-replay-attack) |
| **Rate limiting**                | Per-IP rate limits on `POST /sessions` and `POST /callback`                 | [THREAT_MODEL.md](../THREAT_MODEL.md#t6-abuse-dos)           |
| **Session timeout**              | Configurable TTL (default 5 min); expired sessions return `status: expired` | [`Session` schema](../openapi/eudi-verifier.yaml#L275)       |

**Additional mitigations** documented in [THREAT_MODEL.md](../THREAT_MODEL.md).

---

## Current Limitations

The following ARF requirements are **not yet implemented**:

| ARF Component                    | Status          | Blocker                                                                                            |
| -------------------------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| **EU Trusted List validation**   | Not implemented | Needs LOTL and national trusted list ingestion; `StaticTrustStore` is the interim path             |
| **Relying Party registration**   | Not started     | Requires a Member State Registrar: access certificate + registration certificate                   |
| **Registration certificates**    | Not implemented | Depends on registration above                                                                      |
| **Revocation / status checking** | Not implemented | Token Status List support not built                                                                |
| **Certified national wallets**   | Blocked         | Certified wallets expected from Dec 2026; testing to date is against reference and sandbox wallets |

Anchored issuer trust is **supported but not yet exercised end to end**: every lab run so far has used trust skip, so `trustLevel` has been `none`. See [INTEROP.md](INTEROP.md) for what has and has not been proven against real wallets.

**Demo mode warnings** (demo is the default engine):

- Simulated credentials (no real identity verification)
- No cryptographic verification of VPs
- `X-Eudi-Mode: demo` header on all responses

**Do not use demo mode in production.** It does not meet ARF security requirements. Production mode requires `Openid4vpEngine` with a configured `TrustStore`.

---

## Security Documentation (WP6 — Complete)

Baseline security documentation for open-source release:

- Threat model ([`THREAT_MODEL.md`](../THREAT_MODEL.md))
- Security disclosure policy ([`SECURITY.md`](../SECURITY.md))
- Dependency audit ([`DEPENDENCY.md`](../DEPENDENCY.md))
- CI license allowlist gate; demo-mode warnings (console, `X-Eudi-Mode` header, embed banner)

---

## Production Roadmap

Planned work to achieve full ARF compliance:

### Remaining milestones

- **Trusted List validation:** verify issuer certificates against EU and Member State Trusted Lists, with refresh, caching, and a documented failure model
- **Revocation:** Token Status List checking, so a credential can be judged trustworthy _now_ rather than only well-issued
- **Relying Party registration:** obtain a Registrar-issued access certificate and emit registration certificates
- **Anchored trust in the field:** first run with `trustLevel: anchored` against a real wallet
- **Certified wallet interop:** testing against national wallets as they certify from Dec 2026

Completed since this section was first written: production OpenID4VP verification, HAIP 1.0 Final `direct_post.jwt`, and OpenID certification of the `iso_mdl` verifier profile.

See [PLAN.md](PLAN.md) for the detailed technical roadmap and [SUPPORTED.md](SUPPORTED.md) for the canonical supported-versus-roadmap matrix.

---

## Interoperability Testing

ARF emphasizes interoperability across Member State wallets. Our testing strategy:

| Test Phase                   | Approach                                                                                       | Status        |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ------------- |
| **Demo mode**                | Simulated wallet responses; html-vanilla reference app                                         | ✅ Done       |
| **Reference wallet**         | EU Age Verification reference wallet on iOS presenting mdoc `age_over_18` to `Openid4vpEngine` | ✅ Done       |
| **Conformance suite**        | OpenID Foundation HAIP verifier plan, run on both the demo and production suites               | ✅ Certified  |
| **National sandbox**         | Test against Member State sandbox wallets as access is granted                                 | In progress   |
| **Certified wallet interop** | Full interop testing with certified national wallets                                           | From Dec 2026 |

**Interop evidence** is published in [INTEROP.md](INTEROP.md), including what does _not_ work. Conformance results are public: [test results](https://www.certification.openid.net/plan-detail.html?plan=YuR6NiK5aGzUF&public=true).

---

## Compliance Summary

| ARF Area                  | Compliance Level | Notes                                                                                         |
| ------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| **Relying Party Role**    | ✅ Aligned       | REST API + widget implement RP surface                                                        |
| **OpenID4VP Protocol**    | ✅ Aligned       | Real verification via `@openeudi/openid4vp`; demo flow via `@openeudi/core`                   |
| **Selective Disclosure**  | ✅ Aligned       | `VerificationRequest` schema supports minimal claims                                          |
| **Trust Boundaries**      | ✅ Aligned       | Server-side token verify; clients untrusted                                                   |
| **Security (Demo)**       | ⚠️ Partial       | Rate limits, TTL, HMAC tokens, but no real VP verification. Demo is not a production posture  |
| **Security (Production)** | ⚠️ Partial       | VP signature and binding verified; issuer trust anchoring supported but Trusted Lists pending |
| **HAIP Profile**          | ✅ Certified     | `iso_mdl` + `direct_post.jwt` verifier profile, OpenID Certified 2026-08-14                   |
| **Revocation**            | 🔴 Not Started   | Token Status List checking not implemented                                                    |
| **Trust Framework**       | 🔴 Not Started   | Requires Member State Registrar registration                                                  |

**Conclusion:** Architecture, API design, and the production verification path align with ARF v2.8 principles, with the HAIP verifier profile independently certified. What remains is ecosystem-dependent: Trusted List ingestion, revocation, Relying Party registration, and interop with national wallets as they certify.

---

## References

- [ARF v2.8](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework) — EU Architecture and Reference Framework
- [OpenID4VP Spec](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) — Protocol specification
- [EUDI DevHub](https://eu-digital-identity-wallet.github.io/) — Official developer resources
- [`@openeudi/core`](https://github.com/openeudi/core) — Protocol library we build on (demo engine)
- [`@openeudi/openid4vp`](https://github.com/openeudi/openid4vp) — OpenID4VP library we build on (production engine)
- [EUDI Wallet Reference Implementation](https://github.com/eu-digital-identity-wallet) — Official reference codebase (Kotlin)

**Internal docs:**

- [PLAN.md](PLAN.md) — Technical roadmap
- [THREAT_MODEL.md](../THREAT_MODEL.md) — Security design
- [INTEGRATION.md](INTEGRATION.md) — Quick start (server, tokens)
- [integration-architecture.md](integration-architecture.md) — Diagrams and request flows
- [integration-frontend.md](integration-frontend.md) — Widget, React, Vue, custom UI
- [deploy-eu.md](deploy-eu.md) — EU deployment (Hetzner, self-hosted)
