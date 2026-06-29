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

**Terminal 1 — Start shared API server:**

```bash
cd examples/server
pnpm start
```

**Terminal 2 — Start React dev server:**

```bash
cd examples/react
pnpm start
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

⚠️ This demo runs in **demo mode** with simulated credentials. Do not use in production.

The shared API server (`examples/server/`) uses `@eudi-verify/server` handlers with the `OpenEudiEngine` in demo mode, which simulates wallet responses and returns fake claims for testing.

**Note:** The demo wallet and success pages (`demo-wallet.html`, `success.html`) use vanilla JavaScript, not React. These are testing utilities shared across all examples.

**Limitation:** The Vite dev server does not serve `inspect.html` (pretty-print viewer for inspect links), so clicking inspect links in logs will 404. This works in the html-vanilla demo. For local React dev, inspect links are visible but non-functional; this is acceptable since the deployed demo uses html-vanilla.

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
# Development mode (hot reload)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

**Note:** The API server (`examples/server/`) must be running separately on port 3000.

## License

AGPL-3.0
