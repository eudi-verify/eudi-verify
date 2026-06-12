/**
 * @eudi-verify/client
 *
 * Vanilla TypeScript client for EUDI Wallet verification flows.
 * Zero framework dependencies.
 *
 * @example
 * ```ts
 * import { createVerification } from '@eudi-verify/client';
 *
 * const verification = createVerification({
 *   apiUrl: 'https://api.example.com',
 * });
 *
 * verification.subscribe((state) => {
 *   if (state.status === 'showQR') {
 *     // Display state.qrDataUrl
 *   } else if (state.status === 'verified') {
 *     // Use state.token for server-side verification
 *   }
 * });
 *
 * await verification.start({ age_over_18: true });
 * ```
 */

export const VERSION = '0.0.0';

export {
  createVerification,
  type Verification,
  type VerificationConfig,
  type VerificationState,
  type StateCallback,
} from './verification.js';

export {
  createApiClient,
  type EudiApiClient,
  type ApiClientConfig,
} from './api.js';

export { createPoller, type Poller, type PollingConfig } from './polling.js';

export {
  generateQRSvg,
  generateQRDataUrl,
  type QRCodeOptions,
} from './qr.js';

export type {
  VerificationRequest,
  SessionStatus,
  VerifiedClaims,
  Session,
  ApiError,
} from './types.js';

export { isTerminalStatus, TERMINAL_STATUSES } from './types.js';

export {
  EudiClientError,
  NetworkError,
  ApiResponseError,
  SessionNotFoundError,
  RateLimitError,
  VerificationCancelledError,
  SessionExpiredError,
} from './errors.js';
