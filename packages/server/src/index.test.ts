import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  VERSION,
  MockEngine,
  MemoryKVStore,
  isTerminalStatus,
  sessionToDTO,
  sessionKey,
  tokenKey,
  TOKEN_VERSION,
  DEFAULT_SESSION_TTL_MS,
  type Session,
  type VerificationRequest,
} from './index.js';

describe('@eudi-verify/server', () => {
  it('exports a VERSION constant', () => {
    expect(VERSION).toBe('0.0.0');
  });
});

describe('Types', () => {
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

  describe('sessionToDTO', () => {
    it('converts session to DTO with ISO dates', () => {
      const session: Session = {
        id: 'test-123',
        status: 'pending',
        request: { age_over_18: true },
        qrUrl: 'https://example.com/qr',
        createdAt: new Date('2024-01-01T12:00:00Z'),
        expiresAt: new Date('2024-01-01T12:05:00Z'),
      };

      const dto = sessionToDTO(session);

      expect(dto.id).toBe('test-123');
      expect(dto.status).toBe('pending');
      expect(dto.qrUrl).toBe('https://example.com/qr');
      expect(dto.createdAt).toBe('2024-01-01T12:00:00.000Z');
      expect(dto.expiresAt).toBe('2024-01-01T12:05:00.000Z');
    });

    it('omits undefined optional fields', () => {
      const session: Session = {
        id: 'test-123',
        status: 'pending',
        request: { age_over_18: true },
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      const dto = sessionToDTO(session);

      expect(dto).not.toHaveProperty('qrUrl');
      expect(dto).not.toHaveProperty('token');
      expect(dto).not.toHaveProperty('claims');
      expect(dto).not.toHaveProperty('error');
    });

    it('includes token and claims when verified', () => {
      const session: Session = {
        id: 'test-123',
        status: 'verified',
        request: { age_over_18: true },
        token: 'eudi_v1.abc.xyz',
        claims: { age_over_18: true },
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      const dto = sessionToDTO(session);

      expect(dto.token).toBe('eudi_v1.abc.xyz');
      expect(dto.claims).toEqual({ age_over_18: true });
    });
  });

  describe('constants', () => {
    it('exports TOKEN_VERSION', () => {
      expect(TOKEN_VERSION).toBe('eudi_v1');
    });

    it('exports DEFAULT_SESSION_TTL_MS as 5 minutes', () => {
      expect(DEFAULT_SESSION_TTL_MS).toBe(5 * 60 * 1000);
    });
  });

  describe('key helpers', () => {
    it('builds session key', () => {
      expect(sessionKey('abc123')).toBe('session:abc123');
    });

    it('builds token key', () => {
      expect(tokenKey('xyz789')).toBe('token:xyz789');
    });
  });
});

describe('MemoryKVStore', () => {
  let store: MemoryKVStore;

  beforeEach(() => {
    store = new MemoryKVStore(0); // Disable cleanup interval for tests
  });

  afterEach(() => {
    store.dispose();
  });

  it('sets and gets values', async () => {
    await store.set('key1', { foo: 'bar' });
    const value = await store.get<{ foo: string }>('key1');
    expect(value).toEqual({ foo: 'bar' });
  });

  it('returns undefined for missing keys', async () => {
    const value = await store.get('nonexistent');
    expect(value).toBeUndefined();
  });

  it('deletes keys', async () => {
    await store.set('key1', 'value');
    const deleted = await store.delete('key1');
    expect(deleted).toBe(true);
    expect(await store.get('key1')).toBeUndefined();
  });

  it('returns false when deleting nonexistent key', async () => {
    const deleted = await store.delete('nonexistent');
    expect(deleted).toBe(false);
  });

  it('checks key existence', async () => {
    await store.set('key1', 'value');
    expect(await store.has('key1')).toBe(true);
    expect(await store.has('nonexistent')).toBe(false);
  });

  it('respects TTL', async () => {
    await store.set('key1', 'value', 10); // 10ms TTL
    expect(await store.get('key1')).toBe('value');

    await new Promise((r) => setTimeout(r, 20));
    expect(await store.get('key1')).toBeUndefined();
  });

  it('atomically gets and deletes', async () => {
    await store.set('key1', 'value');

    const value1 = await store.getAndDelete<string>('key1');
    expect(value1).toBe('value');

    const value2 = await store.getAndDelete<string>('key1');
    expect(value2).toBeUndefined();
  });

  it('clears all keys', async () => {
    await store.set('key1', 'value1');
    await store.set('key2', 'value2');
    await store.clear();

    expect(await store.get('key1')).toBeUndefined();
    expect(await store.get('key2')).toBeUndefined();
    expect(store.size).toBe(0);
  });
});

describe('MockEngine', () => {
  let engine: MockEngine;

  beforeEach(() => {
    engine = new MockEngine({
      verificationDelayMs: 0, // No delay for tests
      successRate: 1.0,
    });
  });

  it('has correct name and mode', () => {
    expect(engine.name).toBe('mock');
    expect(engine.mode).toBe('demo');
  });

  describe('createSession', () => {
    it('generates QR URL with session info', async () => {
      const result = await engine.createSession({
        sessionId: 'test-session-123',
        request: { age_over_18: true, nationality: true },
        baseUrl: 'https://example.com/api/eudi',
        ttlMs: 300000,
      });

      expect(result.qrUrl).toContain('test-session-123');
      expect(result.qrUrl).toContain('age_over_18');
      expect(result.qrUrl).toContain('nationality');
      expect(result.qrUrl).toContain('mock=true');
    });

    it('stores requested claims in engineData', async () => {
      const result = await engine.createSession({
        sessionId: 'test-session',
        request: { age_over_18: true },
        baseUrl: 'https://example.com',
        ttlMs: 300000,
      });

      expect(result.engineData).toBeDefined();
      expect((result.engineData as any).requestedClaims).toContain('age_over_18');
    });
  });

  describe('parseCallback', () => {
    it('parses form-encoded callback', async () => {
      const rawBody = 'response=test-vp-token&session_id=abc123';
      const data = await engine.parseCallback(rawBody);

      expect(data.sessionId).toBe('abc123');
      expect(data.response).toBe('test-vp-token');
    });

    it('uses state as fallback for session_id', async () => {
      const rawBody = 'response=test-vp-token&state=xyz789';
      const data = await engine.parseCallback(rawBody);

      expect(data.sessionId).toBe('xyz789');
    });

    it('throws on missing response', async () => {
      await expect(engine.parseCallback('session_id=abc')).rejects.toThrow(
        'Invalid callback'
      );
    });

    it('throws on missing session_id', async () => {
      await expect(engine.parseCallback('response=token')).rejects.toThrow(
        'Invalid callback'
      );
    });
  });

  describe('handleCallback', () => {
    const mockSession: Session = {
      id: 'test-123',
      status: 'pending',
      request: { age_over_18: true, nationality: true },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000),
    };

    it('returns verified status with claims on success', async () => {
      const result = await engine.handleCallback(
        { sessionId: 'test-123', response: 'mock-vp' },
        mockSession
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.claims).toBeDefined();
      expect(result.claims!.age_over_18).toBe(true);
      expect(result.claims!.nationality).toBe('LU');
    });

    it('generates claims based on request', async () => {
      const session: Session = {
        ...mockSession,
        request: { given_name: true, family_name: true, birth_date: true },
      };

      const result = await engine.handleCallback(
        { sessionId: 'test-123', response: 'mock-vp' },
        session
      );

      expect(result.claims).toEqual(
        expect.objectContaining({
          given_name: 'Max',
          family_name: 'Mustermann',
          birth_date: '1990-01-15',
        })
      );
    });

    it('can simulate failure with low success rate', async () => {
      const failEngine = new MockEngine({
        verificationDelayMs: 0,
        successRate: 0, // Always fail
      });

      const result = await failEngine.handleCallback(
        { sessionId: 'test-123', response: 'mock-vp' },
        mockSession
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('rejected');
      expect(result.error).toBeDefined();
    });
  });

  describe('getAuthorizationRequest', () => {
    it('returns mock authorization request JSON', async () => {
      const session: Session = {
        id: 'test-123',
        status: 'pending',
        request: { age_over_18: true },
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      const request = await engine.getAuthorizationRequest(session);
      const parsed = JSON.parse(request);

      expect(parsed.type).toBe('mock_authorization_request');
      expect(parsed.sessionId).toBe('test-123');
      expect(parsed.request).toEqual({ age_over_18: true });
    });
  });

  describe('custom default claims', () => {
    it('merges default claims with request', async () => {
      const customEngine = new MockEngine({
        verificationDelayMs: 0,
        defaultClaims: { custom_claim: 'custom_value' },
      });

      const session: Session = {
        id: 'test-123',
        status: 'pending',
        request: { age_over_18: true },
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      const result = await customEngine.handleCallback(
        { sessionId: 'test-123', response: 'mock-vp' },
        session
      );

      expect(result.claims).toEqual(
        expect.objectContaining({
          age_over_18: true,
          custom_claim: 'custom_value',
        })
      );
    });
  });
});
