# WP6: Security Documentation

## Overview

Create security documentation for responsible open-source release. Documents threats, mitigations, disclosure policy, and dependency analysis.

## Prerequisites

- WP2 completed: Server with token security implemented
- Understanding of OpenID4VP security model

## Deliverables

### 1. Threat Model (`THREAT_MODEL.md`)

```markdown
# EUDI Verifier Threat Model

## Trust Boundaries

\`\`\`
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
\`\`\`

## Threat Analysis

### T1: Client Fakes Verified Claims

**Threat**: Malicious JavaScript modifies `onVerified` event to inject fake claims.

**Mitigation**: 
- Widget returns opaque token only, never raw claims to client
- Merchant server MUST call `POST /tokens/verify`
- Claims only returned from server-side verify endpoint

**Residual Risk**: Low - requires compromised merchant server

---

### T2: Token Replay Attack

**Threat**: Attacker captures valid token and reuses it.

**Mitigation**:
- Tokens are single-use (consumed on verify via `IKVStore.getAndDelete`)
- Short TTL (5 minutes default)
- Token bound to session ID

**Residual Risk**: Very low within TTL window

---

### T3: Token Forgery

**Threat**: Attacker creates fake token without completing verification.

**Mitigation**:
- HMAC-SHA256 signature with server secret
- Constant-time signature comparison (`crypto.timingSafeEqual`)
- Secret rotation support via `kid` field

**Residual Risk**: Negligible with proper secret management

---

### T4: Session Fixation

**Threat**: Attacker pre-creates session and tricks user into verifying it.

**Mitigation**:
- Sessions bound to cryptographic nonce (via OpenEUDI)
- State parameter validated on callback
- Session expires after 5 minutes

**Residual Risk**: Low - standard OAuth/OIDC mitigations apply

---

### T5: VP Tampering

**Threat**: Attacker modifies Verifiable Presentation in transit.

**Mitigation**:
- VP signature verification (delegated to @openeudi/openid4vp)
- Selective disclosure hash validation
- EU trust list verification (production)

**Residual Risk**: Negligible - cryptographic guarantees

---

### T6: Man-in-the-Middle

**Threat**: Attacker intercepts wallet callback.

**Mitigation**:
- HTTPS required (enforced in production)
- Callback URL pinned to configured `baseUrl`
- JWE encryption in production mode

**Residual Risk**: Standard TLS threat model

---

### T7: CSRF on Session Creation

**Threat**: Attacker triggers verification on victim's behalf.

**Mitigation**:
- Origin header validation on `POST /sessions`
- Referer check as fallback
- Optional CSRF token for cookie-auth sites

**Residual Risk**: Low with proper checks

---

### T8: Denial of Service

**Threat**: Attacker floods session creation endpoint.

**Mitigation**:
- Per-IP rate limiting (10/min default)
- Session TTL limits memory growth
- Configurable rate limit thresholds

**Residual Risk**: Medium - sophisticated attacks may need CDN/WAF

---

### T9: Secret Leakage

**Threat**: Token signing secret exposed.

**Mitigation**:
- Secret from environment variable only
- Never in client bundle (verified at build)
- Key rotation via `kid` field
- Documented rotation procedure

**Residual Risk**: Operational - depends on deployment hygiene

---

### T10: Dependency Vulnerabilities

**Threat**: Vulnerable dependency compromises server.

**Mitigation**:
- `npm audit` in CI
- Dependabot enabled
- Minimal dependency surface
- License allowlist enforcement

**Residual Risk**: Medium - standard supply chain risk

---

## Security by Mode

| Control | Demo Mode | Production Mode |
|---------|-----------|-----------------|
| VP Verification | Simulated | Full crypto |
| Trust Lists | None | EU trust list |
| HTTPS Required | No | Yes |
| Rate Limiting | Yes | Yes |
| Token Security | Full | Full |
| Audit Logging | Basic | Full |
\`\`\`

### 2. Security Policy (`SECURITY.md`)

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### Disclosure Process

1. **Email**: security@eudi-verify.eu (or maintainer email)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

3. **Response Timeline**:
   - Initial response: 48 hours
   - Status update: 7 days
   - Fix timeline: Depends on severity

### Severity Classification

| Severity | Response Time | Examples |
|----------|--------------|----------|
| Critical | 24 hours | RCE, auth bypass, token forgery |
| High | 7 days | XSS, CSRF, significant data leak |
| Medium | 30 days | Rate limit bypass, minor info leak |
| Low | 90 days | Best practice violations |

### Safe Harbor

We consider security research conducted under this policy to be:
- Authorized under anti-hacking laws
- Exempt from DMCA restrictions
- Conducted in good faith

We will not pursue legal action against researchers who follow this policy.

### Acknowledgments

We maintain a list of security researchers who have responsibly disclosed vulnerabilities. Contact us if you'd like to be acknowledged.

## Security Updates

Security updates are released as patch versions. Subscribe to GitHub releases for notifications.
```

### 3. Dependency Documentation (`DEPENDENCY.md`)

```markdown
# Dependency Analysis

## Direct Dependencies

### Runtime Dependencies

| Package | License | Origin | Purpose | Security Critical |
|---------|---------|--------|---------|-------------------|
| @openeudi/core | Apache-2.0 | Luxembourg | VP verification | Yes |
| @openeudi/openid4vp | Apache-2.0 | Luxembourg | OpenID4VP protocol | Yes |

### Development Dependencies

| Package | License | Origin | Purpose |
|---------|---------|--------|---------|
| typescript | Apache-2.0 | Microsoft | Type checking |
| vitest | MIT | Community | Testing |
| tsup | MIT | Community | Bundling |

## License Allowlist

Only these licenses are permitted in runtime dependencies:
- Apache-2.0
- MIT
- BSD-2-Clause
- BSD-3-Clause
- ISC

Copyleft licenses (GPL, LGPL, AGPL) are excluded from runtime to ensure public-sector adoption compatibility.

## Security Audit Status

| Package | Last Audit | Auditor | Notes |
|---------|-----------|---------|-------|
| @openeudi/core | Pending | - | Third-party audit TBD |
| @eudi-verify/server | Pending | - | Third-party audit TBD |

## Transitive Dependencies

Run `pnpm ls --depth=10` for full dependency tree.

Critical transitive dependencies are reviewed for:
- Known vulnerabilities (npm audit)
- License compliance
- Maintenance status

## Update Policy

- Security patches: Immediate
- Minor updates: Weekly review
- Major updates: Case-by-case evaluation

## Supply Chain Security

- Lockfile committed (`pnpm-lock.yaml`)
- Dependabot enabled for security updates
- npm provenance planned for published packages
```

### 4. Demo Mode Warnings

Ensure visible in all contexts:

**Server Console**:
```
⚠️  WARNING: Running in DEMO MODE
    Demo credentials are simulated and NOT cryptographically verified.
    Do NOT use in production. Set NODE_ENV=production for production mode.
```

**API Response Header**:
```
X-Eudi-Mode: demo
```

**UI Banner** (in `<eudi-verify>`):
```html
<div class="eudi-demo-warning" role="alert">
  Simulated verification — credentials are fake. For local testing only.
</div>
```

## Acceptance Criteria

1. **`THREAT_MODEL.md` exists**: Covers all identified threats with mitigations
2. **`SECURITY.md` exists**: Clear disclosure policy with contact info
3. **`DEPENDENCY.md` exists**: All deps documented with licenses
4. **CI license gate enforced**: Build fails on unapproved licenses
5. **Demo warnings visible**: Console, header, and UI banner

## Files to Create

- `/THREAT_MODEL.md`
- `/SECURITY.md`
- `/DEPENDENCY.md`
- Update CI to enforce license allowlist

## Notes

- Plan for third-party security and accessibility audits before production release
- Keep threat model updated as features are added
