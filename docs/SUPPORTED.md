# Supported Platforms & Roadmap

**Canonical reference** for what works today vs what is planned. Update this file whenever support changes; keep [README.md](../README.md) in sync.

**Current release:** v1.1.1 — all four packages (`@eudi-verify/server`, `@eudi-verify/client`, `@eudi-verify/embed`, `@eudi-verify/react`) share a single version line. Stable integration API, demo verification engine only. See [Current Limitations](../README.md#current-limitations).

---

## Supported today

### Backend

| Stack                   | Status                   | How                                                                                                                  |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Node.js 22+**         | ✅ Supported             | `@eudi-verify/server` — mount handlers on Express, Hono, or raw `node:http`                                          |
| PHP, Python, Java, etc. | ❌ No server library yet | Use the [OpenAPI spec](../openapi/eudi-verifier.yaml) to implement the REST API, or proxy to a Node verifier service |

**Documented integration:** [INTEGRATION.md](./INTEGRATION.md) (Node/Express), [packages/server/README.md](../packages/server/README.md)

**Reference demo:** [examples/html-vanilla](../examples/html-vanilla/) (plain HTML + shared API server)

### Frontend

| Stack          | Status          | How                                                               |
| -------------- | --------------- | ----------------------------------------------------------------- |
| **Plain HTML** | ✅ Supported    | Import `@eudi-verify/embed`; use `<eudi-verify>`                  |
| **React**      | ✅ Supported    | `@eudi-verify/react` — React wrapper with typed props + callbacks |
| **Custom UI**  | ✅ Supported    | `@eudi-verify/client` (vanilla TS, zero framework deps)           |
| **WordPress**  | 🟡 Manual embed | Add script + element in theme/block; no plugin yet                |

**Documented integration:** [INTEGRATION.md](./INTEGRATION.md), [packages/embed/README.md](../packages/embed/README.md), [packages/react/README.md](../packages/react/README.md)

**Reference demo:** [examples/react](../examples/react/) (React + TypeScript + Vite)

### Packages (demo mode)

| Package               | Status                                                |
| --------------------- | ----------------------------------------------------- |
| `@eudi-verify/server` | ✅ Handlers, tokens, rate limiting                    |
| `@eudi-verify/client` | ✅ API client, state machine, QR                      |
| `@eudi-verify/embed`  | ✅ `<eudi-verify>` web component (WCAG 2.1 AA target) |
| `@eudi-verify/react`  | ✅ React wrapper with typed props                     |

### API contract

The [OpenAPI 3.1 spec](../openapi/eudi-verifier.yaml) is stack-independent. Any backend can implement the same endpoints; only the Node handler library is shipped today.

---

## Roadmap

Items below are **not shipped** or **not yet documented**. See [PLAN.md](./PLAN.md) for work-package detail.

### Adoption & docs (WP8)

- Step-by-step guides for PHP, Python, and Java backends
- `docs/PRODUCTION.md` — key management, hardening
- `docs/EU_REGISTRATION.md` — trust framework enrollment
- `docs/OPERATIONS.md` — monitoring, incident response

### Framework integrations

| Integration   | Status  | Deliverable                         |
| ------------- | ------- | ----------------------------------- |
| **Vue**       | Roadmap | Reference example                   |
| **WordPress** | Roadmap | Plugin                              |
| **Next.js**   | Roadmap | `@eudi-verify/next` (route helpers) |
| **Auth.js**   | Roadmap | Adapter                             |

Other optional packages: `@eudi-verify/hono` (pre-wired Hono mount; handlers work with Hono today).

Svelte, Angular, etc. can embed `<eudi-verify>` without a dedicated package (same as plain HTML).

### Production verification

- Production HAIP mode (depends on certified EU wallets — expected from **Dec 2026**)
- Redis-backed session store (interface exists; production guide TBD)

---

## Design vs shipped

**Framework-agnostic by design** means core packages avoid React/Vue/Lit lock-in and the API is specified in OpenAPI. It does **not** mean every listed language or CMS has a maintained integration guide or library today. When in doubt, check the tables above.
