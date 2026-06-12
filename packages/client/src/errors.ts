/**
 * @eudi-verify/client - Error Types
 */

import type { ApiError } from './types.js';

/**
 * Base error class for EUDI client errors.
 */
export class EudiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EudiClientError';
  }
}

/**
 * Network error (fetch failed, timeout, etc.)
 */
export class NetworkError extends EudiClientError {
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/**
 * API returned an error response.
 */
export class ApiResponseError extends EudiClientError {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly details?: Record<string, unknown>;

  constructor(statusCode: number, response: ApiError) {
    super(response.message);
    this.name = 'ApiResponseError';
    this.statusCode = statusCode;
    this.errorCode = response.error;
    this.details = response.details;
  }
}

/**
 * Session not found (404).
 */
export class SessionNotFoundError extends ApiResponseError {
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(404, { error: 'not_found', message: `Session ${sessionId} not found` });
    this.name = 'SessionNotFoundError';
    this.sessionId = sessionId;
  }
}

/**
 * Rate limit exceeded (429).
 */
export class RateLimitError extends ApiResponseError {
  readonly retryAfterMs?: number;

  constructor(retryAfterMs?: number) {
    super(429, { error: 'rate_limit', message: 'Rate limit exceeded' });
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Verification was cancelled.
 */
export class VerificationCancelledError extends EudiClientError {
  constructor() {
    super('Verification was cancelled');
    this.name = 'VerificationCancelledError';
  }
}

/**
 * Session expired.
 */
export class SessionExpiredError extends EudiClientError {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}
