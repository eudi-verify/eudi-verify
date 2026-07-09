# Shared API Server

Reference backend for all eudi-verify frontend examples.

## Prerequisites

From the **repository root** (not this directory):

```bash
cd eudi-verify   # path to your clone
pnpm install && pnpm build
```

Example folders have no `build` script — only `packages/*` are built at the root.

## Quick Start

```bash
pnpm start
```

Runs on http://localhost:3000. All `/api/*` endpoints are available.

## Usage with Frontend Examples

1. Start this server: `pnpm start` (in this directory) — runs on http://localhost:3000
2. In another terminal, start any frontend example:
   - `examples/html-vanilla/`: `pnpm start` → http://localhost:3001
   - `examples/react/`: `pnpm dev` → http://localhost:3001

Each frontend proxies `/api/*` to this server. Only one frontend can run at a time (both use port 3001).

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
