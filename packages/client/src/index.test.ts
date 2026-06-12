import { describe, it, expect } from 'vitest';
import {
  VERSION,
  createVerification,
  createApiClient,
  createPoller,
  generateQRSvg,
  generateQRDataUrl,
  isTerminalStatus,
  TERMINAL_STATUSES,
  EudiClientError,
  NetworkError,
  ApiResponseError,
  SessionNotFoundError,
  RateLimitError,
  VerificationCancelledError,
  SessionExpiredError,
} from './index.js';

describe('@eudi-verify/client', () => {
  describe('exports', () => {
    it('exports VERSION', () => {
      expect(VERSION).toBe('0.0.0');
    });

    it('exports createVerification', () => {
      expect(createVerification).toBeTypeOf('function');
    });

    it('exports createApiClient', () => {
      expect(createApiClient).toBeTypeOf('function');
    });

    it('exports createPoller', () => {
      expect(createPoller).toBeTypeOf('function');
    });

    it('exports QR functions', () => {
      expect(generateQRSvg).toBeTypeOf('function');
      expect(generateQRDataUrl).toBeTypeOf('function');
    });

    it('exports type utilities', () => {
      expect(isTerminalStatus).toBeTypeOf('function');
      expect(TERMINAL_STATUSES).toBeInstanceOf(Array);
    });

    it('exports error classes', () => {
      expect(EudiClientError).toBeTypeOf('function');
      expect(NetworkError).toBeTypeOf('function');
      expect(ApiResponseError).toBeTypeOf('function');
      expect(SessionNotFoundError).toBeTypeOf('function');
      expect(RateLimitError).toBeTypeOf('function');
      expect(VerificationCancelledError).toBeTypeOf('function');
      expect(SessionExpiredError).toBeTypeOf('function');
    });
  });

  describe('isTerminalStatus', () => {
    it('returns true for terminal statuses', () => {
      expect(isTerminalStatus('verified')).toBe(true);
      expect(isTerminalStatus('rejected')).toBe(true);
      expect(isTerminalStatus('expired')).toBe(true);
      expect(isTerminalStatus('cancelled')).toBe(true);
      expect(isTerminalStatus('error')).toBe(true);
    });

    it('returns false for non-terminal statuses', () => {
      expect(isTerminalStatus('pending')).toBe(false);
      expect(isTerminalStatus('waiting_for_wallet')).toBe(false);
    });
  });

  describe('TERMINAL_STATUSES', () => {
    it('contains all terminal statuses', () => {
      expect(TERMINAL_STATUSES).toContain('verified');
      expect(TERMINAL_STATUSES).toContain('rejected');
      expect(TERMINAL_STATUSES).toContain('expired');
      expect(TERMINAL_STATUSES).toContain('cancelled');
      expect(TERMINAL_STATUSES).toContain('error');
    });

    it('is readonly', () => {
      expect(Object.isFrozen(TERMINAL_STATUSES)).toBe(true);
    });
  });

  describe('error classes', () => {
    it('EudiClientError is an Error', () => {
      const error = new EudiClientError('test');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('EudiClientError');
    });

    it('NetworkError includes cause', () => {
      const cause = new Error('original');
      const error = new NetworkError('test', cause);
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('NetworkError');
    });

    it('ApiResponseError includes status and error code', () => {
      const error = new ApiResponseError(400, {
        error: 'validation_error',
        message: 'Invalid input',
      });
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('validation_error');
      expect(error.message).toBe('Invalid input');
    });

    it('SessionNotFoundError includes session ID', () => {
      const error = new SessionNotFoundError('abc-123');
      expect(error.sessionId).toBe('abc-123');
      expect(error.statusCode).toBe(404);
    });

    it('RateLimitError includes retry-after', () => {
      const error = new RateLimitError(60000);
      expect(error.retryAfterMs).toBe(60000);
      expect(error.statusCode).toBe(429);
    });
  });
});
