# @eudi-verify/client

Vanilla TypeScript client for EUDI Wallet verification flows. Zero framework dependencies.

## Installation

```bash
pnpm add @eudi-verify/client
```

## Quick Start

```ts
import { createVerification } from '@eudi-verify/client';

const verification = createVerification({
  apiUrl: 'https://your-api.example.com',
});

// Subscribe to state changes
verification.subscribe((state) => {
  switch (state.status) {
    case 'loading':
      showSpinner();
      break;
    case 'showQR':
      // Display QR code for wallet scanning
      document.getElementById('qr').src = state.qrDataUrl;
      break;
    case 'waitingForWallet':
      showMessage('Approve in your wallet app...');
      break;
    case 'verified':
      // Send token to your backend for validation
      submitToBackend(state.token, state.claims);
      break;
    case 'rejected':
      showError('Verification was declined');
      break;
    case 'expired':
      showError('Session expired, please try again');
      break;
    case 'error':
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
```

All states are typed as a discriminated union:

```ts
type VerificationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'showQR'; qrDataUrl: string; qrUrl: string; sessionId: string }
  | { status: 'waitingForWallet'; sessionId: string }
  | { status: 'verified'; token: string; claims: VerifiedClaims }
  | { status: 'rejected'; error?: string }
  | { status: 'expired' }
  | { status: 'error'; error: string };
```

## API

### `createVerification(config)`

Creates a verification instance.

```ts
interface VerificationConfig {
  apiUrl: string;              // Your verifier API base URL
  polling?: {
    initialIntervalMs?: number; // Default: 1000
    maxIntervalMs?: number;     // Default: 10000
    backoffMultiplier?: number; // Default: 2
  };
  qr?: {
    size?: number;              // Default: 200
    errorCorrection?: 'L' | 'M' | 'Q' | 'H'; // Default: 'M'
  };
}
```

### Verification Instance

| Method | Description |
|--------|-------------|
| `state` | Current state (read-only) |
| `start(request)` | Start verification with requested claims |
| `cancel()` | Cancel current verification |
| `destroy()` | Cleanup (stop polling, clear subscribers) |
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
import { createApiClient } from '@eudi-verify/client';

const api = createApiClient({ baseUrl: 'https://your-api.example.com' });

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
import { generateQRSvg, generateQRDataUrl } from '@eudi-verify/client';

// SVG string
const svg = generateQRSvg('openid4vp://...', { size: 300 });

// Data URL (for <img src>)
const dataUrl = generateQRDataUrl('openid4vp://...');
```

## Error Handling

Typed errors for different failure modes:

```ts
import {
  NetworkError,
  ApiResponseError,
  SessionNotFoundError,
  RateLimitError,
} from '@eudi-verify/client';

try {
  await api.createSession({ age_over_18: true });
} catch (error) {
  if (error instanceof RateLimitError) {
    // Wait and retry
    await sleep(error.retryAfterMs ?? 60000);
  } else if (error instanceof NetworkError) {
    // Network issue
  } else if (error instanceof ApiResponseError) {
    // Server returned error
    console.log(error.statusCode, error.errorCode);
  }
}
```

## Bundle Size

~6KB gzipped (includes QR encoder).

## License

Apache-2.0
