/**
 * @eudi-verify/server
 *
 * Framework-agnostic EUDI Wallet verifier server.
 * Implements the OpenAPI spec for session management and token verification.
 *
 * @example
 * ```ts
 * import {
 *   MockEngine,
 *   MemoryKVStore,
 *   type VerifierEngine,
 *   type Session,
 * } from '@eudi-verify/server';
 *
 * const engine = new MockEngine();
 * const store = new MemoryKVStore();
 * ```
 *
 * @packageDocumentation
 */

export const VERSION = '0.0.0';

// Types
export type {
  VerificationRequest,
  SessionStatus,
  VerifiedClaims,
  Session,
  SessionDTO,
  VerificationTokenPayload,
  CreateSessionInput,
  VerifyTokenInput,
  VerifyTokenResult,
  ApiError,
  VerifierMode,
} from './types.js';

export {
  TERMINAL_STATUSES,
  isTerminalStatus,
  sessionToDTO,
  TOKEN_VERSION,
  DEFAULT_SESSION_TTL_MS,
  DEFAULT_TOKEN_TTL_MS,
} from './types.js';

// Store
export type { IKVStore } from './store.js';

export {
  MemoryKVStore,
  KEY_PREFIX,
  sessionKey,
  tokenKey,
  rateLimitKey,
} from './store.js';

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
} from './engine.js';

export { MockEngine } from './engine.js';
