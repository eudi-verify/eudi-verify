/**
 * Security regression tests for the callback replay guard + trust-level
 * integrity (see THREAT_MODEL.md). Split from index.test.ts to keep these
 * merge-blocking security assertions easy to find and run in isolation.
 */
import { describe, it, expect, vi } from "vitest";
import { MockEngine } from "./engine.js";
import { MemoryKVStore } from "./store.js";
import { createVerifierHandlers, type VerifierHandlers } from "./handlers.js";
import { createTokenService } from "./token.js";
import type { RequestContext } from "./handlers.js";
import type { Session } from "./types.js";

const TEST_SECRET = "this-is-a-test-secret-that-is-long-enough-32chars";

function makeContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    ip: "127.0.0.1",
    origin: "https://example.com",
    params: {},
    body: undefined,
    rawBody: undefined,
    ...overrides,
  };
}

async function createPendingSession(
  handlers: VerifierHandlers,
): Promise<string> {
  const response = await handlers.createSession(
    makeContext({ body: { request: { age_over_18: true } } }),
  );
  return (response.body as { id: string }).id;
}

describe("replay guard (atomic session claim)", () => {
  it("processes only the first of two concurrent callbacks for the same session", async () => {
    const store = new MemoryKVStore(0);
    const engine = new MockEngine({
      verificationDelayMs: 20,
      successRate: 1.0,
    });
    const handleCallbackSpy = vi.spyOn(engine, "handleCallback");

    const handlers = createVerifierHandlers({
      engine,
      store,
      baseUrl: "https://example.com/api/eudi",
      mode: "demo",
      tokenSecret: TEST_SECRET,
    });

    const sessionId = await createPendingSession(handlers);
    const callbackCtx = makeContext({
      rawBody: `response=mock-vp&session_id=${sessionId}`,
    });

    // Fire two callbacks for the same session concurrently — simulates a
    // wallet retry / replay / race. Only one should reach engine crypto.
    const [first, second] = await Promise.all([
      handlers.handleCallback(callbackCtx),
      handlers.handleCallback(callbackCtx),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(handleCallbackSpy).toHaveBeenCalledTimes(1);

    store.dispose();
  });

  it("rejects a callback for a session already in a terminal state without invoking the engine", async () => {
    const store = new MemoryKVStore(0);
    const engine = new MockEngine({ verificationDelayMs: 0, successRate: 1.0 });
    const handleCallbackSpy = vi.spyOn(engine, "handleCallback");

    const handlers = createVerifierHandlers({
      engine,
      store,
      baseUrl: "https://example.com/api/eudi",
      mode: "demo",
      tokenSecret: TEST_SECRET,
    });

    const sessionId = await createPendingSession(handlers);
    const callbackCtx = makeContext({
      rawBody: `response=mock-vp&session_id=${sessionId}`,
    });

    const firstResult = await handlers.handleCallback(callbackCtx);
    expect(firstResult.status).toBe(200);
    expect(handleCallbackSpy).toHaveBeenCalledTimes(1);

    // Session is now 'verified' (terminal) — a second, later callback
    // (retry or replay) must be a no-op, not a second verification.
    const secondResult = await handlers.handleCallback(callbackCtx);
    expect(secondResult.status).toBe(200);
    expect(handleCallbackSpy).toHaveBeenCalledTimes(1);

    store.dispose();
  });

  it("rejects a callback for a session stuck in processing (claimed but not yet resolved) without invoking the engine", async () => {
    const store = new MemoryKVStore(0);
    const engine = new MockEngine({ verificationDelayMs: 0, successRate: 1.0 });
    const handleCallbackSpy = vi.spyOn(engine, "handleCallback");

    const handlers = createVerifierHandlers({
      engine,
      store,
      baseUrl: "https://example.com/api/eudi",
      mode: "demo",
      tokenSecret: TEST_SECRET,
    });

    const sessionId = await createPendingSession(handlers);

    // Manually force the session into 'processing' to simulate a callback
    // whose crypto is still in flight.
    const key = `session:${sessionId}`;
    const current = await store.get<Session>(key);
    await store.set(key, { ...current!, status: "processing" });

    const callbackCtx = makeContext({
      rawBody: `response=mock-vp&session_id=${sessionId}`,
    });
    const result = await handlers.handleCallback(callbackCtx);

    expect(result.status).toBe(200);
    expect(handleCallbackSpy).not.toHaveBeenCalled();

    store.dispose();
  });
});

describe("trustLevel integrity", () => {
  it("defaults trustLevel to 'none' when the engine does not report one (e.g. MockEngine)", async () => {
    const store = new MemoryKVStore(0);
    const engine = new MockEngine({ verificationDelayMs: 0, successRate: 1.0 });

    const handlers = createVerifierHandlers({
      engine,
      store,
      baseUrl: "https://example.com/api/eudi",
      mode: "demo",
      tokenSecret: TEST_SECRET,
    });

    const sessionId = await createPendingSession(handlers);
    await handlers.handleCallback(
      makeContext({ rawBody: `response=mock-vp&session_id=${sessionId}` }),
    );

    const getResponse = await handlers.getSession(
      makeContext({ params: { sessionId } }),
    );
    expect((getResponse.body as { trustLevel?: string }).trustLevel).toBe(
      "none",
    );

    store.dispose();
  });

  it("survives mint -> verify: verifyToken returns the trustLevel the token was minted with", async () => {
    const store = new MemoryKVStore(0);
    const tokenService = createTokenService({
      secret: TEST_SECRET,
      store,
      ttlMs: 60_000,
    });

    const token = await tokenService.mint(
      "session-abc",
      { age_over_18: true },
      "anchored",
    );
    const result = await tokenService.verify(token);

    expect(result.valid).toBe(true);
    expect(result.trustLevel).toBe("anchored");

    store.dispose();
  });

  it("rejects a token whose payload trustLevel was tampered from 'none' to 'anchored'", async () => {
    const store = new MemoryKVStore(0);
    const tokenService = createTokenService({
      secret: TEST_SECRET,
      store,
      ttlMs: 60_000,
    });

    const token = await tokenService.mint(
      "session-abc",
      { age_over_18: true },
      "none",
    );
    const [version, payloadB64, signature] = token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    payload.trustLevel = "anchored";
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );
    const tamperedToken = `${version}.${tamperedPayloadB64}.${signature}`;

    const result = await tokenService.verify(tamperedToken);

    // The HMAC signature no longer matches the (tampered) payload bytes,
    // so this fails as an invalid_signature before the trustLevel check
    // even runs — that IS the tamper-evidence property under test.
    expect(result.valid).toBe(false);
    expect(result.error).toBe("invalid_signature");

    store.dispose();
  });
});
