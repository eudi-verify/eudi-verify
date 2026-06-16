# EUDI Verify - HTML Vanilla Demo

Minimal demo showing `<eudi-verify>` widget integration with a plain Node.js server.

**Live demo:** [https://demo.eudi-verify.eu/](https://demo.eudi-verify.eu/)

## Quick Start

```bash
# From repo root
pnpm install
pnpm build

# Run the demo
cd examples/html-vanilla
pnpm start
```

Open http://localhost:3000

## What This Demonstrates

1. **Widget Integration** — Drop-in `<eudi-verify>` custom element
2. **Server-Side Verification** — Token validation via `/tokens/verify`
3. **Captcha Pattern** — Form submission gated on verified identity

## Architecture

The demo runs a **single Node.js process** that serves everything:

```
┌─────────────────────────────────────────────────────────┐
│  http://localhost:3000  (one process)                   │
│                                                         │
│  Static pages     /verify, /demo-wallet, /success       │
│  Widget bundle    /eudi-verify.js                       │
│  Verifier API     /api/eudi/*  ← real @eudi-verify/server│
│  Demo checkout    /api/checkout                         │
└─────────────────────────────────────────────────────────┘
```

**What's real:** The server uses the actual `@eudi-verify/server` handlers — session lifecycle, HMAC token minting, single-use token verification, and rate limiting all work exactly as they would in production.

**What's simulated:** The wallet. When you click "Open demo wallet", it opens a browser tab (same server) that mimics what a real EUDI Wallet app would do: display the request and call the callback endpoint on approve/reject. No production EUDI Wallets exist yet (due December 2026).

## Files

| File | Purpose |
|------|---------|
| `server.ts` | Node HTTP server mounting verifier handlers |
| `public/index.html` | Landing page |
| `public/verify.html` | Age verification with widget |
| `public/success.html` | Post-verification page |
| `public/styles.css` | EU-themed styling |

## Running with Docker

```bash
docker build -t eudi-verify-demo .
docker run -p 3000:3000 -e TOKEN_SECRET=your-secret-here eudi-verify-demo
```

Or with docker-compose:

```bash
TOKEN_SECRET=your-secret-here docker-compose up
```

## Running without Docker

```bash
# Install dependencies
pnpm install

# Build the embed package (required for widget bundle)
cd ../../packages/embed && pnpm build && cd -

# Start the demo server
pnpm start
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TOKEN_SECRET` | Yes (prod) | `demo-secret-...` | HMAC secret for token signing |
| `PORT` | No | `3000` | Server port |
| `BASE_URL` | No | `http://localhost:3000/api/eudi` | Public URL for callbacks |

## Testing Without a Wallet

No production EUDI Wallets are available yet (see [EU Wallet Status](#eu-wallet-status) below). The demo includes a **demo wallet** page and a **verification log** so you can complete the flow without curl or DevTools.

Wallet approval is **simulated**; the session lifecycle, callback, HMAC token minting, and server-side token verification are **real**.

### Path A — Visitor / browser demo (primary)

1. Start the demo:

```bash
pnpm start
# Open http://localhost:3000/verify and click "Start Verification"
```

2. When the QR appears, click **Open demo wallet →** (or visit `/demo-wallet?state=SESSION_ID` — the session ID is shown in the verification log).

3. In the demo wallet tab, click **Approve**. Return to the verification tab — it should transition to Verified and redirect to `/success?rid=…`.

4. On the success page:
   - **Server verification receipt** — claims returned only from `POST /tokens/verify`
   - **Replay test** — resubmit the consumed token; expect `{ "valid": false, "error": "already_consumed" }`

5. Optional: open the **inspect** link in the verification log to view raw session JSON (`GET /api/eudi/sessions/{id}`).

### Path B — Local developer / curl

Same flow, but trigger the wallet callback from the terminal instead of the demo wallet.

1. Start the demo and click **Start Verification** on `/verify`.

2. Copy the session ID from the **verification log** on the page (or expand **Developer: simulate wallet with curl** for a pre-filled command). DevTools is not required.

3. Simulate the wallet callback:

```bash
# Local (default port)
curl -X POST http://localhost:3000/api/eudi/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "response=demo&state=SESSION_ID"

# Deployed (replace host)
curl -X POST https://demo.your-domain.eu/api/eudi/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "response=demo&state=SESSION_ID"
```

4. The widget should transition from "Scan QR" → "Verified", submit the checkout form, and redirect to `/success?rid=…`.

5. Optional: inspect the session via `GET /api/eudi/sessions/SESSION_ID` or use the replay test on the success page.

### Trust features (both paths)

| Feature | Where | What it proves |
|---------|-------|----------------|
| Verification log | `/verify` | Timestamped server API steps (session created, verified, checkout) |
| Session inspect link | Verification log | Raw session JSON from the server |
| Server receipt | `/success?rid=…` | Claims from server verify, not the widget |
| Replay test | Success page | Token is single-use (`already_consumed` on reuse) |
| Demo wallet audit log | `/demo-wallet` | Callback HTTP status when approving |

## EU Wallet Status (June 2026)

**You cannot download a real EUDI Wallet yet.** Here's where things stand:

| Milestone | Status | Date |
|-----------|--------|------|
| eIDAS 2.0 Regulation | ✅ Passed | May 2024 |
| Architecture Reference Framework | ✅ v2.8 published | 2026 |
| Large Scale Pilots | ✅ Testing | 2023-2026 |
| **Member State Wallets** | 🟡 Development | **Due Dec 2026** |
| Mandatory Business Acceptance | 🔴 Not yet | Due Dec 2027 |

**What exists now:**
- EU Reference Implementation (GitHub, for developers)
- National sandbox/beta programs (Denmark, Ireland, others)
- Closed pilot programs (POTENTIAL, NOBID, DC4EU, EWC, APTITUDE, WE BUILD)

**What's coming:**
- All 27 EU Member States must offer at least one certified wallet by **December 24, 2026**
- Banks, telecoms, and other regulated entities must accept wallets by **end of 2027**

**For verifier developers:** Build and test now using demo mode. When national wallets launch, switch `mode: 'demo'` to `mode: 'production'` and configure your trust anchors.

## Demo Mode Warning

This demo runs in demo mode with simulated credentials. The UI shows a banner (*Simulated verification — credentials are fake. For local testing only.*) and the server logs a warning on startup. Demo mode provides no real identity verification.

For production deployment, see [docs/deploy-eu.md](../../docs/deploy-eu.md).
