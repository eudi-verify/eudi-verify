/**
 * @eudi-verify/client - Shared Types
 *
 * Re-exported types from the server package for client-side use.
 * These types define the contract between client and server.
 */

/**
 * Claims that can be requested from an EUDI Wallet.
 * Each property set to `true` requests that specific claim.
 */
export interface VerificationRequest {
  age_over_18?: true;
  age_over_21?: true;
  nationality?: true;
  given_name?: true;
  family_name?: true;
  birth_date?: true;
  [key: string]: true | undefined;
}

/**
 * Session lifecycle states.
 */
export type SessionStatus =
  | 'pending'
  | 'waiting_for_wallet'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'error';

/**
 * Terminal states that cannot transition further.
 */
export const TERMINAL_STATUSES: readonly SessionStatus[] = Object.freeze([
  'verified',
  'rejected',
  'expired',
  'cancelled',
  'error',
]);

/**
 * Check if a status is terminal (cannot transition).
 */
export function isTerminalStatus(status: SessionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Claims extracted from a verified presentation.
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
 * Session as returned by the API.
 */
export interface Session {
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
 * API error response.
 */
export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}
