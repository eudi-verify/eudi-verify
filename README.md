# EUDI Wallet Verifier Kit

[![CI](https://github.com/eudi-verify/eudi-verify/actions/workflows/ci.yml/badge.svg)](https://github.com/eudi-verify/eudi-verify/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-green.svg)](openapi/eudi-verifier.yaml)
[![Status](https://img.shields.io/badge/status-demo%20mode-orange.svg)](#current-limitations)

Framework-agnostic verifier kit for the European Digital Identity Wallet.

`eudi-verify` provides a drop-in web component, typed client SDK, Node.js server handlers, and an OpenAPI specification for websites that want to experiment with EUDI Wallet-style verification flows.

**Live demo:** https://demo.eudi-verify.eu/

> **Status:** active development / demo mode. The wallet side is currently simulated because production EUDI Wallets are not yet generally available.

## What you can do today

- Run the local demo end-to-end with a simulated wallet.
- Embed `<eudi-verify>` in any HTML page or SPA.
- Use the typed client package for a custom UI.
- Use the Node.js server handlers with Express, Hono, or `node:http`.
- Implement the same verifier API in another backend using the OpenAPI spec.

## What this is not yet

- Not production identity verification.
- Not a certified EUDI Wallet implementation.
- Not a wallet app.
- Not a credential issuer.
- Not a replacement for legal, privacy, or compliance review.
- Not yet tested against production national EUDI Wallet apps.

## What is this?

Think of `eudi-verify` as a reCAPTCHA-style integration pattern for credential verification: a small embeddable widget starts a wallet verification flow and returns a server-verifiable token.

Example use cases include:

- proving that a user is over 18;
- verifying possession of a specific credential or entitlement;
- checking a scoped identity attribute without building the full verifier flow from scratch.

```html
<!-- Add age verification to any website -->
<eudi-verify api-url="/api/eudi" request='{"age_over_18": true}'></eudi-verify>

<script type="module">
  document
    .querySelector("eudi-verify")
    .addEventListener("verified", (event) => {
      // Send event.detail.token to your backend for validation.
    });
</script>
```

## Who is this for?

This project is for developers, product teams, and integrators who want to prepare for EUDI Wallet verification flows before production wallets are broadly available.

It is useful if you want to:

- prototype age verification or attribute verification flows;
- evaluate how EUDI Wallet verification could fit into an existing website;
- build against a stable verifier API before choosing a final backend stack;
- experiment with a framework-agnostic web component rather than a React-only integration;
- study the moving parts of a verifier implementation: session creation, QR generation, wallet callback handling, polling, token issuance, and backend token validation.

## Why this exists

The EUDI Wallet ecosystem is still emerging, but websites and service providers can already start preparing their integration architecture.

Most applications will not want to implement wallet protocols, QR/session handling, callback processing, polling, token validation, and frontend state management from scratch. This project provides a small, auditable verifier kit with clear boundaries:

- an OpenAPI verifier contract;
- a Node.js reference implementation;
- a typed client for custom frontends;
- a drop-in web component for simple integrations;
- a mock/demo engine for development before production wallets are available.

## Architecture

Three independent layers — use what you need:

| Layer  | Package               | Role                                          |
| ------ | --------------------- | --------------------------------------------- |
| API    | `@eudi-verify/server` | Verifier REST handlers for Node.js            |
| Widget | `@eudi-verify/embed`  | Drop-in `<eudi-verify>` web component         |
| Client | `@eudi-verify/client` | Typed client and state machine for custom UIs |

The OpenAPI spec is stack-independent. Any backend can implement the same endpoints. Only the Node.js handler library ships today.

- [Supported platforms and roadmap](docs/SUPPORTED.md)
- [ARF alignment notes](docs/ARF.md)

```txt
┌─────────────────────────────────────────────────────────┐
│  Your Website                                           │
│    └── <eudi-verify> widget  (@eudi-verify/embed)      │
│          └── API client      (@eudi-verify/client)     │
│                │                                        │
│                ▼ HTTP                                   │
│         ┌─────────────────────────────────────┐         │
│         │  Verifier API  (@eudi-verify/server)│         │
│         │    └── VerifierEngine interface     │         │
│         │          └── protocol engine        │         │
│         └─────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

## Trust boundaries

| Component                  |       Trusted? | Notes                                                                                 |
| -------------------------- | -------------: | ------------------------------------------------------------------------------------- |
| Website frontend           |             No | Can initiate verification, but cannot assert verified claims                          |
| `<eudi-verify>` widget     |             No | UI helper only                                                                        |
| Verifier API               |            Yes | Owns sessions, callbacks, token signing, expiry, replay protection, and rate limiting |
| Wallet / credential issuer | External trust | Validated through the relevant EUDI / OID4VP trust framework                          |
| Application backend        |            Yes | Must verify returned tokens server-side                                               |

The browser widget is not the source of truth. Verification tokens must be validated by your backend.

## Quick start from source

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
cd examples/html-vanilla
pnpm start
```

Open:

```txt
http://localhost:3000
```

The demo runs a single Node.js server that includes the full `@eudi-verify/server` implementation. Session management, token signing, and verification flow handling are real. Only the wallet side is simulated through a demo wallet page.

See [examples/html-vanilla/README.md](examples/html-vanilla/README.md) for testing instructions.

## Package installation

The packages are prepared for npm publishing.

After the first npm release, applications will be able to install the packages directly:

```bash
pnpm add @eudi-verify/embed @eudi-verify/client
```

For the Node.js verifier handlers:

```bash
pnpm add @eudi-verify/server
```

Until the first npm release is published, use the source-based quick start above.

## Packages

| Package               | Description                                          | Status                 |
| --------------------- | ---------------------------------------------------- | ---------------------- |
| `@eudi-verify/server` | REST API handlers, token verification, rate limiting | Demo mode, Node.js 22+ |
| `@eudi-verify/client` | Typed API client, state machine, QR generation       | Demo mode              |
| `@eudi-verify/embed`  | `<eudi-verify>` web component                        | Demo mode              |

See the [integration guide](docs/INTEGRATION.md) for end-to-end setup.

## Supported today

| Area         | What's included                                                              |
| ------------ | ---------------------------------------------------------------------------- |
| Backend      | Node.js 22+ with Express, Hono, or `node:http`                               |
| Frontend     | Plain HTML; React, Vue, Svelte, and other frameworks via web component embed |
| Demo         | `examples/html-vanilla`                                                      |
| API contract | OpenAPI 3.1 specification                                                    |

## Roadmap

Planned areas include:

- React wrapper;
- Vue example;
- WordPress plugin;
- PHP, Python, and Java integration guides;
- production wallet interoperability as national EUDI Wallets become available;
- production High Assurance Interoperability Profile support where applicable.

See [docs/PLAN.md](docs/PLAN.md) for the technical roadmap and [docs/SUPPORTED.md](docs/SUPPORTED.md) for the platform support matrix.

## Project goals

### Framework-agnostic frontend integration

Core packages have no React, Vue, or Lit dependency. The widget is a vanilla Custom Element that can be embedded in any HTML page or SPA today.

First-class React support is planned as `@eudi-verify/react`. Other framework examples are on the roadmap.

### Self-hostable verifier backend

The verifier is designed to be self-hosted and auditable. It does not depend on proprietary hosted identity platforms.

### OpenAPI-first integration contract

The verifier API is described with OpenAPI 3.1 so other backend implementations can follow the same contract.

### Engine abstraction

The `VerifierEngine` interface abstracts the underlying protocol implementation:

```ts
interface VerifierEngine {
  createSession(config): Promise<CreateSessionResult>;
  handleCallback(data, session): Promise<CallbackResult>;
  // ...
}
```

This allows protocol implementations to be swapped as the EUDI ecosystem matures.

Current engine support:

- `MockEngine` for local development and demo mode;
- production protocol engine support planned as compatible libraries and wallet implementations stabilize.

## Current limitations

This project is intentionally early.

| Component                        | Status                       | Notes                                                                                 |
| -------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| eIDAS 2.0 Regulation             | Passed                       | Regulation entered into force in 2024                                                 |
| Architecture Reference Framework | Published                    | See the official EUDI Wallet ARF documentation                                        |
| National wallet apps             | Pilots and sandboxes         | Availability varies by Member State                                                   |
| Certified wallets for citizens   | Not generally available yet  | Expected by the end of 2026 under the EUDI rollout timeline                           |
| Mandatory acceptance             | Not generally applicable yet | Obligations are expected to phase in after wallet availability and depend on use case |

For developers: build and test now using demo mode. Do not rely on this project for production identity verification until production wallet interoperability, certification requirements, and legal obligations are clear for your use case.

Useful official references:

- [European Digital Identity Wallet — European Commission](https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/694487738/EU+Digital+Identity+Wallet+Home)
- [European Digital Identity Regulation](https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation)
- [EUDI Wallet Architecture and Reference Framework](https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/2.8.0/architecture-and-reference-framework-main/)

## Security

See [SECURITY.md](SECURITY.md) and [THREAT_MODEL.md](THREAT_MODEL.md).

Important boundaries:

- The browser widget is not trusted.
- Verification tokens must be validated server-side.
- Demo mode accepts simulated wallet responses and must not be used in production.
- The verifier backend is responsible for session state, callback validation, token signing, expiry, replay protection, and rate limiting.
- Applications should treat verified claims as scoped, time-limited assertions, not permanent user identity.

## API documentation

See [openapi/eudi-verifier.yaml](openapi/eudi-verifier.yaml) for the full OpenAPI 3.1 specification.

Key endpoints:

| Endpoint              | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `POST /sessions`      | Create verification session and return wallet request / QR data |
| `GET /sessions/:id`   | Poll verification session status                                |
| `POST /tokens/verify` | Validate verification token server-side                         |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Type check
pnpm typecheck

# Lint OpenAPI spec
pnpm lint:api

# Run local CI checks
pnpm verify
```

## Contributing

Contributions are welcome.

Please read:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [docs/PLAN.md](docs/PLAN.md)
- [docs/SUPPORTED.md](docs/SUPPORTED.md)

Before claiming new platform support in documentation, please check the roadmap and existing support matrix.

## Support the project

This is independent open source software licensed under AGPL-3.0.

Ways to help:

- Try the demo and open issues for gaps.
- Contribute fixes, examples, tests, or documentation.
- Share feedback from real verifier integration scenarios.
- See [FUNDING.md](FUNDING.md) for sponsorship information.

## License

This project is available under two licenses:

1. **AGPL-3.0** — Free for open source use. See [LICENSE](LICENSE).
2. **Commercial License** — For use without AGPL obligations, open a [GitHub Discussion](https://github.com/eudi-verify/eudi-verify/discussions) with subject "Commercial license inquiry".

### Licensing for integrators

AGPL-3.0 is copyleft: if you **modify** this code and run it as a network service, you must share your modifications under the same license. It does **not** mean that using `eudi-verify` automatically makes your entire product open source.

| Integration pattern                                           | Typical AGPL impact                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Import and configure `@eudi-verify/server` via its public API | Your application code stays yours                                          |
| Embed `<eudi-verify>` widget and call your own backend        | Your application code stays yours                                          |
| Build a custom UI with `@eudi-verify/client`                  | Your application code stays yours                                          |
| Modify the verifier for commercial deployment                 | Contact us — AGPL compliance is complex, commercial license may be simpler |

**Not a trigger:** calling a hosted verifier API, or using verification tokens from your backend. AGPL applies to the **software you run**, not to being a client of someone else's service.

**When to contact us for a commercial license:** you need to modify the verifier and ship those changes in a closed-source product, or your organization's policy excludes AGPL dependencies.

This is not legal advice. If your use case is unclear, ask in [GitHub Discussions](https://github.com/eudi-verify/eudi-verify/discussions) or consult counsel.
