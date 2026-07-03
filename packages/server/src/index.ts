/**
 * @eudi-verify/server
 *
 * Framework-agnostic EUDI Wallet verifier server.
 * Implements the OpenAPI spec for session management and token verification.
 *
 * @example
 * ```ts
 * import {
 *   createVerifierHandlers,
 *   OpenEudiEngine,
 *   MemoryKVStore,
 *   type VerifierConfig,
 * } from '@eudi-verify/server';
 *
 * const engine = new OpenEudiEngine({ mode: 'demo', baseUrl: '/api/eudi' });
 * const store = new MemoryKVStore();
 * const handlers = createVerifierHandlers({
 *   engine,
 *   store,
 *   baseUrl: '/api/eudi',
 *   mode: 'demo',
 *   tokenSecret: process.env.TOKEN_SECRET!,
 * });
 * ```
 *
 * @packageDocumentation
 */

// `Openid4vpEngine` depends on `@openeudi/openid4vp` -> `@peculiar/x509`,
// which requires a reflect polyfill (tsyringe DI) registered before that
// module loads. Side-effect import here guarantees it's in place for any
// consumer importing from the package root, regardless of import order.
import "reflect-metadata";

export { VERSION } from "./version.js";

// Types
export type {
  VerificationRequest,
  SessionStatus,
  VerifiedClaims,
  TrustLevel,
  Session,
  SessionDTO,
  VerificationTokenPayload,
  CreateSessionInput,
  VerifyTokenInput,
  VerifyTokenResult,
  ApiError,
  VerifierMode,
} from "./types.js";

export {
  TERMINAL_STATUSES,
  isTerminalStatus,
  sessionToDTO,
  TOKEN_VERSION,
  DEFAULT_SESSION_TTL_MS,
  DEFAULT_TOKEN_TTL_MS,
} from "./types.js";

// Store
export type { IKVStore } from "./store.js";

export {
  MemoryKVStore,
  KEY_PREFIX,
  sessionKey,
  tokenKey,
  rateLimitKey,
} from "./store.js";

// Engine
export type {
  VerifierEngine,
  CreateSessionConfig,
  CreateSessionResult,
  CallbackData,
  CallbackResult,
  MockEngineConfig,
  OpenEudiEngineConfig,
  SphereonEngineConfig,
} from "./engine.js";

export { MockEngine } from "./engine.js";

// OpenEUDI Engine
export type { OpenEudiEngineOptions } from "./engines/openeudi.js";
export { OpenEudiEngine } from "./engines/openeudi.js";

// OpenID4VP Engine (production — real cryptographic verification)
export type { Openid4vpEngineConfig } from "./engines/openid4vp.js";
export { Openid4vpEngine } from "./engines/openid4vp.js";

// Token Service
export type { TokenService, TokenServiceConfig } from "./token.js";
export { createTokenService } from "./token.js";

// Rate Limiter
export type {
  RateLimiter,
  RateLimitConfig,
  RateLimitResult,
} from "./rate-limit.js";
export { createRateLimiter } from "./rate-limit.js";

// Client IP (rate limiting behind CDN / reverse proxy)
export { clientIpFromHeaders } from "./client-ip.js";

// Handlers
export type {
  VerifierConfig,
  VerifierHandlers,
  RequestContext,
  HandlerResponse,
  RequestHandler,
} from "./handlers.js";
export { createVerifierHandlers } from "./handlers.js";
