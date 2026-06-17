/**
 * @eudi-verify/server - Shared Types
 *
 * These types are derived from the OpenAPI spec and used across all packages.
 * They define the contract between client, server, and widget.
 */

/**
 * Claims that can be requested from an EUDI Wallet.
 * Each property set to `true` requests that specific claim.
 * Uses selective disclosure — only requested claims are shared.
 *
 * @example
 * ```ts
 * const request: VerificationRequest = {
 *   age_over_18: true,
 *   nationality: true,
 * };
 * ```
 */
export interface VerificationRequest {
  /** Request age verification (over 18) */
  age_over_18?: true;
  /** Request age verification (over 21) */
  age_over_21?: true;
  /** Request nationality claim (ISO 3166-1 alpha-2) */
  nationality?: true;
  /** Request given name */
  given_name?: true;
  /** Request family name */
  family_name?: true;
  /** Request birth date */
  birth_date?: true;
  /** Additional claims (extensible) */
  [key: string]: true | undefined;
}

/**
 * Session lifecycle states.
 *
 * Flow: pending → waiting_for_wallet → verified|rejected|expired|error
 *       ↳ cancelled (from any non-terminal state)
 */
export type SessionStatus =
  | "pending" // Session created, waiting for wallet scan
  | "waiting_for_wallet" // QR scanned, waiting for user approval
  | "verified" // User approved, claims verified successfully
  | "rejected" // User rejected the request in wallet
  | "expired" // Session TTL exceeded
  | "cancelled" // Cancelled via API
  | "error"; // Verification failed

/**
 * Terminal states that cannot transition further.
 */
export const TERMINAL_STATUSES: readonly SessionStatus[] = [
  "verified",
  "rejected",
  "expired",
  "cancelled",
  "error",
] as const;

/**
 * Check if a status is terminal (cannot transition).
 */
export function isTerminalStatus(status: SessionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Claims extracted from a verified presentation.
 * Only includes claims that were requested and disclosed.
 *
 * WARNING: In demo mode, these are simulated values.
 */
export interface VerifiedClaims {
  age_over_18?: boolean;
  age_over_21?: boolean;
  nationality?: string;
  given_name?: string;
  family_name?: string;
  birth_date?: string;
  [key: string]: unknown;
}

/**
 * Verification session representing the full lifecycle of a verification request.
 */
export interface Session {
  /** Unique session identifier (UUID) */
  id: string;
  /** Current session status */
  status: SessionStatus;
  /** Original verification request */
  request: VerificationRequest;
  /** URL to encode in QR code (present when status is 'pending') */
  qrUrl?: string;
  /** Opaque verification token (present when status is 'verified') */
  token?: string;
  /** Verified claims (present when status is 'verified') */
  claims?: VerifiedClaims;
  /** Error message (present when status is 'error') */
  error?: string;
  /** Session creation timestamp */
  createdAt: Date;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Internal: engine-specific session data */
  _engineData?: unknown;
}

/**
 * Session as returned by the API (dates as ISO strings).
 */
export interface SessionDTO {
  id: string;
  status: SessionStatus;
  qrUrl?: string;
  token?: string;
  claims?: VerifiedClaims;
  error?: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Convert internal Session to API response DTO.
 */
export function sessionToDTO(session: Session): SessionDTO {
  const dto: SessionDTO = {
    id: session.id,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };

  if (session.qrUrl) dto.qrUrl = session.qrUrl;
  if (session.token) dto.token = session.token;
  if (session.claims) dto.claims = session.claims;
  if (session.error) dto.error = session.error;

  return dto;
}

/**
 * Verification token payload.
 * Format: `eudi_v1.<base64url-payload>.<hmac>`
 *
 * Properties:
 * - Single-use (consumed on successful verify)
 * - Short TTL (default 5 minutes)
 * - HMAC-signed with server secret
 */
export interface VerificationTokenPayload {
  /** Session ID this token is bound to */
  sid: string;
  /** Key ID for secret rotation */
  kid: string;
  /** Expiration timestamp (Unix seconds) */
  exp: number;
  /** Hash of the verified claims */
  hash: string;
}

/**
 * Token version prefix for format identification and future compatibility.
 */
export const TOKEN_VERSION = "eudi_v1" as const;

/**
 * Default session TTL in milliseconds (5 minutes).
 */
export const DEFAULT_SESSION_TTL_MS = 5 * 60 * 1000;

/**
 * Default token TTL in milliseconds (5 minutes).
 */
export const DEFAULT_TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * Request body for POST /sessions.
 */
export interface CreateSessionInput {
  request: VerificationRequest;
  callbackUrl?: string;
}

/**
 * Request body for POST /tokens/verify.
 */
export interface VerifyTokenInput {
  token: string;
}

/**
 * Response from POST /tokens/verify.
 */
export interface VerifyTokenResult {
  valid: boolean;
  claims?: VerifiedClaims;
  error?:
    | "invalid_token"
    | "expired"
    | "already_consumed"
    | "invalid_signature";
}

/**
 * API error response.
 */
export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Operation mode for the verifier.
 */
export type VerifierMode = "demo" | "production";
