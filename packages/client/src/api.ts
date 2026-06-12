/**
 * @eudi-verify/client - API Client
 *
 * Typed HTTP client for the EUDI Verifier API using native fetch.
 */

import type { Session, VerificationRequest, ApiError } from './types.js';
import {
  ApiResponseError,
  NetworkError,
  SessionNotFoundError,
  RateLimitError,
} from './errors.js';

/**
 * Configuration for the API client.
 */
export interface ApiClientConfig {
  /** Base URL of the EUDI Verifier API */
  baseUrl: string;
  /** Optional fetch implementation (for testing) */
  fetch?: typeof fetch;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Typed API client interface.
 */
export interface EudiApiClient {
  /** Create a new verification session */
  createSession(request: VerificationRequest): Promise<Session>;
  /** Get the current state of a session */
  getSession(sessionId: string): Promise<Session>;
  /** Cancel a pending session */
  cancelSession(sessionId: string): Promise<Session>;
}

/**
 * Create a typed API client for the EUDI Verifier API.
 */
export function createApiClient(config: ApiClientConfig): EudiApiClient {
  const { baseUrl, timeoutMs = 30_000 } = config;
  const fetchFn = config.fetch ?? fetch;

  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${normalizedBaseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await handleErrorResponse(response, path);
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiResponseError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError(`Request timeout after ${timeoutMs}ms`);
        }
        throw new NetworkError(`Network request failed: ${error.message}`, error);
      }

      throw new NetworkError('Unknown network error');
    }
  }

  async function handleErrorResponse(
    response: Response,
    path: string,
  ): Promise<never> {
    const { status } = response;

    if (status === 404) {
      const sessionIdMatch = path.match(/\/sessions\/([^/]+)/);
      if (sessionIdMatch) {
        throw new SessionNotFoundError(sessionIdMatch[1]);
      }
    }

    if (status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
      throw new RateLimitError(retryAfterMs);
    }

    let errorBody: ApiError;
    try {
      errorBody = (await response.json()) as ApiError;
    } catch {
      errorBody = {
        error: 'unknown_error',
        message: `HTTP ${status}`,
      };
    }

    throw new ApiResponseError(status, errorBody);
  }

  return {
    async createSession(verificationRequest: VerificationRequest): Promise<Session> {
      return request<Session>('POST', '/sessions', { request: verificationRequest });
    },

    async getSession(sessionId: string): Promise<Session> {
      return request<Session>('GET', `/sessions/${encodeURIComponent(sessionId)}`);
    },

    async cancelSession(sessionId: string): Promise<Session> {
      return request<Session>(
        'POST',
        `/sessions/${encodeURIComponent(sessionId)}/cancel`,
      );
    },
  };
}
