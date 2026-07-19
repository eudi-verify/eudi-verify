# Shared API Server

Reference backend for all eudi-verify frontend examples.

## Prerequisites

From the **repository root** (not this directory):

```bash
cd eudi-verify   # path to your clone
pnpm install && pnpm build
```

Example folders have no `build` script: only `packages/*` are built at the root.

## Quick Start

```bash
pnpm start
```

Runs on http://localhost:3000 in **demo** mode (`OpenEudiEngine`). All `/api/*` endpoints are available.

### Production OpenID4VP (lab)

```bash
EUDI_MODE=production \
HOST=0.0.0.0 \
BASE_URL=http://192.168.x.x:3000/api/eudi \
EUDI_TRUST=skip \
TOKEN_SECRET=change-me-to-at-least-32-characters \
pnpm start
```

- `EUDI_MODE=production` selects `Openid4vpEngine` (`@openeudi/openid4vp`)
- `HOST=0.0.0.0` required when `BASE_URL` is a LAN IP: default `127.0.0.1` makes the phone unable to POST `/callback`
- `BASE_URL` must be reachable from the wallet (LAN IP for phone QR flows)
- `EUDI_TRUST=skip` is lab-only (no issuer anchoring); use `EUDI_TRUST=static` + `EUDI_TRUSTED_CERTS=/path/to/ca.der` for anchored trust
- Dedicated QR/capture helper: `pnpm spike:wallet` (see `wallet-spike-server.ts`)
- Frontend examples (`html-vanilla`, etc.) stay demo-branded by default; point them at this API for a real-wallet lab run

## Usage with Frontend Examples

1. Start this server: `pnpm start` (in this directory): runs on http://localhost:3000
2. In another terminal, start any frontend example:
   - `examples/html-vanilla/`: `pnpm start` → http://localhost:3001
   - `examples/react/`: `pnpm dev` → http://localhost:3001
   - `examples/vue/`: `pnpm start` → http://localhost:3001

Each frontend proxies `/api/*` to this server. Only one frontend can run at a time (all use port 3001).

## Endpoints

| Method | Path                      | Description                 |
| ------ | ------------------------- | --------------------------- |
| POST   | `/api/eudi/sessions`      | Create verification session |
| GET    | `/api/eudi/sessions/:id`  | Get session status          |
| POST   | `/api/eudi/sessions/:id`  | Cancel session              |
| POST   | `/api/eudi/tokens/verify` | Verify token                |
| POST   | `/api/eudi/callback`      | Wallet callback             |
| GET    | `/api/eudi/request/:id`   | Get request object          |
| POST   | `/api/checkout`           | Demo checkout flow          |
| GET    | `/api/demo/receipt/:id`   | Get demo receipt            |
| POST   | `/api/demo/replay`        | Replay verification         |
