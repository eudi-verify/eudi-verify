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

| Layer | Package | Role |
|-------|---------|------|
| **API** | `@eudi-verify/server` | Verifier REST handlers (Node.js 22+ today) |
| **Widget** | `@eudi-verify/embed` | Drop-in `<eudi-verify>` web component |
| **Client** | `@eudi-verify/client` | Typed client + state machine for custom UIs |

The [OpenAPI spec](openapi/eudi-verifier.yaml) is stack-independent — any backend can implement the same endpoints. Only the Node handler library ships today.

📋 **[Supported platforms & roadmap](docs/SUPPORTED.md)** — what works now vs planned (PHP, Python, WordPress, React bindings, etc.)

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

# Build packages
pnpm build

# Run tests
pnpm test

# Start demo server
cd examples/html-vanilla && pnpm start
# Open http://localhost:3000
```

The demo runs a **single Node.js server** that includes the full `@eudi-verify/server` implementation — session management, token signing, and verification are all real. Only the wallet side is simulated (via a "demo wallet" page) since no production EUDI Wallets exist yet. See [examples/html-vanilla/README.md](examples/html-vanilla/README.md) for testing instructions.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@eudi-verify/server` | REST API handlers, token verification, rate limiting | ✅ Demo mode (Node 22+) |
| `@eudi-verify/client` | Typed API client, state machine, QR generation | ✅ Demo mode |
| `@eudi-verify/embed` | `<eudi-verify>` web component | ✅ Demo mode |

📖 **[Integration Guide](docs/INTEGRATION.md)** — end-to-end setup (Node + HTML)

### Supported today

| Area | What's included |
|------|-----------------|
| **Backend** | Node.js 22+ with Express, Hono, or `node:http` |
| **Frontend** | Plain HTML; React/Vue/Svelte/etc. via web component embed (wrappers on roadmap) |
| **Demo** | [examples/html-vanilla](examples/html-vanilla/) |

### On the roadmap

React wrapper (first), Vue example, WordPress plugin, PHP/Python/Java guides, production HAIP — **[WP9](.github/internal/wp/WP9.md)** for React; full matrix in **[docs/SUPPORTED.md](docs/SUPPORTED.md)**.

## Design Principles

### Framework Agnostic

Core packages have no React, Vue, or Lit dependency. The widget is a vanilla [Custom Element](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements) you can embed in any HTML page or SPA today. First-class React support is **[WP9](.github/internal/wp/WP9.md)** (`@eudi-verify/react`); other frameworks on the [roadmap](docs/SUPPORTED.md#framework-integrations).

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

⚠️ **Demo mode only.** No production EUDI Wallets are available yet. All 27 EU Member States must offer certified wallets by **December 24, 2026**.

| Component | Status | Timeline |
|-----------|--------|----------|
| eIDAS 2.0 Regulation | ✅ Passed | May 2024 |
| Architecture Reference Framework | ✅ Published | v2.8 (2026) |
| National Wallet Apps | 🟡 Pilots/sandboxes | Denmark, Ireland have public access |
| **Certified Wallets for Citizens** | 🔴 Not yet | **Due Dec 2026** |
| Mandatory Business Acceptance | 🔴 Not yet | Due Dec 2027 |

**For developers:** Build and test now using demo mode. See [Testing Without a Wallet](examples/html-vanilla/README.md#testing-without-a-wallet) for manual testing instructions.

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

See [docs/PLAN.md](docs/PLAN.md) for the technical roadmap and [docs/SUPPORTED.md](docs/SUPPORTED.md) for the platform support matrix.

## Support the project

Independent open source (Apache-2.0). See **[FUNDING.md](FUNDING.md)** to contribute or sponsor.

- **Use it** — try the [html-vanilla demo](examples/html-vanilla/) and open issues for gaps
- **Contribute** — PRs welcome; see [Contributing](#contributing) and `docs/SUPPORTED.md` before claiming new platform support in docs
- **Sponsor** — via [FUNDING.md](FUNDING.md) (GitHub Sponsors / Open Collective coming soon)

## License

Apache-2.0 — see [LICENSE](LICENSE).

## Contributing

Contributions welcome. Please read the roadmap first to understand the architecture decisions.
