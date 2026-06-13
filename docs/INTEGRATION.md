# Integration Guide

Add EU digital identity verification to your website in three steps.

> **Platform support:** This guide covers **Node.js + plain HTML** (the reference path). For PHP, Python, Java, WordPress, and framework bindings, see [SUPPORTED.md](./SUPPORTED.md).

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
} from '@eudi-verify/server';
import express from 'express';

const app = express();
app.use(express.json());

// Initialize
const handlers = createVerifierHandlers({
  engine: new OpenEudiEngine({ mode: 'demo' }),
  store: new MemoryKVStore(),
  mode: 'demo',
  tokenSecret: process.env.VERIFICATION_SECRET!, // 32+ chars, keep secret
});

// Mount routes
app.post('/api/eudi/sessions', async (req, res) => {
  const ctx = { ip: req.ip ?? '127.0.0.1' };
  const result = await handlers.createSession(req.body, ctx);
  res.status(result.status).set(result.headers).json(result.body);
});

app.get('/api/eudi/sessions/:id', async (req, res) => {
  const result = await handlers.getSession(req.params.id);
  res.status(result.status).set(result.headers).json(result.body);
});

app.post('/api/eudi/sessions/:id/cancel', async (req, res) => {
  const result = await handlers.cancelSession(req.params.id);
  res.status(result.status).set(result.headers).json(result.body);
});

app.post('/api/eudi/tokens/verify', async (req, res) => {
  const result = await handlers.verifyToken(req.body);
  res.status(result.status).json(result.body);
});

app.listen(3000);
```

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
    import '@eudi-verify/embed';
  </script>
</head>
<body>
  <h1>Age Verification Required</h1>
  
  <eudi-verify 
    api-url="/api/eudi" 
    request='{"age_over_18": true}'
  ></eudi-verify>

  <script>
    document.querySelector('eudi-verify')
      .addEventListener('verified', async (e) => {
        // Token received — send to your backend
        const response = await fetch('/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eudiToken: e.detail.token }),
        });
        
        if (response.ok) {
          window.location.href = '/success';
        }
      });
      
    document.querySelector('eudi-verify')
      .addEventListener('rejected', () => {
        alert('Verification was declined');
      });
  </script>
</body>
</html>
```

### Widget Attributes

| Attribute | Description |
|-----------|-------------|
| `api-url` | Base URL of your verifier API |
| `request` | JSON string of requested claims |
| `auto-start` | (Optional) Start verification automatically on page load |

### Widget Events

| Event | Detail | Description |
|-------|--------|-------------|
| `verified` | `{ token, claims }` | User approved, token ready |
| `rejected` | `{ error? }` | User declined in wallet |
| `expired` | `{}` | Session timed out |
| `error` | `{ error }` | Something went wrong |
| `state-change` | `{ state }` | Any state change (for custom handling) |

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
import { createVerification } from '@eudi-verify/client';

const verification = createVerification({
  apiUrl: '/api/eudi',
});

verification.subscribe((state) => {
  // Update your UI based on state
  switch (state.status) {
    case 'showQR':
      qrImage.src = state.qrDataUrl;
      qrContainer.style.display = 'block';
      break;
    case 'waitingForWallet':
      statusText.textContent = 'Approve in your wallet...';
      break;
    case 'verified':
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

## Step 3: Token Verification

**Critical:** Always verify tokens server-side. Never trust the client.

```ts
// In your protected endpoint
app.post('/checkout', async (req, res) => {
  const { eudiToken } = req.body;
  
  // Verify with your handlers
  const result = await handlers.verifyToken({ token: eudiToken });
  
  if (!result.body.valid) {
    return res.status(401).json({ 
      error: 'verification_failed',
      reason: result.body.error, // 'expired', 'already_consumed', etc.
    });
  }
  
  // Token valid — user's claims are verified
  const { age_over_18, nationality } = result.body.claims;
  
  if (!age_over_18) {
    return res.status(403).json({ error: 'age_restricted' });
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
- [Deployment guide](./deploy-eu.md) (coming in WP5)
