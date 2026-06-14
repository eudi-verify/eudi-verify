# WP2: Server Implementation (`@eudi-verify/server`)

## Overview

Implement the framework-agnostic HTTP handler factory that implements the OpenAPI spec. The server wraps a `VerifierEngine` (from WP1) and handles all HTTP concerns, token minting/verification, and session storage.

## Prerequisites

- WP1 completed: OpenAPI spec, types, `VerifierEngine` interface, `IKVStore`, `MockEngine`

## Deliverables

### 1. Handler Factory (`packages/server/src/handlers.ts`)

Create a framework-agnostic handler factory that returns request handlers:

```ts
export interface VerifierHandlers {
  createSession: RequestHandler;
  getSession: RequestHandler;
  cancelSession: RequestHandler;
  verifyToken: RequestHandler;
  handleCallback: RequestHandler;
  getRequest: RequestHandler;
}

export function createVerifierHandlers(config: VerifierConfig): VerifierHandlers;
```

Each handler should:
- Parse and validate request input
- Call appropriate engine/store methods
- Return proper HTTP responses per OpenAPI spec
- Include `X-Eudi-Mode: demo|production` header

### 2. Token Service (`packages/server/src/token.ts`)

Implement captcha-style token minting and verification:

```ts
export interface TokenService {
  mint(sessionId: string, claims: VerifiedClaims): Promise<string>;
  verify(token: string): Promise<VerifyTokenResult>;
}

export function createTokenService(config: TokenServiceConfig): TokenService;
```

Requirements:
- Token format: `eudi_v1.<base64url-payload>.<hmac>`
- Payload: `{ sid, kid, exp, hash }`
- HMAC using `TOKEN_SECRET` env var (signs the **Verification Token**, not the VP from wallet)
- **Constant-time compare** for signature verification
- Single-use: consume token on successful verify (via `IKVStore.getAndDelete`)
- Default TTL: 5 minutes

### 3. Rate Limiter (`packages/server/src/rate-limit.ts`)

Per-IP rate limiting for `POST /sessions`:

```ts
export interface RateLimiter {
  check(ip: string): Promise<{ allowed: boolean; retryAfter?: number }>;
  consume(ip: string): Promise<void>;
}
```

Requirements:
- Default: 10 requests per minute per IP
- Use `IKVStore` for counters
- Return `Retry-After` header when limited

### 4. OpenEUDI Engine (`packages/server/src/engines/openeudi.ts`)

Implement `VerifierEngine` wrapping `@openeudi/core`:

```ts
import { DemoMode } from '@openeudi/core';

export class OpenEudiEngine implements VerifierEngine {
  // Demo mode implementation using @openeudi/core DemoMode
}
```

Requirements:
- Demo mode only for now (production deferred)
- Wrap `@openeudi/core` DemoMode for simulated wallet responses
- Generate proper OpenID4VP authorization request URLs
- Parse and validate demo VP responses

### 5. Configuration

```ts
export interface VerifierConfig {
  engine: VerifierEngine;
  store: IKVStore;
  baseUrl: string;
  mode: 'demo' | 'production';
  sessionTtlMs?: number;
  tokenSecret: string;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}
```

## Acceptance Criteria

1. **Contract tests pass**: Test each endpoint against OpenAPI spec
2. **Token security tests pass**:
   - Replay attack: same token rejected on second use
   - Forgery: modified payload/signature rejected
   - Expiry: expired tokens rejected
   - Constant-time: signature compare doesn't leak timing info
3. **Engine swappable**: `MockEngine` works for all tests
4. **Rate limiting**: Returns 429 with `Retry-After` after threshold
5. **Demo warnings**: Console warning + `X-Eudi-Mode: demo` header in demo mode

## Security Notes

- **Never trust client claims**: Only return verified claims after server-side token verify
- **Constant-time compare**: Use `crypto.timingSafeEqual` for HMAC comparison
- **Secret rotation**: Support `kid` field for key rotation
- **Origin check**: Validate `Origin` header on `POST /sessions`

## Testing

Run tests:
```bash
cd packages/server
pnpm test
```

Key test files to create:
- `src/handlers.test.ts` - HTTP handler tests
- `src/token.test.ts` - Token mint/verify security tests
- `src/rate-limit.test.ts` - Rate limiter tests
- `src/engines/openeudi.test.ts` - Engine integration tests

## Dependencies to Add

```json
{
  "dependencies": {
    "@openeudi/core": "^0.x.x"
  }
}
```

## Files to Create/Modify

- `packages/server/src/handlers.ts` - Handler factory
- `packages/server/src/token.ts` - Token service
- `packages/server/src/rate-limit.ts` - Rate limiter
- `packages/server/src/engines/openeudi.ts` - OpenEUDI engine
- `packages/server/src/index.ts` - Update exports
- `packages/server/package.json` - Add @openeudi/core dep
