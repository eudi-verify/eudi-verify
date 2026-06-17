# WP3: Client Library (`@eudi-verify/client`)

## Overview

Implement a vanilla TypeScript client library for browser-side verification flows. Zero framework dependencies. Provides a typed API client and state machine for managing the verification lifecycle.

## Prerequisites

- WP1 completed: OpenAPI spec, shared types

## Deliverables

### 1. API Client (`packages/client/src/api.ts`)

Typed HTTP client matching the OpenAPI spec:

```ts
export interface EudiApiClient {
  createSession(request: VerificationRequest): Promise<Session>;
  getSession(sessionId: string): Promise<Session>;
  cancelSession(sessionId: string): Promise<Session>;
}

export function createApiClient(baseUrl: string): EudiApiClient;
```

Requirements:

- Use native `fetch` (no axios/ky)
- Proper error handling with typed errors
- Request/response validation

### 2. Verification State Machine (`packages/client/src/verification.ts`)

State machine managing the verification flow:

```ts
export type VerificationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "showQR"; qrUrl: string; sessionId: string }
  | { status: "waitingForWallet"; sessionId: string }
  | { status: "verified"; token: string; claims: VerifiedClaims }
  | { status: "rejected"; error?: string }
  | { status: "expired" }
  | { status: "error"; error: string };

export interface Verification {
  readonly state: VerificationState;
  start(request: VerificationRequest): Promise<void>;
  cancel(): Promise<void>;
  destroy(): void;
  subscribe(callback: (state: VerificationState) => void): () => void;
}

export function createVerification(config: VerificationConfig): Verification;
```

Requirements:

- State transitions: `idle → loading → showQR → waitingForWallet → verified|rejected|expired`
- Polling with exponential backoff (1s → 2s → 4s → max 10s)
- Automatic cleanup on destroy
- Event-based state updates

### 3. QR Code Generation (`packages/client/src/qr.ts`)

Minimal QR code generation:

```ts
export interface QRCodeOptions {
  size?: number;
  errorCorrection?: "L" | "M" | "Q" | "H";
}

export function generateQRDataUrl(
  data: string,
  options?: QRCodeOptions,
): string;
export function generateQRSvg(data: string, options?: QRCodeOptions): string;
```

Requirements:

- Vendor small audited QR library OR implement from scratch
- Support SVG and Data URL output
- EU-institutional sizing defaults (min 150x150px)

### 4. Polling Manager (`packages/client/src/polling.ts`)

Exponential backoff polling:

```ts
export interface PollingConfig {
  initialIntervalMs: number; // default: 1000
  maxIntervalMs: number; // default: 10000
  backoffMultiplier: number; // default: 2
}

export function createPoller(
  fn: () => Promise<boolean>, // returns true to stop
  config?: PollingConfig,
): { start: () => void; stop: () => void };
```

### 5. Type Exports

Re-export shared types from `@eudi-verify/server` for convenience:

```ts
export type {
  VerificationRequest,
  SessionStatus,
  VerifiedClaims,
  Session,
} from "./types.js";
```

## Acceptance Criteria

1. **Unit tests pass**: All core functions tested with mocked fetch
2. **Bundle size**: < 15KB gzip
3. **Zero framework deps**: No React, Vue, Angular, etc.
4. **Polling works**: Exponential backoff, proper cleanup
5. **State machine**: All transitions tested, no invalid states

## Testing

Run tests:

```bash
cd packages/client
pnpm test
```

Test files to create:

- `src/api.test.ts` - API client with mocked fetch
- `src/verification.test.ts` - State machine transitions
- `src/qr.test.ts` - QR generation
- `src/polling.test.ts` - Polling with fake timers

## Bundle Analysis

Add script to check bundle size:

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "size": "size-limit"
  }
}
```

## Files to Create/Modify

- `packages/client/src/api.ts` - API client
- `packages/client/src/verification.ts` - State machine
- `packages/client/src/qr.ts` - QR generation
- `packages/client/src/polling.ts` - Polling utility
- `packages/client/src/types.ts` - Re-exported types
- `packages/client/src/index.ts` - Public exports
- `packages/client/package.json` - Build config

## Notes

- SSE support deferred to post-MVP (polling is simpler, works everywhere)
- W3C Digital Credentials API (same-device) deferred to post-MVP
- Keep dependencies minimal — audit any QR library carefully
