# ARF Alignment

This document maps `eudi-verify` implementation to the [EU Digital Identity Wallet Architecture and Reference Framework (ARF) v2.8](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework).

**Purpose:** Demonstrate standards compliance for EU technical reviewers, grant evaluators, and national sandbox programs.

**Status:** Demo mode implementation. Production HAIP and trust-list validation are on the roadmap — see [PLAN.md](PLAN.md) and [Current Limitations](#current-limitations).

---

## Role in ARF Ecosystem

| ARF Role                          | `eudi-verify` Implementation                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Relying Party (RP) / Verifier** | Core role — `@eudi-verify/server` implements the verifier backend; `@eudi-verify/embed` provides the relying party UI widget |
| **Wallet Provider**               | Not implemented — wallet is external (EUDI Wallet apps from Member States)                                                   |
| **PID/Attestation Issuer**        | Not implemented — relies on government/trusted issuers                                                                       |

`eudi-verify` is a **Relying Party toolkit** — it helps websites verify claims from EUDI Wallets without building OpenID4VP infrastructure from scratch.

---

## OpenEUDI dependencies (accurate as of v0.1)

| Package                   | Relationship today                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| **`@openeudi/core`**      | **Direct runtime dependency** of `@eudi-verify/server` — `OpenEudiEngine` wraps it             |
| **`@openeudi/openid4vp`** | **Not a direct dependency today** — planned for production VP parsing/verification (HAIP path) |

Demo mode uses `@openeudi/core` with simulated wallet responses. Production HAIP will add real OpenID4VP verification — expected via `@openeudi/openid4vp` (or equivalent APIs in the OpenEUDI stack), behind the same `VerifierEngine` interface.

---

## Protocol Alignment

### OpenID4VP (ARF § 6.2)

ARF mandates OpenID for Verifiable Presentations (OpenID4VP) as the credential presentation protocol.

| ARF Requirement           | `eudi-verify` Implementation                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **OpenID4VP flow**        | `OpenEudiEngine` on `@openeudi/core` (demo: simulated; production: roadmap)                                 |
| **Authorization Request** | `POST /sessions` → generates authorization request → QR URL (`qrUrl` in response)                           |
| **VP Token Response**     | `POST /callback` receives VP token from wallet (production); demo mode simulates wallet response            |
| **Selective Disclosure**  | Supported via `VerificationRequest` schema (request only needed claims: `age_over_18`, `nationality`, etc.) |

**Demo vs Production:**

- **Demo mode:** simulates wallet responses via `@openeudi/core`; no real cryptographic verification
- **Production mode (roadmap):** full OpenID4VP with VP signature verification, trust-list validation (see [§ Production Roadmap](#production-roadmap))

### HAIP (High Assurance Interoperability Profile)

**HAIP** (High Assurance Interoperability Profile) is the EU’s production OpenID4VP profile — SD-JWT VC / mDL formats, trust lists, and registered relying parties so wallets interoperate across Member States.

| HAIP Component                 | Status                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------- |
| **SD-JWT VC** format           | Roadmap — OpenEUDI `openid4vp` library exists; not wired into eudi-verify yet    |
| **mDL (ISO 18013-5)** format   | Roadmap — same                                                                   |
| **Trust framework enrollment** | Not implemented — requires legal entity + Member State registration              |
| **Presentation flow**          | Demo mode today; HAIP production path documented in [deploy-eu.md](deploy-eu.md) |

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
| **Wallet-issued VPs are cryptographically verifiable** | Roadmap: `@openeudi/openid4vp` (or OpenEUDI stack) behind `VerifierEngine` — not in demo mode                   |
| **Relying parties must verify VPs**                    | `VerifierEngine.handleCallback` processes wallet responses; server validates before returning `verified` status |
| **Clients (browsers) are untrusted**                   | Widget never sees verified claims; only opaque token; merchant server calls `/tokens/verify`                    |
| **Session integrity**                                  | Nonce binding in OpenID4VP flow (engine-managed); token bound to `sessionId`                                    |

**Demo mode deviation:** simulated wallet responses bypass cryptographic verification. Production mode will enforce full ARF trust model (see roadmap).

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
| **Integrity of VP tokens**       | VP signature verification (roadmap: `@openeudi/openid4vp` in production)    | [`VerifierEngine`](../packages/server/src/engine.ts)         |
| **Replay attack prevention**     | Single-use verification tokens; session nonce binding                       | [THREAT_MODEL.md](../THREAT_MODEL.md#t2-token-replay-attack) |
| **Rate limiting**                | Per-IP rate limits on `POST /sessions` and `POST /callback`                 | [THREAT_MODEL.md](../THREAT_MODEL.md#t6-abuse-dos)           |
| **Session timeout**              | Configurable TTL (default 5 min); expired sessions return `status: expired` | [`Session` schema](../openapi/eudi-verifier.yaml#L275)       |

**Additional mitigations** documented in [THREAT_MODEL.md](../THREAT_MODEL.md).

---

## Current Limitations

⚠️ **Demo mode only.** The following ARF requirements are **not yet implemented**:

| ARF Component                     | Status                       | Blocker                                         |
| --------------------------------- | ---------------------------- | ----------------------------------------------- |
| **Production wallet interaction** | Roadmap                      | No certified wallets available (due Dec 2026)   |
| **VP signature verification**     | Roadmap                      | Requires production wallet + trust lists        |
| **Trust framework enrollment**    | Not started                  | Requires legal entity + national registration   |
| **HAIP full compliance**          | Partial (protocol lib ready) | Integration + testing with real wallets pending |
| **EU Trust List validation**      | Not implemented              | Trust list infrastructure not live yet          |

**Demo mode warnings:**

- Simulated credentials (no real identity verification)
- No cryptographic verification of VPs
- `X-Eudi-Mode: demo` header on all responses

**Do not use demo mode in production.** It does not meet ARF security requirements.

---

## Production Roadmap

Planned work to achieve full ARF compliance:

### WP6 — Security Documentation (In Progress)

- Threat model (✅ complete)
- Security disclosure policy (✅ complete)
- Dependency audit (`DEPENDENCY.md` ✅ complete)

### Post-Demo Milestones

- **Production HAIP:** add `@openeudi/openid4vp` (or equivalent) for SD-JWT VC + mDL verification
- **Trust-list validation:** verify issuer certificates against EU Trust Lists
- **National sandbox testing:** interop with Denmark/Ireland/other public sandbox wallets
- **Trust framework registration:** register as relying party in national/EU ecosystem (requires legal entity)

See [PLAN.md](PLAN.md) for detailed technical roadmap.

---

## Interoperability Testing

ARF emphasizes interoperability across Member State wallets. Our testing strategy:

| Test Phase                   | Approach                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| **Demo mode (today)**        | Simulated wallet responses; html-vanilla reference app                   |
| **Sandbox testing**          | Test against national sandbox wallets (Denmark, Ireland) when accessible |
| **Pilot participation**      | Apply to APTITUDE / WE BUILD or similar pilots once demo is public       |
| **Production certification** | Full interop testing with certified wallets (post Dec 2026)              |

**Interop evidence** (planned): publish test results showing compatibility with official [EUDI Wallet Reference Implementation](https://github.com/eu-digital-identity-wallet).

---

## Compliance Summary

| ARF Area                  | Compliance Level | Notes                                                                |
| ------------------------- | ---------------- | -------------------------------------------------------------------- |
| **Relying Party Role**    | ✅ Aligned       | REST API + widget implement RP surface                               |
| **OpenID4VP Protocol**    | ⚠️ Demo aligned  | Flow via `@openeudi/core`; production crypto via `openid4vp` roadmap |
| **Selective Disclosure**  | ✅ Aligned       | `VerificationRequest` schema supports minimal claims                 |
| **Trust Boundaries**      | ✅ Aligned       | Server-side token verify; clients untrusted                          |
| **Security (Demo)**       | ⚠️ Partial       | Rate limits, TTL, HMAC tokens — but no real VP verification          |
| **Security (Production)** | 🔜 Roadmap       | VP signature + trust-list validation pending                         |
| **HAIP Full Profile**     | 🔜 Roadmap       | Protocol support ready; integration + testing pending                |
| **Trust Framework**       | 🔴 Not Started   | Requires legal entity + national registration                        |

**Conclusion:** Architecture and API design align with ARF v2.8 principles. Demo mode demonstrates concept; production mode requires certified wallets + trust infrastructure (expected late 2026).

---

## References

- [ARF v2.8](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework) — EU Architecture and Reference Framework
- [OpenID4VP Spec](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) — Protocol specification
- [EUDI DevHub](https://eu-digital-identity-wallet.github.io/) — Official developer resources
- [`@openeudi/core`](https://github.com/openeudi/core) — Protocol library we build on
- [EUDI Wallet Reference Implementation](https://github.com/eu-digital-identity-wallet) — Official reference codebase (Kotlin)

**Internal docs:**

- [PLAN.md](PLAN.md) — Technical roadmap
- [THREAT_MODEL.md](../THREAT_MODEL.md) — Security design
- [INTEGRATION.md](INTEGRATION.md) — End-to-end integration guide
- [deploy-eu.md](deploy-eu.md) — EU deployment (Hetzner, self-hosted)
