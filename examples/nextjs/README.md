# Next.js Example

Next.js (App Router) application demonstrating the `@eudi-verify/react` wrapper for EUDI Wallet verification.

## Quick Start

**Once, from the repository root** (`eudi-verify/`):

```bash
pnpm install && pnpm build
```

**Terminal 1: Start the shared API server:**

```bash
cd examples/server && pnpm start
```

**Terminal 2: Start the Next.js dev server** (new terminal, repo root):

```bash
cd examples/nextjs && pnpm dev
```

Open http://localhost:3001

The Next.js dev server (port 3001) proxies `/api/*` requests to the shared API server (port 3000) via rewrites in `next.config.ts`.

## Project Structure

```
examples/nextjs/
├── app/
│   ├── [filename]/
│   │   └── route.ts             # Serves shared/demo-*.js files as same-origin scripts
│   ├── layout.tsx                # Root layout (<html>/<body>, global styles)
│   ├── page.tsx                  # Server Component: static page shell
│   ├── verify-widget.tsx         # 'use client' — widget, state, and event handlers
│   ├── verify-widget-loader.tsx  # 'use client' — loads the widget with SSR disabled
│   ├── globals.css
│   └── eu-emblem.svg
├── public/                       # Shared demo wallet assets (served as static files)
├── next.config.ts                # Proxies /api/* to the shared API server (port 3000)
├── package.json
└── README.md
```

The backend lives in `examples/server/` (shared across all examples).

## Why the widget is split into two files

`<eudi-verify>` is a custom element (web component). Custom elements extend
`HTMLElement`, which only exists in the browser — the class definition itself
throws during any server-side module evaluation, including the render pass
Next.js does for Client Components.

- **`verify-widget.tsx`** (`'use client'`) contains the actual widget usage:
  state, refs, and the `@eudi-verify/react` event handlers. This is the part
  that can only ever run in the browser.
- **`verify-widget-loader.tsx`** (`'use client'`) is the file that makes that
  constraint explicit. It loads `verify-widget.tsx` via `next/dynamic` with
  `ssr: false`, so the module is never imported during server rendering:

  ```tsx
  "use client";

  import dynamic from "next/dynamic";

  const VerifyWidget = dynamic(() => import("./verify-widget"), {
    ssr: false,
    loading: () => <p>Loading verification widget…</p>,
  });

  export default function VerifyWidgetLoader() {
    return <VerifyWidget />;
  }
  ```

- **`page.tsx`** stays a Server Component. It renders the static page shell
  (header, copy, footer) on the server and only defers to the client for the
  `<VerifyWidgetLoader />` it embeds.

This split is the point of the example: it shows the SSR/hydration boundary
explicitly rather than making the whole page a Client Component, which would
work but would hide the actual constraint (custom elements are browser-only)
behind a single blanket `'use client'`.

## Demo Mode

This example and the default local API run in **demo mode** (simulated wallet).
Visitors without a wallet use **Open demo wallet**. Integrators who have a
lab wallet can run `examples/server` with `EUDI_MODE=production` against a
real presentation: see [docs/SUPPORTED.md](../../docs/SUPPORTED.md) and
[examples/server/README.md](../server/README.md).

The shared API server (`examples/server/`) defaults to `OpenEudiEngine` demo
mode. The demo wallet and success pages (`demo-wallet.html`, `success.html`)
use vanilla JavaScript, not React or Next.js: they're shared testing utilities
across examples, served here from `public/`.

## Code Example

```tsx
"use client";

import { useRef, useState } from "react";
import { EudiVerify, type EudiVerifyRef } from "@eudi-verify/react";

export default function VerifyWidget() {
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
        onVerified={({ token, claims }) => {
          console.log("Verified!", { token, claims });
        }}
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

This file is only ever loaded client-side, via `verify-widget-loader.tsx` (see
above) — it is never imported directly from `page.tsx`.

## Theming

The example uses the same EU-themed styles as the html-vanilla demo. The widget
inherits CSS variables:

```css
eudi-verify {
  --eudi-primary: var(--color-eu-blue);
  --eudi-text: var(--color-text);
  --eudi-background: var(--color-background);
  --eudi-border-radius: var(--radius);
  --eudi-font-family: var(--font-sans);
}
```

For custom styling, see `app/globals.css` or refer to the `@eudi-verify/embed`
documentation.

## Development

```bash
pnpm dev     # Start the Next.js dev server on port 3001
pnpm build   # Production build
pnpm start   # Serve the production build on port 3001
pnpm lint    # eslint
```

The shared API server must be running separately on port 3000
(`pnpm start` in `examples/server/`).

## License

Apache-2.0
