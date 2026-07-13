# Vue Example

Vue 3 application demonstrating the framework-agnostic `@eudi-verify/embed` custom element for EUDI Wallet verification. No Vue-specific wrapper package is required.

## Quick Start

**Once, from the repository root** (`eudi-verify/`):

```bash
pnpm install && pnpm build
```

**Terminal 1 - Start shared API server:**

```bash
cd examples/server && pnpm start
```

**Terminal 2 - Start Vue dev server** (new terminal, repo root):

```bash
cd examples/vue && pnpm start
```

Open http://localhost:3001

The Vite dev server (port 3001) proxies `/api/*` requests to the shared API server (port 3000).

## Demo Mode

> Warning: This example runs in **demo mode** with simulated credentials. Do not use it in production.

The shared API server (`examples/server/`) uses `@eudi-verify/server` handlers with the `OpenEudiEngine` in demo mode, which simulates wallet responses and returns fake claims for testing.

The demo wallet and success pages (`demo-wallet.html`, `success.html`) use vanilla JavaScript. These testing utilities are shared across the frontend examples.

## Basic Usage

Vue handles custom-element events natively, so the embed package can be used directly:

```vue
<script setup lang="ts">
import "@eudi-verify/embed";

const request = JSON.stringify({ age_over_18: true });
</script>

<template>
  <eudi-verify
    api-url="/api/eudi"
    demo-mode
    :request="request"
    @verified="handleVerified"
    @error="handleError"
  />
</template>
```

Vite is configured to treat `<eudi-verify>` as a custom element. See `vite.config.mjs` and `src/App.vue` for the complete setup and checkout flow.

## Development

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm preview
```

The API server must be running separately on port 3000.

## License

Apache-2.0
