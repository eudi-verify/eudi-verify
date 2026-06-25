# @eudi-verify/react

React wrapper for the `<eudi-verify>` custom element. Drop-in component for EUDI Wallet verification in React applications.

## Requirements

- **React 18+** (uses hooks and forwardRef)
- **TypeScript 5+** (optional but recommended)

## Installation

```bash
pnpm add @eudi-verify/react
```

## Quick Start

```tsx
import { EudiVerify } from "@eudi-verify/react";

function AgeGate() {
  return (
    <EudiVerify
      apiUrl="/api/eudi"
      request={{ age_over_18: true }}
      onVerified={({ token, claims }) => {
        // POST token to your backend for validation
        fetch("/checkout", {
          method: "POST",
          body: JSON.stringify({ eudiToken: token }),
        });
      }}
      onRejected={() => console.log("User declined verification")}
      onError={({ error }) => console.error("Verification error:", error)}
    />
  );
}
```

## Props

| Prop            | Type                            | Required | Description                               |
| --------------- | ------------------------------- | -------- | ----------------------------------------- |
| `apiUrl`        | `string`                        | Yes      | Base URL of your EUDI Verifier API        |
| `request`       | `VerificationRequest \| string` | Yes      | Claims to request from wallet             |
| `autoStart`     | `boolean`                       | No       | Start verification automatically on mount |
| `className`     | `string`                        | No       | CSS class for the host element            |
| `style`         | `CSSProperties`                 | No       | Inline styles for the host element        |
| `onVerified`    | `(detail) => void`              | No       | Called when verification succeeds         |
| `onRejected`    | `(detail) => void`              | No       | Called when user rejects in wallet        |
| `onExpired`     | `() => void`                    | No       | Called when session expires               |
| `onError`       | `(detail) => void`              | No       | Called when an error occurs               |
| `onStateChange` | `(detail) => void`              | No       | Called on any state change                |

### Verification Request

```tsx
interface VerificationRequest {
  age_over_18?: true;
  age_over_21?: true;
  nationality?: true;
  given_name?: true;
  family_name?: true;
  birth_date?: true;
}
```

## Imperative Control via Ref

Access component methods programmatically:

```tsx
import { useRef } from "react";
import { EudiVerify, type EudiVerifyRef } from "@eudi-verify/react";

function App() {
  const ref = useRef<EudiVerifyRef>(null);

  return (
    <>
      <EudiVerify
        ref={ref}
        apiUrl="/api/eudi"
        request={{ age_over_18: true }}
      />
      <button onClick={() => ref.current?.start()}>Start Verification</button>
      <button onClick={() => ref.current?.cancel()}>Cancel</button>
    </>
  );
}
```

### Ref Handle API

| Property/Method | Type                        | Description                              |
| --------------- | --------------------------- | ---------------------------------------- |
| `start()`       | `() => void`                | Start the verification flow              |
| `cancel()`      | `() => void`                | Cancel current verification              |
| `reset()`       | `() => void`                | Reset to idle state                      |
| `state`         | `VerificationState \| null` | Current state (read-only)                |
| `element`       | `EudiVerifyElement \| null` | Underlying custom element (escape hatch) |

## Headless Hook

For custom UI implementations, use the `useEudiVerify` hook:

```tsx
import { useEudiVerify } from "@eudi-verify/react";

function CustomVerificationUI() {
  const { state, start, cancel } = useEudiVerify({
    apiUrl: "/api/eudi",
  });

  if (state.status === "idle") {
    return (
      <button onClick={() => start({ age_over_18: true })}>
        Verify Your Age
      </button>
    );
  }

  if (state.status === "showQR") {
    return <img src={state.qrDataUrl} alt="Scan with EUDI Wallet" />;
  }

  if (state.status === "verified") {
    return <div>Verified! Token: {state.token}</div>;
  }

  return <div>Status: {state.status}</div>;
}
```

## Theming

Style the widget using CSS custom properties:

```css
eudi-verify {
  --eudi-primary: #0052b4; /* Buttons, success */
  --eudi-text: #1a1a1a; /* Body text */
  --eudi-background: #ffffff; /* Widget surface */
  --eudi-border-radius: 12px; /* Corner rounding */
  --eudi-font-family: "Inter", sans-serif;
  --eudi-error: #d32f2f; /* Error state */
}
```

Or pass `className` and `style` props directly:

```tsx
<EudiVerify
  className="my-verification-widget"
  style={{ maxWidth: "400px", margin: "0 auto" }}
  apiUrl="/api/eudi"
  request={{ age_over_18: true }}
/>
```

## Usage with Next.js

This component registers a custom element and must run in the browser. Use the `'use client'` directive:

```tsx
"use client";

import { EudiVerify } from "@eudi-verify/react";

export default function VerificationPage() {
  return <EudiVerify apiUrl="/api/eudi" request={{ age_over_18: true }} />;
}
```

## Testing

The package uses happy-dom for tests. If you use jsdom, you may need a custom element polyfill like `@webcomponents/webcomponentsjs`.

Example test setup:

```tsx
import { render, screen } from "@testing-library/react";
import { EudiVerify } from "@eudi-verify/react";

test("renders verification widget", () => {
  render(<EudiVerify apiUrl="/api/eudi" request={{ age_over_18: true }} />);
  expect(screen.getByRole("region")).toBeInTheDocument();
});
```

## Escape Hatches

For advanced use cases, the component provides two escape hatches:

### 1. `onStateChange` Callback

Receive the full state object for custom logic:

```tsx
<EudiVerify
  apiUrl="/api/eudi"
  request={{ age_over_18: true }}
  onStateChange={({ state }) => {
    // Full state object with discriminated union
    if (state.status === "verified") {
      myAnalytics.track("verification_success", {
        claims: state.claims,
        sessionId: state.token,
      });
    }
  }}
/>
```

### 2. `ref.current.element`

Direct access to the underlying `<eudi-verify>` custom element:

```tsx
const ref = useRef<EudiVerifyRef>(null);

// Attach custom event listeners
useEffect(() => {
  const element = ref.current?.element;
  if (!element) return;

  const customHandler = (e: CustomEvent) => {
    console.log("Custom verified handler:", e.detail);
  };

  element.addEventListener("verified", customHandler);
  return () => element.removeEventListener("verified", customHandler);
}, []);
```

## Events

All events include a `detail` property with relevant data:

| Event          | Detail                              | Description             |
| -------------- | ----------------------------------- | ----------------------- |
| `verified`     | `{ token: string, claims: object }` | Verification succeeded  |
| `rejected`     | `{ error?: string }`                | User rejected in wallet |
| `expired`      | `{}`                                | Session expired         |
| `error`        | `{ error: string }`                 | Error occurred          |
| `state-change` | `{ state: VerificationState }`      | Any state change        |

## States

The widget cycles through these states:

```
idle → loading → showQR → waitingForWallet → verified
                                           → rejected
                                           → expired
                                           → error
```

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome for Android)

## Bundle Size

~8KB gzipped (includes the embed widget).

## Why a Wrapper?

React (18+) does not map `on*` props to custom element events. Passing `onVerified` on `<eudi-verify>` does **not** listen for the `verified` DOM event — the wrapper bridges that gap with `useEffect` + `addEventListener`.

The wrapper also provides:

1. **Type safety** — full TypeScript types for props, events, and the ref handle
2. **Developer experience**:
   - Accept `request` as an object or JSON string
   - Imperative methods via `ref` (`start()`, `cancel()`, `reset()`)
   - Escape hatches (`onStateChange`, `ref.current.element`)
3. **Consistency** — same callback API in CSR, SSR, and tests

You can use `<eudi-verify>` directly in React with `ref` + `addEventListener` (see [INTEGRATION.md](../../docs/INTEGRATION.md)); the wrapper is the recommended path for typed props and callbacks.

## License

AGPL-3.0 — see [LICENSE](../../LICENSE).
