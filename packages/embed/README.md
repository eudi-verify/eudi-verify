# @eudi-verify/embed

`<eudi-verify>` — a vanilla Custom Element for EUDI Wallet verification. Drop it into any HTML page. No build step required.

## Installation

```bash
pnpm add @eudi-verify/embed
```

Or include directly via CDN:

```html
<script type="module" src="https://unpkg.com/@eudi-verify/embed"></script>
```

## Quick Start

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module">
      import "@eudi-verify/embed";
    </script>
  </head>
  <body>
    <eudi-verify
      api-url="/api/eudi"
      request='{"age_over_18":true}'
    ></eudi-verify>

    <script>
      document
        .querySelector("eudi-verify")
        .addEventListener("verified", (e) => {
          console.log("Token:", e.detail.token);
          console.log("Claims:", e.detail.claims);
        });
    </script>
  </body>
</html>
```

## Using React?

See [`@eudi-verify/react`](../react/README.md) for typed props, callbacks, and the `useEudiVerify` hook. You can also use `<eudi-verify>` directly in React with `ref` + `addEventListener` — see [INTEGRATION.md](../../docs/INTEGRATION.md).

## Attributes

| Attribute    | Type        | Required | Description                                           |
| ------------ | ----------- | -------- | ----------------------------------------------------- |
| `api-url`    | string      | Yes      | Base URL for your verifier API                        |
| `request`    | JSON string | Yes      | Verification request (e.g., `'{"age_over_18":true}'`) |
| `auto-start` | boolean     | No       | Start verification automatically on page load         |

## Methods

| Method     | Description                     |
| ---------- | ------------------------------- |
| `start()`  | Start the verification flow     |
| `cancel()` | Cancel the current verification |
| `reset()`  | Reset to idle state             |

```js
const widget = document.querySelector("eudi-verify");

// Programmatically start
widget.start();

// Cancel ongoing verification
widget.cancel();

// Reset to try again
widget.reset();
```

## Events

| Event          | Detail                              | Description             |
| -------------- | ----------------------------------- | ----------------------- |
| `verified`     | `{ token: string, claims: object }` | Verification succeeded  |
| `rejected`     | `{ error?: string }`                | User rejected in wallet |
| `expired`      | `{}`                                | Session expired         |
| `error`        | `{ error: string }`                 | Error occurred          |
| `state-change` | `{ state: VerificationState }`      | Any state change        |

```js
widget.addEventListener("verified", (e) => {
  // Send token to your backend for validation
  fetch("/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eudiToken: e.detail.token }),
  });
});

widget.addEventListener("rejected", () => {
  alert("Verification was declined");
});

widget.addEventListener("error", (e) => {
  console.error("Error:", e.detail.error);
});

widget.addEventListener("state-change", (e) => {
  console.log("State:", e.detail.state.status);
});
```

## Error Boundaries

The widget wraps `@eudi-verify/client`'s state machine. **DOM events are your integration boundary** — there is no separate error-hook API.

| Event          | When                                | Typical handling                                            |
| -------------- | ----------------------------------- | ----------------------------------------------------------- |
| `rejected`     | User declined in wallet             | Retry prompt; not usually an ops alert                      |
| `expired`      | Session timed out                   | Offer to restart                                            |
| `error`        | Network/API failure, invalid config | Show message; report to error tracking                      |
| `state-change` | Any transition                      | Escape hatch — full `VerificationState` in `e.detail.state` |

```js
// Error reporting (Sentry, Datadog browser SDK, etc.)
widget.addEventListener("error", (e) => {
  reportError({ source: "eudi-verify", message: e.detail.error });
});

widget.addEventListener("rejected", (e) => {
  reportEvent({ type: "verification_rejected", detail: e.detail.error });
});

// Or handle everything via state-change
widget.addEventListener("state-change", (e) => {
  const { state } = e.detail;
  if (state.status === "error") reportError({ message: state.error });
});
```

**Config errors:** invalid JSON in the `request` attribute dispatches `error`. A missing `api-url` logs to the console only (no event) — validate attributes before calling `start()`.

The widget renders built-in UI for `rejected`, `expired`, and `error` states. Events fire in addition to that UI so host pages can react (alerts, analytics, redirects).

See [INTEGRATION.md](../../docs/INTEGRATION.md#error-boundaries) for the full stack overview.

## Theming

Style the widget using CSS custom properties:

```css
eudi-verify {
  --eudi-primary: #003399; /* EU blue - buttons, success */
  --eudi-text: #1a1a1a; /* Body text */
  --eudi-background: #ffffff; /* Widget surface */
  --eudi-border-radius: 8px; /* Corner rounding */
  --eudi-font-family: system-ui, sans-serif;
  --eudi-error: #d32f2f; /* Error/rejected state */
}
```

Example with custom branding:

```css
eudi-verify {
  --eudi-primary: #0052b4;
  --eudi-border-radius: 12px;
  --eudi-font-family: "Inter", sans-serif;
}
```

## Accessibility

The widget is WCAG 2.1 AA compliant:

- **ARIA live regions** announce state changes to screen readers
- **Focus management** during the verification flow
- **Keyboard navigation** for all interactive elements
- **Color contrast** meets 4.5:1 ratio (default theme)
- **Reduced motion** respects `prefers-reduced-motion`

## Shadow DOM

The widget uses open Shadow DOM for style encapsulation. Styles don't leak in or out, but you can inspect the structure in DevTools.

```html
<eudi-verify>
  #shadow-root (open)
  <style>
    /* Internal styles */
  </style>
  <div class="eudi-widget" role="region" aria-label="Identity verification">
    <!-- State containers -->
  </div>
</eudi-verify>
```

## States

The widget cycles through these states:

```
idle → loading → showQR → waitingForWallet → verified
                                           → rejected
                                           → expired
                                           → error
```

Each state renders different UI:

| State              | UI                               |
| ------------------ | -------------------------------- |
| `idle`             | "Verify with EU Wallet" button   |
| `loading`          | Spinner                          |
| `showQR`           | QR code with cancel button       |
| `waitingForWallet` | "Waiting for wallet approval..." |
| `verified`         | Success checkmark                |
| `rejected`         | Error with retry button          |
| `expired`          | Expired message with retry       |
| `error`            | Error message with retry         |

## Claims You Can Request

```json
{
  "age_over_18": true,
  "age_over_21": true,
  "nationality": true,
  "given_name": true,
  "family_name": true,
  "birth_date": true
}
```

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome for Android)

## Bundle Size

~8KB gzipped (including the client library).

## Build Outputs

| File                       | Format     | Usage                           |
| -------------------------- | ---------- | ------------------------------- |
| `dist/eudi-verify.js`      | ES Module  | `import '@eudi-verify/embed'`   |
| `dist/eudi-verify.cjs`     | CommonJS   | `require('@eudi-verify/embed')` |
| `dist/eudi-verify.iife.js` | IIFE       | `<script src="...">`            |
| `dist/index.d.ts`          | TypeScript | Type definitions                |

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Unit tests
pnpm test

# E2E tests (requires demo server running)
pnpm test:e2e

# Type check
pnpm typecheck
```

## License

Apache-2.0 — see [LICENSE](../../LICENSE).
