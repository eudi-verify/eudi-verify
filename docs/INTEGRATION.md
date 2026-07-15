# Integration Guide

Add EU digital identity verification to your website.

> **Platform support:** Node.js backend with plain HTML, React, or Vue frontends today. PHP and other stacks: use a [Node sidecar](./integration-architecture.md#production-flow-php-proxy--node-sidecar) or implement the [OpenAPI spec](../openapi/eudi-verifier.yaml). See [SUPPORTED.md](./SUPPORTED.md) for the full matrix.

---

## Documentation map

| Guide                                                 | What it covers                                               |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| **This page**                                         | Quick start — server mount, token verification, demo mode    |
| [Architecture & flows](./integration-architecture.md) | Layer diagram, sequence flows, PHP proxy, trust boundaries   |
| [Frontend options](./integration-frontend.md)         | Widget, custom UI, React, Vue                                |
| [Error handling](./integration-errors.md)             | HTTP vs session vs token failures; wallet callback semantics |
| [Deploy (EU)](./deploy-eu.md)                         | Production hosting, CDN, `BASE_URL`                          |
| [OpenAPI spec](../openapi/eudi-verifier.yaml)         | Stack-independent API contract                               |

Package references: [server](../packages/server/README.md) · [client](../packages/client/README.md) · [embed](../packages/embed/README.md) · [react](../packages/react/README.md)

---

## Quick start

1. **Server** — mount `@eudi-verify/server` handlers (below)
2. **Frontend** — add the [widget](./integration-frontend.md#option-a-widget-simplest) or [React/Vue/custom UI](./integration-frontend.md)
3. **Checkout** — [verify tokens server-side](#token-verification) on protected routes

---

## Server setup

```bash
pnpm add @eudi-verify/server
```

```ts
import {
  createVerifierHandlers,
  OpenEudiEngine,
  MemoryKVStore,
} from "@eudi-verify/server";
import express from "express";

const app = express();
app.use(express.json());

const BASE_URL = process.env.BASE_URL || "http://localhost:3000/api/eudi";

const handlers = createVerifierHandlers({
  engine: new OpenEudiEngine({ mode: "demo", baseUrl: BASE_URL }),
  store: new MemoryKVStore(),
  baseUrl: BASE_URL,
  mode: "demo",
  tokenSecret: process.env.TOKEN_SECRET!, // 32+ chars, keep secret
});

function buildContext(req, params = {}, body = undefined) {
  return {
    ip: req.ip ?? "127.0.0.1",
    origin: req.headers.origin,
    params,
    body,
  };
}

app.post("/api/eudi/sessions", async (req, res) => {
  const result = await handlers.createSession(buildContext(req, {}, req.body));
  res.status(result.status).set(result.headers).json(result.body);
});

app.get("/api/eudi/sessions/:id", async (req, res) => {
  const result = await handlers.getSession(
    buildContext(req, { sessionId: req.params.id }),
  );
  res.status(result.status).set(result.headers).json(result.body);
});

app.post("/api/eudi/sessions/:id/cancel", async (req, res) => {
  const result = await handlers.cancelSession(
    buildContext(req, { sessionId: req.params.id }),
  );
  res.status(result.status).set(result.headers).json(result.body);
});

app.post("/api/eudi/tokens/verify", async (req, res) => {
  const result = await handlers.verifyToken(buildContext(req, {}, req.body));
  res.status(result.status).json(result.body);
});

// Wallet callback — forward raw form body (see integration-architecture.md)
app.post("/api/eudi/callback", async (req, res) => {
  const result = await handlers.handleCallback(buildContext(req));
  res.status(result.status).json(result.body);
});

// PAR authorization request (production)
app.get("/api/eudi/request/:id", async (req, res) => {
  const result = await handlers.getRequest(
    buildContext(req, { requestId: req.params.id }),
  );
  res.status(result.status).json(result.body);
});

app.listen(3000);
```

Express shown; Hono and raw `node:http` patterns are in [packages/server/README.md](../packages/server/README.md).

### Running the repo examples

Build once from the repository root, then start API + frontend in separate terminals:

```bash
pnpm install && pnpm build
cd examples/server && pnpm start          # API :3000
cd examples/html-vanilla && pnpm start    # or examples/react, examples/vue :3001
```

See [examples/html-vanilla](../examples/html-vanilla/), [examples/react](../examples/react/), [examples/vue](../examples/vue/).

---

## Token verification

**Critical:** Always verify tokens server-side. Never trust the client.

```ts
app.post("/checkout", async (req, res) => {
  const { eudiToken } = req.body;
  const result = await handlers.verifyToken({ token: eudiToken });

  if (!result.body.valid) {
    return res.status(401).json({
      error: "verification_failed",
      reason: result.body.error,
    });
  }

  const { age_over_18, nationality } = result.body.claims;

  if (!age_over_18) {
    return res.status(403).json({ error: "age_restricted" });
  }

  // Proceed with checkout...
});
```

**Token properties:** single-use · 5-minute TTL · HMAC-signed · session-bound

---

## Demo mode

⚠️ Only demo mode is available today. EU wallet infrastructure is still rolling out.

- Credentials simulated via `@openeudi/core` `DemoMode`
- Returned claims: **age over 18** and **country/nationality** only
- `X-Eudi-Mode: demo` header on all responses

**Never use demo mode in production.** See [demo flow diagram](./integration-architecture.md#demo-mode-flow-today).

---

## Next steps

- [Architecture & request flows](./integration-architecture.md)
- [Frontend integration](./integration-frontend.md)
- [Error handling](./integration-errors.md)
- [Deployment guide](./deploy-eu.md)
- [CDN / reverse proxy](./deploy-cdn-examples.md)
