/**
 * @eudi-verify/react - Type definitions
 */

import type { CSSProperties } from "react";
import type {
  VerificationRequest,
  VerificationState,
  VerifiedClaims,
} from "@eudi-verify/client";
import type { EudiVerifyElement } from "@eudi-verify/embed";

/**
 * Props for the EudiVerify component.
 */
export interface EudiVerifyProps {
  /** Base URL of the EUDI Verifier API */
  apiUrl: string;

  /** Verification request (claims to request from wallet) */
  request: VerificationRequest | string;

  /** Start verification automatically on mount */
  autoStart?: boolean;

  /** CSS class name for the host element */
  className?: string;

  /** Inline styles for the host element */
  style?: CSSProperties;

  /** Called when verification succeeds */
  onVerified?: (detail: { token: string; claims: Record<string, unknown> }) => void;

  /** Called when user rejects verification in wallet */
  onRejected?: (detail: { error?: string }) => void;

  /** Called when session expires */
  onExpired?: () => void;

  /** Called when an error occurs */
  onError?: (detail: { error: string }) => void;

  /** Called on any state change */
  onStateChange?: (detail: { state: VerificationState }) => void;
}

/**
 * Imperative handle for the EudiVerify component.
 * Access via ref to control verification flow programmatically.
 */
export interface EudiVerifyRef {
  /** Start the verification flow */
  start: () => void;

  /** Cancel the current verification */
  cancel: () => void;

  /** Reset to idle state */
  reset: () => void;

  /** Current verification state (read-only) */
  readonly state: VerificationState | null;

  /** Direct access to the underlying custom element (escape hatch) */
  readonly element: EudiVerifyElement | null;
}

export type { VerificationRequest, VerificationState, VerifiedClaims };
