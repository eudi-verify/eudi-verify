# EUDI Verifier Threat Model

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    UNTRUSTED                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Browser   │  │  Wallet UI  │  │   Network   │          │
│  │   Widget    │  │   Display   │  │   Traffic   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARY                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRUSTED (after verification)             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Verifier   │  │  OpenEUDI   │  │  Merchant   │          │
│  │   Server    │  │   Library   │  │   Backend   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Threat Analysis

### T1: Client Fakes Verified Claims

**Status:** `[IMPLEMENTED]`

**Threat**: Malicious JavaScript modifies verification flow to inject fake claims.

**Implemented Mitigations**:

- Widget returns opaque, signed verification token
- Claims are visible in session polling response for UX display only
- Merchant server MUST call `POST /tokens/verify` for authoritative claims
- Token signature prevents forgery (HMAC-SHA256)
- Authorization decisions must happen server-side with verified claims

**Residual Risk**: Low - client-side claims are cosmetic; token verification provides authoritative claims

**Notes**: Claims appear in `GET /sessions/:id` response to enable user confirmation UI. Never make authorization decisions based on client-side claims. Always verify the token server-side.

---

### T2: Token Replay Attack

**Status:** `[IMPLEMENTED]`

**Threat**: Attacker captures valid token and reuses it.

**Implemented Mitigations**:

- Tokens are single-use (consumed atomically via `IKVStore.getAndDelete`)
- Short TTL (5 minutes default, configurable)
- Token bound to session ID
- Claims hash prevents token/session mismatch

**Residual Risk**: Very low within TTL window

---

### T3: Token Forgery

**Status:** `[IMPLEMENTED]`

**Threat**: Attacker creates fake token without completing verification.

**Implemented Mitigations**:

- HMAC-SHA256 signature with server secret
- Constant-time signature comparison (`crypto.timingSafeEqual`)
- Token format: `eudi_v1.<base64url-payload>.<signature>`
- Secret must be minimum 32 characters (enforced)
- Claims hash validates payload integrity

**Residual Risk**: Negligible with proper secret management

---

### T4: Session Fixation

**Status:** `[IMPLEMENTED]`

**Threat**: Attacker pre-creates session and tricks user into verifying it.

**Implemented Mitigations**:

- Sessions bound to cryptographic nonce (via OpenEUDI)
- State parameter validated on callback
- Session expires after 5 minutes (configurable)
- Random session IDs (UUID v4)

**Residual Risk**: Low - standard OAuth/OIDC mitigations apply

---

### T5: VP Tampering

**Status:** `[IMPLEMENTED]` (demo mode) / `[PLANNED]` (production)

**Threat**: Attacker modifies Verifiable Presentation in transit.

**Implemented Mitigations (Demo)**:

- VP signature verification (simulated in demo mode)
- Delegated to `@openeudi/openid4vp` library

**Planned Mitigations (Production)**:

- Full cryptographic VP signature verification
- Selective disclosure hash validation
- EU trust list verification

**Residual Risk**: Negligible in production - cryptographic guarantees

---

### T6: Man-in-the-Middle

**Status:** `[PARTIAL]`

**Threat**: Attacker intercepts wallet callback.

**Implemented Mitigations**:

- Callback URL pinned to configured `baseUrl`

**Planned Mitigations**:

- HTTPS enforcement in production deployments
- JWE encryption for wallet callback (production mode)

**Residual Risk**: Standard TLS threat model; HTTPS enforcement is deployment responsibility

**Notes**: Demo mode allows HTTP for local testing. Production deployments must use HTTPS.

---

### T7: CSRF on Session Creation

**Status:** `[PARTIAL]`

**Threat**: Attacker triggers verification on victim's behalf.

**Implemented Mitigations**:

- Origin header validation on `POST /sessions`
- Configurable allowed origins list

**Planned Mitigations**:

- Referer check as fallback for legacy proxies
- Optional CSRF token for cookie-authenticated sites

**Residual Risk**: Low with Origin check; Referer fallback adds defense-in-depth

---

### T8: Denial of Service

**Status:** `[IMPLEMENTED]`

**Threat**: Attacker floods session creation endpoint.

**Implemented Mitigations**:

- Per-IP rate limiting (10 requests/min default, configurable)
- Session TTL limits memory growth (5 minutes default)
- Configurable rate limit thresholds (`maxRequests`, `windowMs`)

**Residual Risk**: Medium - sophisticated attacks may need CDN/WAF

**Notes**: Rate limiting uses in-memory store by default. Production deployments should consider Redis-backed rate limiting for multi-instance setups.

---

### T9: Secret Leakage

**Status:** `[PARTIAL]`

**Threat**: Token signing secret exposed.

**Implemented Mitigations**:

- Secret from environment variable only
- Never in client bundle
- Minimum 32-character requirement enforced
- Token includes `kid` (key ID) field for future rotation support

**Planned Mitigations**:

- Multi-key rotation support (verify with multiple active secrets)
- Documented rotation procedure

**Residual Risk**: Operational - depends on deployment hygiene

**Current Limitation**: Key rotation requires redeployment. Active tokens (5-minute TTL) will fail verification during rotation window. For zero-downtime rotation, schedule deployments during low-traffic periods or implement graceful draining. Multi-key support planned for future release.

---

### T10: Dependency Vulnerabilities

**Status:** `[IMPLEMENTED]`

**Threat**: Vulnerable dependency compromises server.

**Implemented Mitigations**:

- `pnpm audit` in CI (fails on high/critical)
- Dependabot security alerts enabled
- License allowlist enforcement in CI
- Minimal dependency surface (only `@openeudi/core` in runtime)

**Residual Risk**: Medium - standard supply chain risk

**Notes**: See [DEPENDENCY.md](DEPENDENCY.md) for full dependency analysis.

---

## Security by Mode

| Control         | Demo Mode          | Production Mode                 |
| --------------- | ------------------ | ------------------------------- |
| VP Verification | Simulated          | Full cryptographic verification |
| Trust Lists     | None               | EU trust list (when available)  |
| HTTPS Required  | No (local testing) | Yes (deployment responsibility) |
| Rate Limiting   | Yes                | Yes                             |
| Token Security  | Full               | Full                            |
| Audit Logging   | Console warnings   | Structured logging (planned)    |

## Future Hardening

The following controls are on the roadmap for production release:

1. **T6**: JWE encryption for wallet callbacks
2. **T7**: Referer fallback and optional CSRF tokens
3. **T9**: Multi-key rotation support (verify with key lookup by `kid`)
4. **General**: Structured audit logging with session lifecycle events
5. **General**: Redis-backed session and rate limit stores for multi-instance deployments

## Keeping This Document Updated

When implementing security controls:

1. Update threat status in this document (`IMPLEMENTED`, `PARTIAL`, `PLANNED`)
2. Link to GitHub issues for planned work
3. Remove from "Future Hardening" when completed

See [.cursor/rules/threat-model-sync.mdc](.cursor/rules/threat-model-sync.mdc) for sync guidelines.

---

**Last Updated**: 2026-06-14  
**Version**: 1.0.2 (demo mode)
