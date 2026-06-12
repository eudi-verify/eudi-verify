# @eudi-verify/server

Framework-agnostic EUDI Wallet verifier API handlers.

## Installation

```bash
pnpm add @eudi-verify/server
```

## Quick Start

```ts
import {
  createVerifierHandlers,
  OpenEudiEngine,
  MemoryKVStore,
} from '@eudi-verify/server';

// 1. Create engine and store
const engine = new OpenEudiEngine({ mode: 'demo' });
const store = new MemoryKVStore();

// 2. Create handlers
const handlers = createVerifierHandlers({
  engine,
  store,
  mode: 'demo',
  tokenSecret: process.env.VERIFICATION_SECRET!, // 32+ chars
});

// 3. Mount on your framework
// See framework examples below
```

## Framework Integration

### Node.js HTTP

```ts
import http from 'node:http';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const ctx = { ip: req.socket.remoteAddress ?? '127.0.0.1' };
  
  // Route to handlers
  if (url.pathname === '/sessions' && req.method === 'POST') {
    const body = await readBody(req);
    const result = await handlers.createSession(JSON.parse(body), ctx);
    sendJson(res, result.status, result.body, result.headers);
  }
  // ... other routes
});
```

### Express

```ts
import express from 'express';

const app = express();
app.use(express.json());

app.post('/sessions', async (req, res) => {
  const ctx = { ip: req.ip ?? '127.0.0.1' };
  const result = await handlers.createSession(req.body, ctx);
  res.status(result.status).set(result.headers).json(result.body);
});

app.get('/sessions/:id', async (req, res) => {
  const result = await handlers.getSession(req.params.id);
  res.status(result.status).set(result.headers).json(result.body);
});

app.post('/sessions/:id/cancel', async (req, res) => {
  const result = await handlers.cancelSession(req.params.id);
  res.status(result.status).set(result.headers).json(result.body);
});

app.post('/tokens/verify', async (req, res) => {
  const result = await handlers.verifyToken(req.body);
  res.status(result.status).json(result.body);
});
```

### Hono

```ts
import { Hono } from 'hono';

const app = new Hono();

app.post('/sessions', async (c) => {
  const ctx = { ip: c.req.header('x-forwarded-for') ?? '127.0.0.1' };
  const result = await handlers.createSession(await c.req.json(), ctx);
  return c.json(result.body, result.status, result.headers);
});

// ... other routes
```

## Configuration

```ts
interface VerifierConfig {
  engine: VerifierEngine;     // OpenEudiEngine or MockEngine
  store: IKVStore;            // MemoryKVStore (or Redis for production)
  mode: 'demo' | 'production';
  tokenSecret: string;        // HMAC secret, 32+ characters
  tokenTtlMs?: number;        // Default: 300000 (5 min)
  sessionTtlMs?: number;      // Default: 300000 (5 min)
  rateLimit?: {
    maxRequests: number;      // Default: 10
    windowMs: number;         // Default: 60000 (1 min)
  };
}
```

## Handlers

| Handler | Route | Description |
|---------|-------|-------------|
| `createSession(body, ctx)` | `POST /sessions` | Create verification session |
| `getSession(id)` | `GET /sessions/:id` | Get session status |
| `cancelSession(id)` | `POST /sessions/:id/cancel` | Cancel active session |
| `verifyToken(body)` | `POST /tokens/verify` | Validate verification token |
| `handleCallback(data)` | `POST /callback` | Wallet callback (internal) |

## Token Verification

After the widget emits a `verified` event with a token, validate it server-side:

```ts
// In your protected endpoint
app.post('/checkout', async (req, res) => {
  const { eudiToken } = req.body;
  
  const result = await handlers.verifyToken({ token: eudiToken });
  
  if (result.body.valid) {
    // Token is valid, claims are verified
    const { age_over_18, nationality } = result.body.claims;
    // Proceed with checkout...
  } else {
    // Token invalid, expired, or already used
    res.status(401).json({ error: result.body.error });
  }
});
```

## Demo Mode Warning

⚠️ Demo mode accepts simulated credentials. **Never use in production.**

Demo mode is indicated by:
- Console warning on startup
- `X-Eudi-Mode: demo` header on all responses

## API Reference

See [openapi/eudi-verifier.yaml](../../openapi/eudi-verifier.yaml) for the full OpenAPI 3.1 specification.

## License

Apache-2.0
