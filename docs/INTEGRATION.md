# Integration Guide

Add EU digital identity verification to your website in three steps.

> **Platform support:** This guide covers **Node.js + plain HTML** (the reference path). For **PHP**, see [PHP backend integration](./php.md). For Python, Java, WordPress, and other framework bindings, see [SUPPORTED.md](./SUPPORTED.md).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Your Website                                               │
│                                                             │
│    ┌──────────────────────┐                                │
│    │  <eudi-verify>       │  ← Widget (or custom UI)       │
│    │  @eudi-verify/embed  │                                │
│    └──────────┬───────────┘                                │
│               │ uses                                        │
│    ┌──────────▼───────────┐                                │
│    │  @eudi-verify/client │  ← State machine, QR, polling  │
│    └──────────┬───────────┘                                │
│               │ HTTP                                        │
├───────────────┼─────────────────────────────────────────────┤
│  Your Backend │                                             │
│    ┌──────────▼───────────┐                                │
│    │  @eudi-verify/server │  ← API handlers                │
│    └──────────┬───────────┘                                │
│               │                                             │
│    ┌──────────▼───────────┐                                │
│    │  @openeudi/core      │  ← EUDI protocol               │
│    └──────────────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Server Setup

Install and mount the API handlers on your backend.

```bash
pnpm add @eudi-verify/server
```

```ts
// server.ts
import {
  createVerifierHandlers,
  OpenEudiEngine,
  MemoryKVStore,
} from "@eudi-verify/server";
import express from "express";

const app = express();
app.use(express.json());

// Initialize
const BASE_URL = process.env.BASE_URL || "http://localhost:3000/api/eudi";

const handlers = createVerifierHandlers({
  engine: new OpenEudiEngine({ mode: "demo", baseUrl: BASE_URL }),
  store: new MemoryKVStore(),
  baseUrl: BASE_URL,
  mode: "demo",
  tokenSecret: process.env.TOKEN_SECRET!, // 32+ chars, keep secret
});

// Helper to build request context
function buildContext(req, params = {}, body = undefined) {
  return {
    ip: req.ip ?? "127.0.0.1",
    origin: req.headers.origin,
    params,
    body,
  };
}

// Mount routes
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

// Callback endpoint (required for wallet integration)
app.post("/api/eudi/callback", async (req, res) => {
  const result = await handlers.handleCallback(buildContext(req));
  res.status(result.status).json(result.body);
});

// Authorization request endpoint (optional, for PAR flow)
app.get("/api/eudi/request/:id", async (req, res) => {
  const result = await handlers.getRequest(
    buildContext(req, { requestId: req.params.id }),
  );
  res.status(result.status).json(result.body);
});

app.listen(3000);
```

### Running the repo examples

All frontend examples use a shared backend server ([`examples/server/`](../examples/server/)). Start the API server first, then run your chosen frontend in a second terminal:

```bash
# Terminal 1 — API (port 3000)
cd examples/server && pnpm start

# Terminal 2 — html-vanilla (port 3001) or React (port 3001)
cd examples/html-vanilla && pnpm start
# or
cd examples/react && pnpm dev
```

This mirrors production: one backend, any frontend.

## Step 2: Frontend — Option A: Widget

The simplest integration. Drop in the `<eudi-verify>` element.

```bash
pnpm add @eudi-verify/embed
```

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module">
      import "@eudi-verify/embed";
    </script>
  </head>
  <body>
    <h1>Age Verification Required</h1>

    <eudi-verify
      api-url="/api/eudi"
      request='{"age_over_18": true}'
    ></eudi-verify>

    <script>
      document
        .querySelector("eudi-verify")
        .addEventListener("verified", async (e) => {
          // Token received — send to your backend
          const response = await fetch("/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eudiToken: e.detail.token }),
          });

          if (response.ok) {
            window.location.href = "/success";
          }
        });

      document.querySelector("eudi-verify").addEventListener("rejected", () => {
        alert("Verification was declined");
      });
    </script>
  </body>
</html>
```

### Widget Attributes

| Attribute    | Description                                              |
| ------------ | -------------------------------------------------------- |
| `api-url`    | Base URL of your verifier API                            |
| `request`    | JSON string of requested claims                          |
| `auto-start` | (Optional) Start verification automatically on page load |

### Widget Events

| Event          | Detail              | Description                            |
| -------------- | ------------------- | -------------------------------------- |
| `verified`     | `{ token, claims }` | User approved, token ready             |
| `rejected`     | `{ error? }`        | User declined in wallet                |
| `expired`      | `{}`                | Session timed out                      |
| `error`        | `{ error }`         | Something went wrong                   |
| `state-change` | `{ state }`         | Any state change (for custom handling) |

### Theming

Style via CSS custom properties:

```css
eudi-verify {
  --eudi-primary: #0052b4;
  --eudi-text: #1a1a1a;
  --eudi-background: #ffffff;
  --eudi-border-radius: 8px;
  --eudi-font-family: system-ui, sans-serif;
  --eudi-error: #d32f2f;
}
```

## Step 2: Frontend — Option B: Custom UI

Build your own UI with the client library.

```bash
pnpm add @eudi-verify/client
```

```ts
import { createVerification } from "@eudi-verify/client";

const verification = createVerification({
  apiUrl: "/api/eudi",
});

verification.subscribe((state) => {
  // Update your UI based on state
  switch (state.status) {
    case "showQR":
      qrImage.src = state.qrDataUrl;
      qrContainer.style.display = "block";
      break;
    case "waitingForWallet":
      statusText.textContent = "Approve in your wallet...";
      break;
    case "verified":
      submitToken(state.token);
      break;
    // Handle other states...
  }
});

// Start when user clicks
verifyButton.onclick = () => {
  verification.start({ age_over_18: true });
};
```

## Step 2: Frontend — Option C: React

Use the React wrapper for idiomatic React integration.

**Requirements:** React 18+

React does not wire `on*` props to custom element events, so `onVerified` on raw `<eudi-verify>` will not fire. The wrapper attaches `verified`, `rejected`, and related DOM listeners internally. To use the embed without the wrapper, use `ref` + `addEventListener` (Option B above).

```bash
pnpm add @eudi-verify/react
```

```tsx
import { EudiVerify } from "@eudi-verify/react";

function AgeGate() {
  const handleVerified = async ({ token, claims }) => {
    // Send token to your backend
    const response = await fetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eudiToken: token }),
    });

    if (response.ok) {
      window.location.href = "/success";
    }
  };

  return (
    <div>
      <h1>Age Verification Required</h1>

      <EudiVerify
        apiUrl="/api/eudi"
        request={{ age_over_18: true }}
        onVerified={handleVerified}
        onRejected={() => alert("Verification declined")}
        onError={({ error }) => console.error(error)}
      />
    </div>
  );
}
```

### React Props

| Prop         | Type                            | Description                       |
| ------------ | ------------------------------- | --------------------------------- |
| `apiUrl`     | `string`                        | Base URL of your verifier API     |
| `request`    | `VerificationRequest \| string` | Claims to request                 |
| `onVerified` | `(detail) => void`              | Called when verification succeeds |
| `onRejected` | `(detail) => void`              | Called when user declines         |
| `onExpired`  | `() => void`                    | Called when session expires       |
| `onError`    | `(detail) => void`              | Called on errors                  |

### Imperative Control

```tsx
import { useRef } from "react";
import { EudiVerify, type EudiVerifyRef } from "@eudi-verify/react";

function App() {
  const ref = useRef<EudiVerifyRef>(null);

  return (
    <>
      <EudiVerify
        ref={ref}
        apiUrl="/api/eudi"
        request={{ age_over_18: true }}
      />
      <button onClick={() => ref.current?.start()}>Start Verification</button>
      <button onClick={() => ref.current?.cancel()}>Cancel</button>
    </>
  );
}
```

### Next.js Usage

For Next.js App Router, use the `'use client'` directive:

```tsx
"use client";

import { EudiVerify } from "@eudi-verify/react";

export default function VerificationPage() {
  return <EudiVerify apiUrl="/api/eudi" request={{ age_over_18: true }} />;
}
```

See [packages/react/README.md](../packages/react/README.md) for full documentation and the [React example](../examples/react/) for a complete working app. Start the shared API server from [`examples/server/`](../examples/server/) before running any frontend example.

## Error Boundaries

Errors are handled differently at each layer. There is no global error hook — integrators observe outcomes at **their adapter boundary** (route wrapper, `subscribe` callback, or DOM events).

### Three channels on the server

| Channel                | When                                                         | How to detect                                                                        |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **HTTP error**         | Bad input, rate limit, origin denied, engine crash on create | `result.status >= 400` and `result.body.error`                                       |
| **Session outcome**    | User declined, VP invalid, session timed out                 | `result.body.status` on `getSession` — values include `rejected`, `expired`, `error` |
| **Token soft failure** | Token invalid, expired, or already used at checkout          | `verifyToken` returns HTTP 200 with `{ valid: false, error: '...' }`                 |

Handlers **return** `HandlerResponse` objects; they do not throw. Your route adapter is the error boundary:

```ts
async function sendHandlerResult(res, result) {
  if (result.status >= 400 && "error" in result.body) {
    // HTTP-level failure — log/report here (429, 500, etc.)
    reportError({ httpStatus: result.status, code: result.body.error });
  }
  res.status(result.status).set(result.headers).json(result.body);
}
```

### Wallet callback vs your frontend

`POST /callback` is called by the **EUDI Wallet**, not your page. HTTP status on that endpoint means “payload received,” not “user verified”:

| Callback result                                   | HTTP to wallet             | Where the outcome lives                   |
| ------------------------------------------------- | -------------------------- | ----------------------------------------- |
| Malformed body, unknown session                   | **400** + `ApiError`       | Wallet may show delivery failure          |
| VP processed (success, declined, or crypto error) | **200** `{ status: 'ok' }` | Session record — poll `GET /sessions/:id` |

Your widget or client learns verification outcomes by **polling session status**, not from the callback response.

### Frontend boundaries

| Integration                           | Boundary                   | User declined                                  | System/network failure                                 |
| ------------------------------------- | -------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| **Widget** (`@eudi-verify/embed`)     | DOM events                 | `rejected`                                     | `error`                                                |
| **Custom UI** (`@eudi-verify/client`) | `verification.subscribe()` | `state.status === 'rejected'`                  | `state.status === 'error'`                             |
| **Direct API** (`createApiClient`)    | `try/catch`                | Session `status: 'rejected'` from `getSession` | Typed throws: `NetworkError`, `ApiResponseError`, etc. |

`createVerification` does **not** throw on flow failures — it transitions to `{ status: 'error', error: string }`. Use `createApiClient` directly if you need typed HTTP error codes (e.g. rate-limit retry).

### Hooking error reporting (Sentry, Datadog, etc.)

```ts
// Server — wrap handler calls
const result = await handlers.getSession(ctx);
if (result.status === 200 && result.body.status === "error") {
  reportError({ sessionId: result.body.id, error: result.body.error });
}

// Client — subscribe
verification.subscribe((state) => {
  if (state.status === "error") reportError({ message: state.error });
});

// Widget — events
widget.addEventListener("error", (e) => reportError({ error: e.detail.error }));
widget.addEventListener("rejected", (e) =>
  reportEvent({ type: "rejected", detail: e.detail }),
);
```

See package READMEs for per-layer detail: [server](../packages/server/README.md#error-boundaries), [client](../packages/client/README.md#error-boundaries), [embed](../packages/embed/README.md#error-boundaries).

## Step 3: Token Verification

**Critical:** Always verify tokens server-side. Never trust the client.

```ts
// In your protected endpoint
app.post("/checkout", async (req, res) => {
  const { eudiToken } = req.body;

  // Verify with your handlers
  const result = await handlers.verifyToken({ token: eudiToken });

  if (!result.body.valid) {
    return res.status(401).json({
      error: "verification_failed",
      reason: result.body.error, // 'expired', 'already_consumed', etc.
    });
  }

  // Token valid — user's claims are verified
  const { age_over_18, nationality } = result.body.claims;

  if (!age_over_18) {
    return res.status(403).json({ error: "age_restricted" });
  }

  // Proceed with checkout...
});
```

### Token Properties

- **Single-use** — consumed on first successful verify
- **Short-lived** — 5 minute TTL
- **HMAC-signed** — tamper-proof, tied to your secret
- **Session-bound** — can't be replayed from other sessions

## Flow Diagram

```
User clicks "Verify Age"
        │
        ▼
┌───────────────────┐
│ POST /sessions    │ → Creates session, returns QR URL
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Display QR Code   │ → User scans with EUDI Wallet
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Poll GET /sessions│ → Status: pending → waiting → verified
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Receive token     │ → Client gets verification token
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ POST /tokens/     │ → Your backend validates token
│ verify            │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Access granted    │ → User proceeds with verified claims
└───────────────────┘
```

## Demo Mode

⚠️ Currently only demo mode is available. The EU digital identity infrastructure is still being deployed.

In demo mode:

- Credentials are simulated (not real identity verification)
- Console warnings are logged
- `X-Eudi-Mode: demo` header on all responses

**Never use demo mode in production.**

## Next Steps

- [Server package documentation](../packages/server/README.md)
- [Client package documentation](../packages/client/README.md)
- [OpenAPI specification](../openapi/eudi-verifier.yaml)
- [Deployment guide](./deploy-eu.md)
