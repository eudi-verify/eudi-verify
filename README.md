# EUDI Wallet Verifier Kit

[![CI](https://github.com/eudi-verify/eudi-verify/actions/workflows/ci.yml/badge.svg)](https://github.com/eudi-verify/eudi-verify/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-green.svg)](openapi/eudi-verifier.yaml)
[![Status](https://img.shields.io/badge/status-preview-orange.svg)](#current-limitations)

Framework-agnostic verifier kit for the European Digital Identity Wallet.

`eudi-verify` provides a drop-in web component, typed client SDK, optional React wrapper, Node.js server handlers, and an OpenAPI specification — with reference examples for plain HTML, React, and Vue.

**Demo verification** builds on [`@openeudi/core`](https://github.com/openeudi/core) — `OpenEudiEngine` runs its `DemoMode` behind the swappable `VerifierEngine` interface. **Production OpenID4VP** uses `Openid4vpEngine` (`@openeudi/openid4vp`) for real wallet presentations (see [docs/SUPPORTED.md](docs/SUPPORTED.md)).

**Live demo:** https://demo.eudi-verify.eu/

> **Status:** preview release. Feature-complete for integration development. Not yet audited for production identity verification; production EUDI Wallets expected Dec 2026.

---

## What is this?

Think of `eudi-verify` as a reCAPTCHA-style integration pattern for credential verification: a small embeddable widget starts a wallet verification flow and returns a server-verifiable token.

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

Use cases include proving a user is over 18, verifying possession of a specific credential or entitlement, and checking a scoped identity attribute — without building the full verifier flow from scratch.

This project is for developers, product teams, and integrators who want to prepare for EUDI Wallet verification flows before production wallets are broadly available.

---

## Packages

| Package                            | Description                                          | Status                                         |
| ---------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| <nobr>`@eudi-verify/server`</nobr> | REST API handlers, token verification, rate limiting | Preview (demo + OpenID4VP engine), Node.js 22+ |
| <nobr>`@eudi-verify/embed`</nobr>  | Drop-in `<eudi-verify>` web component                | Preview                                        |
| <nobr>`@eudi-verify/client`</nobr> | Typed API client, state machine, QR generation       | Preview                                        |
| <nobr>`@eudi-verify/react`</nobr>  | React wrapper with typed props                       | Preview                                        |

See the [integration guide](docs/INTEGRATION.md) for end-to-end setup.

---

## Quick start

**Requirements:** Node.js 22+, [pnpm](https://pnpm.io/).

**1. Clone and build packages** — run from the **repository root** (`eudi-verify/`):

```bash
git clone https://github.com/eudi-verify/eudi-verify.git
cd eudi-verify
pnpm install && pnpm build
```

`pnpm build` compiles `packages/*`. Example apps under `examples/` only expose `start` or `dev` — there is no `build` script there.

**2. Terminal 1 — shared API server** (new terminal; `cd` to your clone root first):

```bash
cd examples/server && pnpm start
```

**3. Terminal 2 — HTML demo** (another new terminal; clone root):

```bash
cd examples/html-vanilla && pnpm start
```

Open `http://localhost:3001`. The shared API server runs the full `@eudi-verify/server` implementation. Frontend examples (html-vanilla, React, Vue) connect to the same backend. The wallet side is simulated through a demo wallet page.

See the [HTML](examples/html-vanilla/README.md), [React](examples/react/README.md), and [Vue](examples/vue/README.md) example guides for setup details.

---

## Architecture

Three independent layers — use what you need:

| Layer  | Package               | Role                                          |
| ------ | --------------------- | --------------------------------------------- |
| API    | `@eudi-verify/server` | Verifier REST handlers for Node.js            |
| Widget | `@eudi-verify/embed`  | Drop-in `<eudi-verify>` web component         |
| Client | `@eudi-verify/client` | Typed client and state machine for custom UIs |

React apps: `@eudi-verify/react` wraps `@eudi-verify/embed` with typed props and callbacks (see [Packages](#packages)).

Vue and similar frameworks: use `@eudi-verify/embed` directly — see [`examples/vue/`](examples/vue/) and [frontend integration](docs/integration-frontend.md#option-d-vue).

The OpenAPI spec is stack-independent — any backend can implement the same endpoints. Only the Node.js handler library ships today.

- [Supported platforms and roadmap](docs/SUPPORTED.md)
- [Integration architecture and request flows](docs/integration-architecture.md) (mermaid diagrams)
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

### Engine abstraction

The `VerifierEngine` interface abstracts the underlying protocol implementation, allowing engines to be swapped as the EUDI ecosystem matures:

```ts
interface VerifierEngine {
  createSession(config): Promise<CreateSessionResult>;
  handleCallback(data, session): Promise<CallbackResult>;
  // ...
}
```

Current: `OpenEudiEngine` wraps `@openeudi/core` `DemoMode` for simulated age and country checks. `Openid4vpEngine` wraps `@openeudi/openid4vp` for real OpenID4VP verification (AV age attestation / plain `direct_post`; see [docs/SUPPORTED.md](docs/SUPPORTED.md)). `MockEngine` remains available for deterministic tests.

---

## Trust boundaries

| Component                  |       Trusted? | Notes                                                                                 |
| -------------------------- | -------------: | ------------------------------------------------------------------------------------- |
| Website frontend           |             No | Can initiate verification, but cannot assert verified claims                          |
| `<eudi-verify>` widget     |             No | UI helper only                                                                        |
| Verifier API               |            Yes | Owns sessions, callbacks, token signing, expiry, replay protection, and rate limiting |
| Wallet / credential issuer | External trust | Validated through the relevant EUDI / OID4VP trust framework                          |
| Application backend        |            Yes | Must verify returned tokens server-side                                               |

The browser widget is not the source of truth. Verification tokens must be validated by your backend.

---

## API

Key endpoints:

| Endpoint              | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `POST /sessions`      | Create verification session and return wallet request / QR data |
| `GET /sessions/:id`   | Poll verification session status                                |
| `POST /tokens/verify` | Validate verification token server-side                         |

Full spec: [openapi/eudi-verifier.yaml](openapi/eudi-verifier.yaml)

---

## Current limitations

| Component                        | Status                       | Notes                                                          |
| -------------------------------- | ---------------------------- | -------------------------------------------------------------- |
| eIDAS 2.0 Regulation             | Passed                       | Regulation entered into force in 2024                          |
| Architecture Reference Framework | Published                    | See the official EUDI Wallet ARF documentation                 |
| National wallet apps             | Pilots and sandboxes         | Availability varies by Member State                            |
| Certified wallets for citizens   | Not generally available yet  | Expected by end of 2026 under the EUDI rollout timeline        |
| Mandatory acceptance             | Not generally applicable yet | Obligations are expected to phase in after wallet availability |

Build and test now in preview mode. Do not rely on this project for production identity verification until a security audit is complete and production wallet interoperability, certification requirements, and legal obligations are clear for your use case.

Official references:

- [European Digital Identity Wallet — European Commission](https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/694487738/EU+Digital+Identity+Wallet+Home)
- [European Digital Identity Regulation](https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation)
- [EUDI Wallet Architecture and Reference Framework](https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/2.8.0/architecture-and-reference-framework-main/)

---

## Roadmap

Planned areas include a WordPress plugin, PHP/Python/Java integration guides, and production wallet interoperability as national EUDI Wallets become available.

See [docs/PLAN.md](docs/PLAN.md) for the technical roadmap and [docs/SUPPORTED.md](docs/SUPPORTED.md) for the platform support matrix.

---

## Development

```bash
pnpm install       # Install dependencies
pnpm build         # Build all packages
pnpm test          # Run all tests
pnpm typecheck     # Type check
pnpm lint:api      # Lint OpenAPI spec
pnpm verify        # Run local CI checks
```

---

## Security

See [SECURITY.md](SECURITY.md) and [THREAT_MODEL.md](THREAT_MODEL.md).

Key boundaries: the browser widget is not trusted; verification tokens must be validated server-side; demo mode (`OpenEudiEngine` / `@openeudi/core` `DemoMode`) must not be used for production identity verification.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [docs/PLAN.md](docs/PLAN.md) before opening a PR.

Ways to help: try the demo and open issues, contribute fixes or examples, share feedback from real integration scenarios, improve documentation.

---

## License

Apache-2.0 — permissive, usable in open-source and proprietary projects alike. See [LICENSING.md](LICENSING.md) for details and notes on optional future commercial services.
