# @eudi-verify/client

Vanilla TypeScript client for EUDI Wallet verification flows. Zero framework dependencies.

## Installation

```bash
pnpm add @eudi-verify/client
```

## Quick Start

```ts
import { createVerification } from "@eudi-verify/client";

const verification = createVerification({
  apiUrl: "https://your-api.example.com",
});

// Subscribe to state changes
verification.subscribe((state) => {
  switch (state.status) {
    case "loading":
      showSpinner();
      break;
    case "showQR":
      // Display QR code for wallet scanning
      document.getElementById("qr").src = state.qrDataUrl;
      break;
    case "waitingForWallet":
      showMessage("Approve in your wallet app...");
      break;
    case "verified":
      // Send token to your backend for validation
      submitToBackend(state.token, state.claims);
      break;
    case "rejected":
      showError("Verification was declined");
      break;
    case "expired":
      showError("Session expired, please try again");
      break;
    case "error":
      showError(state.error);
      break;
  }
});

// Start verification flow
await verification.start({ age_over_18: true });

// Later: cleanup
verification.destroy();
```

## State Machine

```
idle → loading → showQR → waitingForWallet → verified
                                           → rejected
                                           → expired
                                           → error
```

All states are typed as a discriminated union:

```ts
type VerificationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "showQR"; qrDataUrl: string; qrUrl: string; sessionId: string }
  | { status: "waitingForWallet"; sessionId: string }
  | { status: "verified"; token: string; claims: VerifiedClaims }
  | { status: "rejected"; error?: string }
  | { status: "expired" }
  | { status: "error"; error: string };
```

## API

### `createVerification(config)`

Creates a verification instance.

```ts
interface VerificationConfig {
  apiUrl: string; // Your verifier API base URL
  polling?: {
    initialIntervalMs?: number; // Default: 1000
    maxIntervalMs?: number; // Default: 10000
    backoffMultiplier?: number; // Default: 2
  };
  qr?: {
    size?: number; // Default: 200
    errorCorrection?: "L" | "M" | "Q" | "H"; // Default: 'M'
  };
}
```

### Verification Instance

| Method                | Description                                        |
| --------------------- | -------------------------------------------------- |
| `state`               | Current state (read-only)                          |
| `start(request)`      | Start verification with requested claims           |
| `cancel()`            | Cancel current verification                        |
| `destroy()`           | Cleanup (stop polling, clear subscribers)          |
| `subscribe(callback)` | Subscribe to state changes, returns unsubscribe fn |

### Claims You Can Request

```ts
interface VerificationRequest {
  age_over_18?: true;
  age_over_21?: true;
  nationality?: true;
  given_name?: true;
  family_name?: true;
  birth_date?: true;
}
```

## Direct API Client

For custom integrations, use the API client directly:

```ts
import { createApiClient } from "@eudi-verify/client";

const api = createApiClient({ baseUrl: "https://your-api.example.com" });

// Create session
const session = await api.createSession({ age_over_18: true });
console.log(session.qrUrl); // URL for QR code

// Poll status
const status = await api.getSession(session.id);

// Cancel
await api.cancelSession(session.id);
```

## QR Code Generation

Generate QR codes independently:

```ts
import { generateQRSvg, generateQRDataUrl } from "@eudi-verify/client";

// SVG string
const svg = generateQRSvg("openid4vp://...", { size: 300 });

// Data URL (for <img src>)
const dataUrl = generateQRDataUrl("openid4vp://...");
```

## Error Boundaries

The client exposes two integration paths with different error models.

### State machine (`createVerification`) — no throws

`start()`, `cancel()`, and polling **do not throw** on failure. Errors become state transitions:

| State      | Cause                                        | Action                                               |
| ---------- | -------------------------------------------- | ---------------------------------------------------- |
| `rejected` | User declined in wallet                      | Retry UX; usually not an ops alert                   |
| `expired`  | Session timed out                            | Restart flow                                         |
| `error`    | Network failure, API 4xx/5xx, unknown status | Show message; report via `state.error` (string only) |

**Boundary:** `verification.subscribe(callback)`. This is the hook for UI updates and client-side error reporting.

```ts
verification.subscribe((state) => {
  if (state.status === "error") {
    reportError({ message: state.error });
  }
});
```

Typed error details (`errorCode`, `statusCode`) are **not** preserved in the state machine — only the message string.

### API client (`createApiClient`) — typed throws

For custom flows that need structured HTTP errors, use the API client directly:

```ts
import {
  createApiClient,
  NetworkError,
  ApiResponseError,
  SessionNotFoundError,
  RateLimitError,
} from "@eudi-verify/client";

const api = createApiClient({ baseUrl: "https://your-api.example.com" });

try {
  await api.createSession({ age_over_18: true });
} catch (error) {
  if (error instanceof RateLimitError) {
    await sleep(error.retryAfterMs ?? 60_000);
  } else if (error instanceof NetworkError) {
    reportError({ type: "network", cause: error.cause?.message });
  } else if (error instanceof ApiResponseError) {
    reportError({ status: error.statusCode, code: error.errorCode });
  }
}
```

Session-level outcomes (`rejected`, `expired`, `error`) come from `getSession()` as `session.status` — not as thrown errors.

### Which path to use

| Need                                 | Use                                                              |
| ------------------------------------ | ---------------------------------------------------------------- |
| Drop-in flow with QR + polling       | `createVerification` + `subscribe`                               |
| Rate-limit retry, custom error codes | `createApiClient` + `try/catch`                                  |
| Both                                 | `createVerification` for UX; `createApiClient` for one-off calls |

## Bundle Size

~6KB gzipped (includes QR encoder).

## License

Apache-2.0 — see [LICENSE](../../LICENSE).
