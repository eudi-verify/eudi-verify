# React Example

React application demonstrating `@eudi-verify/react` wrapper for EUDI Wallet verification.

## Features

- Age verification flow with EUDI Wallet (matches html-vanilla demo)
- Event logging and real-time state updates
- Demo wallet integration
- Developer curl hints
- Token submission to backend
- EU-themed styling

## Quick Start

**Once, from the repository root** (`eudi-verify/`):

```bash
pnpm install && pnpm build
```

**Terminal 1 — Start shared API server:**

```bash
cd examples/server && pnpm start
```

**Terminal 2 — Start React dev server** (new terminal, repo root):

```bash
cd examples/react && pnpm start
```

Open http://localhost:3001

The Vite dev server (port 3001) proxies `/api/*` requests to the shared API server (port 3000).

## Project Structure

```
examples/react/
├── src/
│   ├── App.tsx           # Main React component
│   ├── App.css           # Styles + theming
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── package.json
├── vite.config.ts        # Vite configuration (proxies /api to port 3000)
└── README.md
```

The backend lives in `examples/server/` (shared across all examples).

## Demo Mode

This example and the default local API run in **demo mode** (simulated wallet).
Visitors without a wallet use **Open demo wallet**. Integrators who have a
lab wallet can run `examples/server` with `EUDI_MODE=production` against a
real presentation — see [docs/SUPPORTED.md](../../docs/SUPPORTED.md) and
[examples/server/README.md](../server/README.md).

The shared API server (`examples/server/`) defaults to `OpenEudiEngine` demo
mode. The demo wallet and success pages (`demo-wallet.html`, `success.html`)
use vanilla JavaScript, not React — shared testing utilities across examples.

## Code Examples

This example demonstrates the same verification flow as the `html-vanilla` example, but implemented in React using the `@eudi-verify/react` wrapper.

### Basic Usage

```tsx
import { EudiVerify } from "@eudi-verify/react";

function AgeGate() {
  return (
    <EudiVerify
      apiUrl="/api/eudi"
      request={{ age_over_18: true }}
      onVerified={({ token, claims }) => {
        console.log("Verified!", { token, claims });
      }}
    />
  );
}
```

### With State Management

```tsx
import { useRef, useState } from "react";
import { EudiVerify, type EudiVerifyRef } from "@eudi-verify/react";

function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const ref = useRef<EudiVerifyRef>(null);

  const handleStateChange = ({ state }: { state: any }) => {
    setLogs((prev) => [...prev, `Status: ${state.status}`]);
  };

  return (
    <>
      <EudiVerify
        ref={ref}
        apiUrl="/api/eudi"
        request={{ age_over_18: true }}
        onStateChange={handleStateChange}
      />
      <ul>
        {logs.map((log, i) => (
          <li key={i}>{log}</li>
        ))}
      </ul>
    </>
  );
}
```

### Theming

The example uses the same EU-themed styles as the html-vanilla demo. The widget inherits CSS variables:

```css
eudi-verify {
  --eudi-primary: var(--color-eu-blue);
  --eudi-text: var(--color-text);
  --eudi-background: var(--color-background);
  --eudi-border-radius: var(--radius);
  --eudi-font-family: var(--font-sans);
}
```

For custom styling, see `src/styles.css` or refer to the `@eudi-verify/embed` documentation.

## Development

```bash
pnpm dev
pnpm build
pnpm preview
pnpm test:e2e
```

The API server must be running separately on port 3000 for manual dev (`pnpm start` in `examples/server/`).

`pnpm test:e2e` starts its own mock API and Vite dev server (port 3012 by default) — use this to verify the dev bundle mounts, not just `pnpm build`.

## License

Apache-2.0
