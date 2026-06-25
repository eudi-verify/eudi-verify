/**
 * @eudi-verify/react
 *
 * React wrapper for EUDI Wallet verification.
 *
 * @example
 * ```tsx
 * import { EudiVerify } from '@eudi-verify/react';
 *
 * function App() {
 *   return (
 *     <EudiVerify
 *       apiUrl="/api/eudi"
 *       request={{ age_over_18: true }}
 *       onVerified={({ token, claims }) => {
 *         // POST token to your backend
 *       }}
 *     />
 *   );
 * }
 * ```
 */

// Side-effect import: registers <eudi-verify> custom element
import "@eudi-verify/embed";

export const VERSION = "0.1.0";

export { EudiVerify } from "./EudiVerify.js";
export { useEudiVerify } from "./useEudiVerify.js";
export type {
  EudiVerifyProps,
  EudiVerifyRef,
  VerificationRequest,
  VerificationState,
  VerifiedClaims,
} from "./types.js";
export type { UseEudiVerifyConfig, UseEudiVerifyReturn } from "./useEudiVerify.js";
