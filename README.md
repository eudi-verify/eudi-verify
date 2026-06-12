# EUDI Wallet Verifier Kit

Framework-agnostic open-source verifier kit for the [EU Digital Identity Wallet](https://ec.europa.eu/digital-building-blocks/sites/display/EUDIGITALIDENTITYWALLET).

**Status:** Active development (demo mode)

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

## What is this?

A drop-in verification widget for websites that need to verify EU digital identity claims — like reCAPTCHA, but for proving "I'm over 18" or "I'm an EU citizen" using the upcoming EUDI Wallet.

```html
<!-- Add age verification to any website -->
<eudi-verify 
  api-url="/api/eudi" 
  request='{"age_over_18": true}'
></eudi-verify>

<script type="module">
  document.querySelector('eudi-verify')
    .addEventListener('verified', (e) => {
      // Send e.detail.token to your backend for validation
    });
</script>
```

## Architecture

Three independent layers — use what you need:

| Layer | Package | Use Case |
|-------|---------|----------|
| **API** | `@eudi-verify/server` | Any backend (Node, PHP, Python, Java) |
| **Widget** | `@eudi-verify/embed` | Any frontend (plain HTML, Vue, WordPress) |
| **Client** | `@eudi-verify/client` | Build custom UIs with the typed API client |

```
┌─────────────────────────────────────────────────────────┐
│  Your Website                                           │
│    └── <eudi-verify> widget  (@eudi-verify/embed)      │
│          └── API client      (@eudi-verify/client)     │
│                │                                        │
│                ▼ HTTP                                   │
│         ┌─────────────────────────────────────┐        │
│         │  Verifier API  (@eudi-verify/server)│        │
│         │    └── VerifierEngine interface     │        │
│         │          └── @openeudi/core         │        │
│         └─────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/eudi-verify/eudi-verify.git
cd eudi-verify
pnpm install

# Run tests
pnpm test

# Start demo server (coming in WP5)
# pnpm demo
```

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@eudi-verify/server` | REST API handlers, token verification, rate limiting | ✅ WP2 complete |
| `@eudi-verify/client` | Typed API client, state machine, QR generation | 🔜 WP3 |
| `@eudi-verify/embed` | `<eudi-verify>` web component | 🔜 WP4 |

## Design Principles

### Framework Agnostic

No React, Vue, or framework lock-in in the core packages. The widget is a vanilla [Custom Element](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements) that works in any HTML page. Optional framework bindings (React, Next.js) are separate packages.

### EU Sovereignty

Built for EU compliance requirements:
- No US proprietary identity services (Auth0, Clerk, etc.)
- Self-hostable on EU infrastructure (Hetzner, OVH, self-hosted)
- Apache-2.0 licensed, auditable open source
- Built on EU-based `@openeudi/core` library

### Engine Abstraction

The `VerifierEngine` interface abstracts the underlying EUDI protocol implementation:

```typescript
interface VerifierEngine {
  createSession(config): Promise<CreateSessionResult>;
  handleCallback(data, session): Promise<CallbackResult>;
  // ...
}
```

This allows swapping implementations:
- **Primary:** `@openeudi/core` (Luxembourg-based, Apache-2.0)
- **Fallback:** Sphereon OID4VC (if needed)
- **Testing:** `MockEngine` (included)

## Current Limitations

⚠️ **Demo mode only.** The EU reference wallet and trust infrastructure are still in development. This project provides demo mode for integration testing, with production mode ready when EU infrastructure launches (expected 2026).

| Component | Status |
|-----------|--------|
| EUDI Wallet apps | National pilots only |
| EU Trust List | Not yet live |
| Real credential issuance | Not available |
| Production crypto verification | Blocked on above |

## Security

See [SECURITY.md](SECURITY.md) for:
- Security model and threat considerations
- Responsible disclosure policy
- Demo mode warnings

**Do not use demo mode in production.** Demo mode accepts simulated credentials and provides no real identity verification.

## API Documentation

See [openapi/eudi-verifier.yaml](openapi/eudi-verifier.yaml) for the full OpenAPI 3.1 specification.

Key endpoints:
- `POST /sessions` — Create verification session (returns QR URL)
- `GET /sessions/:id` — Poll session status
- `POST /tokens/verify` — Validate verification token (server-side)

## Development

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Type check
pnpm typecheck

# Lint OpenAPI spec
pnpm lint:api
```

## Roadmap

See [docs/PLAN.md](docs/PLAN.md) for the detailed technical roadmap.

## License

Apache-2.0 — see [LICENSE](LICENSE).

## Contributing

Contributions welcome. Please read the roadmap first to understand the architecture decisions.
