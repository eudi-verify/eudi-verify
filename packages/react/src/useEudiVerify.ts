/**
 * @eudi-verify/react - useEudiVerify Hook
 *
 * Headless hook for custom UI implementations.
 * Exposes the client state machine directly without the widget UI.
 */

import { useEffect, useRef, useState } from "react";
import {
  createVerification,
  type Verification,
  type VerificationRequest,
  type VerificationState,
} from "@eudi-verify/client";

export interface UseEudiVerifyConfig {
  /** Base URL of the EUDI Verifier API */
  apiUrl: string;
}

export interface UseEudiVerifyReturn {
  /** Current verification state */
  state: VerificationState;
  /** Start a new verification flow */
  start: (request: VerificationRequest) => Promise<void>;
  /** Cancel the current verification */
  cancel: () => Promise<void>;
}

/**
 * Headless hook for EUDI Wallet verification.
 *
 * Use this hook when building custom UI instead of using the
 * pre-built <EudiVerify> component.
 *
 * @example
 * ```tsx
 * function CustomVerificationUI() {
 *   const { state, start } = useEudiVerify({
 *     apiUrl: '/api/eudi'
 *   });
 *
 *   useEffect(() => {
 *     if (state.status === 'verified') {
 *       console.log('Token:', state.token);
 *     }
 *   }, [state]);
 *
 *   return (
 *     <div>
 *       {state.status === 'idle' && (
 *         <button onClick={() => start({ age_over_18: true })}>
 *           Verify Age
 *         </button>
 *       )}
 *       {state.status === 'showQR' && (
 *         <img src={state.qrDataUrl} alt="QR Code" />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEudiVerify(
  config: UseEudiVerifyConfig,
): UseEudiVerifyReturn {
  const [state, setState] = useState<VerificationState>({ status: "idle" });
  const verificationRef = useRef<Verification | null>(null);

  useEffect(() => {
    const verification = createVerification({ apiUrl: config.apiUrl });
    verificationRef.current = verification;

    const unsubscribe = verification.subscribe(setState);

    return () => {
      unsubscribe();
      verification.destroy();
      verificationRef.current = null;
    };
  }, [config.apiUrl]);

  return {
    state,
    start: (request: VerificationRequest) =>
      verificationRef.current?.start(request) ?? Promise.resolve(),
    cancel: () => verificationRef.current?.cancel() ?? Promise.resolve(),
  };
}
