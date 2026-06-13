# EUDI Verify - HTML Vanilla Demo

Minimal demo showing `<eudi-verify>` widget integration with a plain Node.js server.

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

No production EUDI Wallets are available yet (see [EU Wallet Status](#eu-wallet-status) below). To test the complete flow manually:

### 1. Start the demo and trigger verification

```bash
pnpm start
# Open http://localhost:3000/verify and click "Start Verification"
```

### 2. Get the session ID

From browser dev tools Network tab, find the `POST /api/eudi/sessions` response. Copy the `id` field, or extract it from the QR URL's `state` parameter.

### 3. Simulate wallet callback

```bash
# Replace SESSION_ID with your actual session ID
curl -X POST http://localhost:3000/api/eudi/callback -H "Content-Type: application/x-www-form-urlencoded" -d "response=demo&state=SESSION_ID"
```

### 4. Observe the result

The widget should transition from "Scan QR" → "Verified" and the form will submit automatically, redirecting to `/success`.

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

This demo runs in demo mode with simulated credentials. The UI shows a warning banner and the server logs a warning on startup. **Do not use for production.**

For production deployment, see [docs/deploy-eu.md](../../docs/deploy-eu.md).
