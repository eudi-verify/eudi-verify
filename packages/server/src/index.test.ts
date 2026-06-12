import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  VERSION,
  MockEngine,
  OpenEudiEngine,
  MemoryKVStore,
  isTerminalStatus,
  sessionToDTO,
  sessionKey,
  tokenKey,
  TOKEN_VERSION,
  DEFAULT_SESSION_TTL_MS,
  createTokenService,
  createRateLimiter,
  createVerifierHandlers,
  type Session,
  type VerificationRequest,
  type TokenService,
  type RateLimiter,
  type VerifierHandlers,
  type RequestContext,
} from './index.js';

describe('@eudi-verify/server', () => {
  it('exports a VERSION constant', () => {
    expect(VERSION).toBe('0.1.0');
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

describe('TokenService', () => {
  let store: MemoryKVStore;
  let tokenService: TokenService;
  const TEST_SECRET = 'this-is-a-test-secret-that-is-long-enough-32chars';

  beforeEach(() => {
    store = new MemoryKVStore(0);
    tokenService = createTokenService({
      secret: TEST_SECRET,
      store,
      ttlMs: 60_000,
    });
  });

  afterEach(() => {
    store.dispose();
  });

  describe('mint', () => {
    it('creates a token with correct format', async () => {
      const token = await tokenService.mint('session-123', { age_over_18: true });

      expect(token).toMatch(/^eudi_v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    it('creates unique tokens for same session', async () => {
      const token1 = await tokenService.mint('session-123', { age_over_18: true });
      const token2 = await tokenService.mint('session-123', { age_over_18: true });

      expect(token1).not.toBe(token2);
    });
  });

  describe('verify', () => {
    it('verifies valid token and returns claims', async () => {
      const claims = { age_over_18: true, nationality: 'LU' };
      const token = await tokenService.mint('session-123', claims);

      const result = await tokenService.verify(token);

      expect(result.valid).toBe(true);
      expect(result.claims).toEqual(claims);
    });

    it('rejects malformed tokens', async () => {
      const result = await tokenService.verify('not-a-valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_token');
    });

    it('rejects tokens with wrong version', async () => {
      const result = await tokenService.verify('eudi_v2.abc.xyz');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_token');
    });

    it('rejects tokens with invalid signature (forgery)', async () => {
      const token = await tokenService.mint('session-123', { age_over_18: true });
      const parts = token.split('.');
      const forgedToken = `${parts[0]}.${parts[1]}.forged-signature`;

      const result = await tokenService.verify(forgedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_signature');
    });

    it('rejects modified payload (integrity check)', async () => {
      const token = await tokenService.mint('session-123', { age_over_18: true });
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.sid = 'different-session';
      const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const modifiedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

      const result = await tokenService.verify(modifiedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_signature');
    });

    it('rejects replay (single-use token)', async () => {
      const token = await tokenService.mint('session-123', { age_over_18: true });

      const result1 = await tokenService.verify(token);
      expect(result1.valid).toBe(true);

      const result2 = await tokenService.verify(token);
      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('already_consumed');
    });

    it('rejects expired tokens', async () => {
      const shortLivedService = createTokenService({
        secret: TEST_SECRET,
        store,
        ttlMs: 1000,
      });

      const token = await shortLivedService.mint('session-123', { age_over_18: true });
      await new Promise((r) => setTimeout(r, 1500));

      const result = await shortLivedService.verify(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('expired');
    });
  });

  describe('secret validation', () => {
    it('throws if secret is too short', () => {
      expect(() =>
        createTokenService({
          secret: 'too-short',
          store,
        })
      ).toThrow('Token secret must be at least 32 characters');
    });
  });
});

describe('RateLimiter', () => {
  let store: MemoryKVStore;
  let limiter: RateLimiter;

  beforeEach(() => {
    store = new MemoryKVStore(0);
    limiter = createRateLimiter({
      maxRequests: 3,
      windowMs: 1000,
      store,
    });
  });

  afterEach(() => {
    store.dispose();
  });

  describe('checkAndConsume', () => {
    it('allows requests under limit', async () => {
      const result1 = await limiter.checkAndConsume('192.168.1.1');
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = await limiter.checkAndConsume('192.168.1.1');
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = await limiter.checkAndConsume('192.168.1.1');
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('blocks requests over limit', async () => {
      await limiter.checkAndConsume('192.168.1.1');
      await limiter.checkAndConsume('192.168.1.1');
      await limiter.checkAndConsume('192.168.1.1');

      const result = await limiter.checkAndConsume('192.168.1.1');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('tracks IPs separately', async () => {
      await limiter.checkAndConsume('192.168.1.1');
      await limiter.checkAndConsume('192.168.1.1');
      await limiter.checkAndConsume('192.168.1.1');

      const result = await limiter.checkAndConsume('192.168.1.2');

      expect(result.allowed).toBe(true);
    });

    it('resets after window expires', async () => {
      await limiter.checkAndConsume('192.168.1.1');
      await limiter.checkAndConsume('192.168.1.1');
      await limiter.checkAndConsume('192.168.1.1');

      await new Promise((r) => setTimeout(r, 1100));

      const result = await limiter.checkAndConsume('192.168.1.1');

      expect(result.allowed).toBe(true);
    });
  });

  describe('check', () => {
    it('does not consume a request slot', async () => {
      const check1 = await limiter.check('192.168.1.1');
      const check2 = await limiter.check('192.168.1.1');

      expect(check1.remaining).toBe(3);
      expect(check2.remaining).toBe(3);
    });
  });
});

describe('Handlers', () => {
  let store: MemoryKVStore;
  let handlers: VerifierHandlers;

  const TEST_SECRET = 'this-is-a-test-secret-that-is-long-enough-32chars';

  beforeEach(() => {
    store = new MemoryKVStore(0);
    const engine = new MockEngine({ verificationDelayMs: 0, successRate: 1.0 });

    handlers = createVerifierHandlers({
      engine,
      store,
      baseUrl: 'https://example.com/api/eudi',
      mode: 'demo',
      tokenSecret: TEST_SECRET,
      rateLimit: { maxRequests: 10, windowMs: 60_000 },
    });
  });

  afterEach(() => {
    store.dispose();
  });

  function makeContext(overrides: Partial<RequestContext> = {}): RequestContext {
    return {
      ip: '127.0.0.1',
      origin: 'https://example.com',
      params: {},
      body: undefined,
      rawBody: undefined,
      ...overrides,
    };
  }

  describe('createSession', () => {
    it('creates a session with valid request', async () => {
      const ctx = makeContext({
        body: { request: { age_over_18: true } },
      });

      const response = await handlers.createSession(ctx);

      expect(response.status).toBe(201);
      expect(response.headers['X-Eudi-Mode']).toBe('demo');
      expect((response.body as any).id).toBeDefined();
      expect((response.body as any).status).toBe('pending');
      expect((response.body as any).qrUrl).toBeDefined();
    });

    it('rejects invalid request body', async () => {
      const ctx = makeContext({ body: {} });

      const response = await handlers.createSession(ctx);

      expect(response.status).toBe(400);
      expect((response.body as any).error).toBe('bad_request');
    });
  });

  describe('getSession', () => {
    it('returns existing session', async () => {
      const createCtx = makeContext({
        body: { request: { age_over_18: true } },
      });
      const createResponse = await handlers.createSession(createCtx);
      const sessionId = (createResponse.body as any).id;

      const getCtx = makeContext({ params: { sessionId } });
      const getResponse = await handlers.getSession(getCtx);

      expect(getResponse.status).toBe(200);
      expect((getResponse.body as any).id).toBe(sessionId);
    });

    it('returns 404 for non-existent session', async () => {
      const ctx = makeContext({ params: { sessionId: 'non-existent' } });

      const response = await handlers.getSession(ctx);

      expect(response.status).toBe(404);
      expect((response.body as any).error).toBe('not_found');
    });
  });

  describe('cancelSession', () => {
    it('cancels an active session', async () => {
      const createCtx = makeContext({
        body: { request: { age_over_18: true } },
      });
      const createResponse = await handlers.createSession(createCtx);
      const sessionId = (createResponse.body as any).id;

      const cancelCtx = makeContext({ params: { sessionId } });
      const cancelResponse = await handlers.cancelSession(cancelCtx);

      expect(cancelResponse.status).toBe(200);
      expect((cancelResponse.body as any).status).toBe('cancelled');
    });

    it('returns 409 for already terminal session', async () => {
      const createCtx = makeContext({
        body: { request: { age_over_18: true } },
      });
      const createResponse = await handlers.createSession(createCtx);
      const sessionId = (createResponse.body as any).id;

      await handlers.cancelSession(makeContext({ params: { sessionId } }));

      const secondCancel = await handlers.cancelSession(
        makeContext({ params: { sessionId } })
      );

      expect(secondCancel.status).toBe(409);
    });
  });

  describe('verifyToken', () => {
    it('verifies valid token from callback flow', async () => {
      const createCtx = makeContext({
        body: { request: { age_over_18: true } },
      });
      const createResponse = await handlers.createSession(createCtx);
      const sessionId = (createResponse.body as any).id;

      const callbackCtx = makeContext({
        rawBody: `response=mock-vp&session_id=${sessionId}`,
      });
      await handlers.handleCallback(callbackCtx);

      const getResponse = await handlers.getSession(
        makeContext({ params: { sessionId } })
      );
      const token = (getResponse.body as any).token;

      expect(token).toBeDefined();

      const verifyCtx = makeContext({ body: { token } });
      const verifyResponse = await handlers.verifyToken(verifyCtx);

      expect(verifyResponse.status).toBe(200);
      expect((verifyResponse.body as any).valid).toBe(true);
      expect((verifyResponse.body as any).claims).toBeDefined();
    });

    it('rejects invalid token', async () => {
      const ctx = makeContext({ body: { token: 'invalid-token' } });

      const response = await handlers.verifyToken(ctx);

      expect(response.status).toBe(200);
      expect((response.body as any).valid).toBe(false);
      expect((response.body as any).error).toBe('invalid_token');
    });
  });

  describe('rate limiting', () => {
    it('rate limits after threshold', async () => {
      const limitedHandlers = createVerifierHandlers({
        engine: new MockEngine({ verificationDelayMs: 0, successRate: 1.0 }),
        store,
        baseUrl: 'https://example.com/api/eudi',
        mode: 'demo',
        tokenSecret: TEST_SECRET,
        rateLimit: { maxRequests: 2, windowMs: 60_000 },
      });

      const ctx = makeContext({ body: { request: { age_over_18: true } } });

      await limitedHandlers.createSession(ctx);
      await limitedHandlers.createSession(ctx);
      const response = await limitedHandlers.createSession(ctx);

      expect(response.status).toBe(429);
      expect(response.headers['Retry-After']).toBeDefined();
    });
  });
});

describe('OpenEudiEngine', () => {
  let engine: InstanceType<typeof OpenEudiEngine>;

  beforeEach(() => {
    engine = new OpenEudiEngine({
      mode: 'demo',
      baseUrl: 'https://example.com/api/eudi',
      demoDelayMs: 0,
    });
  });

  it('has correct name and mode', () => {
    expect(engine.name).toBe('openeudi');
    expect(engine.mode).toBe('demo');
  });

  describe('createSession', () => {
    it('generates OpenID4VP authorization URL', async () => {
      const result = await engine.createSession({
        sessionId: 'test-session-123',
        request: { age_over_18: true },
        baseUrl: 'https://example.com/api/eudi',
        ttlMs: 300000,
      });

      expect(result.qrUrl).toContain('openid4vp://');
      expect(result.qrUrl).toContain('test-session-123');
      expect(result.engineData).toBeDefined();
    });
  });

  describe('handleCallback (demo mode)', () => {
    it('returns verified claims', async () => {
      const session: Session = {
        id: 'test-123',
        status: 'pending',
        request: { age_over_18: true, nationality: true },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
        _engineData: { nonce: 'test-nonce', requestedClaims: ['age_over_18', 'nationality'] },
      };

      const result = await engine.handleCallback(
        { sessionId: 'test-123', response: 'mock-vp' },
        session
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.claims?.age_over_18).toBe(true);
      expect(result.claims?.nationality).toBe('LU');
    });
  });

  describe('getAuthorizationRequest', () => {
    it('returns authorization request JSON', async () => {
      const session: Session = {
        id: 'test-123',
        status: 'pending',
        request: { age_over_18: true },
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      const request = await engine.getAuthorizationRequest(session);
      const parsed = JSON.parse(request);

      expect(parsed.type).toBe('authorization_request');
      expect(parsed.response_type).toBe('vp_token');
      expect(parsed.state).toBe('test-123');
      expect(parsed.presentation_definition).toBeDefined();
    });
  });
});

describe('Engine swappability', () => {
  it('handlers work with MockEngine', async () => {
    const store = new MemoryKVStore(0);
    const handlers = createVerifierHandlers({
      engine: new MockEngine({ verificationDelayMs: 0 }),
      store,
      baseUrl: 'https://example.com/api/eudi',
      mode: 'demo',
      tokenSecret: 'this-is-a-test-secret-that-is-long-enough-32chars',
    });

    const ctx: RequestContext = {
      ip: '127.0.0.1',
      params: {},
      body: { request: { age_over_18: true } },
    };

    const response = await handlers.createSession(ctx);
    expect(response.status).toBe(201);

    store.dispose();
  });

  it('handlers work with OpenEudiEngine', async () => {
    const store = new MemoryKVStore(0);
    const handlers = createVerifierHandlers({
      engine: new OpenEudiEngine({ mode: 'demo', baseUrl: 'https://example.com/api/eudi' }),
      store,
      baseUrl: 'https://example.com/api/eudi',
      mode: 'demo',
      tokenSecret: 'this-is-a-test-secret-that-is-long-enough-32chars',
    });

    const ctx: RequestContext = {
      ip: '127.0.0.1',
      params: {},
      body: { request: { age_over_18: true } },
    };

    const response = await handlers.createSession(ctx);
    expect(response.status).toBe(201);
    expect((response.body as any).qrUrl).toContain('openid4vp://');

    store.dispose();
  });
});
