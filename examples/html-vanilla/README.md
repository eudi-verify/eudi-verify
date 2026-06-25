# HTML/Vanilla JS Example

Uses the `<eudi-verify>` web component with no framework.

**Live demo:** [https://demo.eudi-verify.eu/](https://demo.eudi-verify.eu/)

## Quick Start

**Terminal 1 — Start API server:**

```bash
cd ../server
pnpm start
```

**Terminal 2 — Start static server:**

```bash
pnpm start
```

Open http://localhost:3001

## What This Demonstrates

1. **Widget Integration** — Drop-in `<eudi-verify>` custom element
2. **Server-Side Verification** — Token validation via `/tokens/verify`
3. **Captcha Pattern** — Checkout gated on verified identity
4. **Shared Backend** — Same API server as the React example

## Architecture

Local development uses **two processes** — the same pattern as production (API and frontend separate):

```
Terminal 1 — examples/server/     http://localhost:3000/api/*
Terminal 2 — examples/html-vanilla/  http://localhost:3001 (static + /api proxy)
```

```
┌─────────────────────────┐     ┌──────────────────────────────┐
│  API server (:3000)     │     │  Static server (:3001)       │
│  /api/eudi/*            │◄────│  /api/* proxied              │
│  /api/checkout          │     │  /verify, /demo-wallet, …    │
│  /api/demo/*            │     │  /eudi-verify.js             │
└─────────────────────────┘     └──────────────────────────────┘
```

**What's real:** The API server uses actual `@eudi-verify/server` handlers — session lifecycle, HMAC token minting, single-use token verification, and rate limiting all work exactly as they would in production.

**What's simulated:** The wallet. When you click "Open demo wallet", it opens a browser tab that mimics what a real EUDI Wallet app would do.

## Files

| File                  | Purpose                                   |
| --------------------- | ----------------------------------------- |
| `server.ts`           | Static file server + API proxy to `:3000` |
| `public/index.html`   | Landing page                              |
| `public/verify.html`  | Age verification with widget              |
| `public/success.html` | Post-verification page                    |
| `public/styles.css`   | EU-themed styling                         |

## Running with Docker

> **Note:** The Docker image still bundles API + static in one process for single-container deployment. Local dev uses the split layout above.

```bash
docker build -t eudi-verify-demo -f examples/html-vanilla/Dockerfile .
docker run -p 3000:3001 -e TOKEN_SECRET=your-secret-here eudi-verify-demo
```

## Environment Variables

| Variable       | Required   | Default                          | Description                 |
| -------------- | ---------- | -------------------------------- | --------------------------- |
| `TOKEN_SECRET` | Yes (prod) | `demo-secret-...`                | HMAC secret (API server)    |
| `PORT`         | No         | `3001`                           | Static server port          |
| `API_PORT`     | No         | `3000`                           | API server port to proxy to |
| `BASE_URL`     | No         | `http://localhost:3000/api/eudi` | Public URL (API server)     |

## Testing Without a Wallet

1. Start both servers (see Quick Start).
2. Open http://localhost:3001/verify and click **Start Verification**.
3. When the QR appears, click **Open demo wallet →**.
4. In the demo wallet tab, click **Approve**. Return to the verification tab — it should redirect to `/success?rid=…`.

### Curl (wallet callback)

```bash
curl -X POST http://localhost:3000/api/eudi/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "response=demo&state=SESSION_ID"
```

## Demo Mode Warning

This demo runs in demo mode with simulated credentials. For production deployment, see [docs/deploy-eu.md](../../docs/deploy-eu.md).
