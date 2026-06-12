import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiClient } from './api.js';
import {
  NetworkError,
  ApiResponseError,
  SessionNotFoundError,
  RateLimitError,
} from './errors.js';
import type { Session, VerificationRequest } from './types.js';

function createMockFetch(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  let callIndex = 0;
  return vi.fn(async () => {
    const response = responses[callIndex++];
    if (!response) throw new Error('No more mock responses');

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.body,
      headers: new Headers(response.headers),
    } as Response;
  });
}

describe('createApiClient', () => {
  const baseUrl = 'https://api.example.com';

  describe('createSession', () => {
    it('creates a session successfully', async () => {
      const mockSession: Session = {
        id: 'session-123',
        status: 'pending',
        qrUrl: 'openid4vp://verify?request_uri=...',
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-01T00:05:00Z',
      };

      const mockFetch = createMockFetch([{ status: 201, body: mockSession }]);
      const client = createApiClient({ baseUrl, fetch: mockFetch });

      const request: VerificationRequest = { age_over_18: true };
      const result = await client.createSession(request);

      expect(result).toEqual(mockSession);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ request }),
        }),
      );
    });

    it('handles rate limiting', async () => {
      const mockFetch = createMockFetch([
        {
          status: 429,
          body: { error: 'rate_limit', message: 'Too many requests' },
          headers: { 'Retry-After': '60' },
        },
      ]);
      const client = createApiClient({ baseUrl, fetch: mockFetch });

      await expect(client.createSession({ age_over_18: true })).rejects.toThrow(
        RateLimitError,
      );
    });

    it('handles validation errors', async () => {
      const mockFetch = createMockFetch([
        {
          status: 400,
          body: { error: 'validation_error', message: 'Invalid request' },
        },
      ]);
      const client = createApiClient({ baseUrl, fetch: mockFetch });

      await expect(client.createSession({} as VerificationRequest)).rejects.toThrow(
        ApiResponseError,
      );
    });
  });

  describe('getSession', () => {
    it('retrieves a session successfully', async () => {
      const mockSession: Session = {
        id: 'session-123',
        status: 'waiting_for_wallet',
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-01T00:05:00Z',
      };

      const mockFetch = createMockFetch([{ status: 200, body: mockSession }]);
      const client = createApiClient({ baseUrl, fetch: mockFetch });

      const result = await client.getSession('session-123');

      expect(result).toEqual(mockSession);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/sessions/session-123',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('throws SessionNotFoundError for 404', async () => {
      const mockFetch = createMockFetch([
        {
          status: 404,
          body: { error: 'not_found', message: 'Session not found' },
        },
      ]);
      const client = createApiClient({ baseUrl, fetch: mockFetch });

      const error = await client.getSession('nonexistent').catch((e) => e);
      expect(error).toBeInstanceOf(SessionNotFoundError);
      expect((error as SessionNotFoundError).sessionId).toBe('nonexistent');
    });

    it('encodes session ID in URL', async () => {
      const mockFetch = createMockFetch([
        {
          status: 200,
          body: {
            id: 'id/with/slashes',
            status: 'pending',
            createdAt: '2024-01-01T00:00:00Z',
            expiresAt: '2024-01-01T00:05:00Z',
          },
        },
      ]);
      const client = createApiClient({ baseUrl, fetch: mockFetch });

      await client.getSession('id/with/slashes');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/sessions/id%2Fwith%2Fslashes',
        expect.any(Object),
      );
    });
  });

  describe('cancelSession', () => {
    it('cancels a session successfully', async () => {
      const mockSession: Session = {
        id: 'session-123',
        status: 'cancelled',
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-01T00:05:00Z',
      };

      const mockFetch = createMockFetch([{ status: 200, body: mockSession }]);
      const client = createApiClient({ baseUrl, fetch: mockFetch });

      const result = await client.cancelSession('session-123');

      expect(result.status).toBe('cancelled');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/sessions/session-123/cancel',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('error handling', () => {
    it('handles network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network failed'));
      const client = createApiClient({ baseUrl, fetch: mockFetch });

      await expect(client.getSession('test')).rejects.toThrow(NetworkError);
    });

    it('handles timeout', async () => {
      const mockFetch = vi.fn().mockRejectedValue(
        Object.assign(new Error('Aborted'), { name: 'AbortError' }),
      );
      const client = createApiClient({ baseUrl, fetch: mockFetch, timeoutMs: 100 });

      const error = await client.getSession('test').catch((e) => e);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toContain('timeout');
    });

    it('handles non-JSON error responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON');
        },
        headers: new Headers(),
      });
      const client = createApiClient({ baseUrl, fetch: mockFetch });

      const error = await client.getSession('test').catch((e) => e);
      expect(error).toBeInstanceOf(ApiResponseError);
      expect(error.message).toBe('HTTP 500');
    });

    it('normalizes base URL trailing slash', async () => {
      const mockFetch = createMockFetch([
        {
          status: 200,
          body: {
            id: 'test',
            status: 'pending',
            createdAt: '2024-01-01T00:00:00Z',
            expiresAt: '2024-01-01T00:05:00Z',
          },
        },
      ]);
      const client = createApiClient({
        baseUrl: 'https://api.example.com/',
        fetch: mockFetch,
      });

      await client.getSession('test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/sessions/test',
        expect.any(Object),
      );
    });
  });
});
