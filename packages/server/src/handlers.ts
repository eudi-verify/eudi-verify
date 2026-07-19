/**
 * @eudi-verify/server - Handler Factory
 *
 * Framework-agnostic HTTP handlers implementing the OpenAPI spec.
 * Each handler receives a parsed request and returns a response object.
 * The adapter layer (Node http, Hono, Express, etc.) maps these to actual HTTP.
 */

import { randomUUID } from "node:crypto";
import type { VerifierEngine } from "./engine.js";
import type { IKVStore } from "./store.js";
import { sessionKey } from "./store.js";
import type { TokenService } from "./token.js";
import { createTokenService } from "./token.js";
import type { RateLimiter } from "./rate-limit.js";
import { createRateLimiter } from "./rate-limit.js";
import type {
  Session,
  SessionDTO,
  CreateSessionInput,
  VerifyTokenInput,
  VerifyTokenResult,
  ApiError,
  VerifierMode,
} from "./types.js";
import {
  sessionToDTO,
  isTerminalStatus,
  DEFAULT_SESSION_TTL_MS,
} from "./types.js";

/**
 * Configuration for the verifier handlers.
 */
export interface VerifierConfig {
  /** Verification engine (OpenEUDI, Sphereon, or Mock) */
  engine: VerifierEngine;
  /** Key-value store for sessions and tokens */
  store: IKVStore;
  /** Base URL for callback endpoints (e.g., https://example.com/api/eudi) */
  baseUrl: string;
  /** Operating mode (demo returns simulated credentials) */
  mode: VerifierMode;
  /** Session TTL in milliseconds (default: 5 minutes) */
  sessionTtlMs?: number;
  /** Secret for token signing (required, min 32 chars) */
  tokenSecret: string;
  /** Token key ID for rotation */
  tokenKeyId?: string;
  /** Rate limit config (optional) */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  /** Allowed origins for CORS/Origin check (empty = allow all) */
  allowedOrigins?: string[];
}

/**
 * Generic request context provided by the adapter.
 */
export interface RequestContext {
  /** Client IP address */
  ip: string;
  /** Origin header (for CORS check) */
  origin?: string;
  /** Request path parameters */
  params: Record<string, string>;
  /** Parsed JSON body (for POST requests) */
  body?: unknown;
  /** Raw body string (for form-encoded callbacks) */
  rawBody?: string;
}

/**
 * Generic response returned by handlers.
 */
export interface HandlerResponse<T = unknown> {
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body (will be JSON-serialized) */
  body: T;
}

/**
 * Handler function signature.
 */
export type RequestHandler<T = unknown> = (
  ctx: RequestContext,
) => Promise<HandlerResponse<T>>;

/**
 * All handlers returned by createVerifierHandlers.
 */
export interface VerifierHandlers {
  createSession: RequestHandler<SessionDTO | ApiError>;
  getSession: RequestHandler<SessionDTO | ApiError>;
  cancelSession: RequestHandler<SessionDTO | ApiError>;
  verifyToken: RequestHandler<VerifyTokenResult | ApiError>;
  handleCallback: RequestHandler<{ status: string } | ApiError>;
  getRequest: RequestHandler<string | ApiError>;
}

/**
 * Create the verifier handlers.
 */
export function createVerifierHandlers(
  config: VerifierConfig,
): VerifierHandlers {
  const {
    engine,
    store,
    baseUrl,
    mode,
    sessionTtlMs = DEFAULT_SESSION_TTL_MS,
    tokenSecret,
    tokenKeyId,
    rateLimit: rateLimitConfig,
    allowedOrigins = [],
  } = config;

  const tokenService: TokenService = createTokenService({
    secret: tokenSecret,
    keyId: tokenKeyId,
    ttlMs: sessionTtlMs,
    store,
  });

  const rateLimiter: RateLimiter | null = rateLimitConfig
    ? createRateLimiter({
        maxRequests: rateLimitConfig.maxRequests,
        windowMs: rateLimitConfig.windowMs,
        store,
      })
    : null;

  function modeHeader(): Record<string, string> {
    return { "X-Eudi-Mode": mode, "Cache-Control": "no-store" };
  }

  function logDemoWarning(): void {
    if (mode === "demo") {
      console.warn(
        "[eudi-verify] WARNING: Running in demo mode. " +
          "Credentials are simulated. Do not use in production.",
      );
    }
  }

  function checkOrigin(origin: string | undefined): boolean {
    if (allowedOrigins.length === 0) return true;
    if (!origin) return false;
    return allowedOrigins.includes(origin);
  }

  async function getStoredSession(sessionId: string): Promise<Session | null> {
    const session = await store.get<Session>(sessionKey(sessionId));
    if (!session) return null;

    if (
      !isTerminalStatus(session.status) &&
      new Date() > new Date(session.expiresAt)
    ) {
      const expired: Session = { ...session, status: "expired" };
      await store.set(sessionKey(sessionId), expired);
      return expired;
    }

    return session;
  }

  return {
    async createSession(ctx): Promise<HandlerResponse<SessionDTO | ApiError>> {
      logDemoWarning();

      if (!checkOrigin(ctx.origin)) {
        return {
          status: 403,
          headers: modeHeader(),
          body: {
            error: "forbidden",
            message: "Origin not allowed",
          },
        };
      }

      if (rateLimiter) {
        const rateResult = await rateLimiter.checkAndConsume(ctx.ip);
        if (!rateResult.allowed) {
          return {
            status: 429,
            headers: {
              ...modeHeader(),
              "Retry-After": String(rateResult.retryAfter ?? 60),
            },
            body: {
              error: "rate_limited",
              message: "Too many requests, please retry later",
            },
          };
        }
      }

      const input = ctx.body as CreateSessionInput | undefined;
      if (!input?.request || typeof input.request !== "object") {
        return {
          status: 400,
          headers: modeHeader(),
          body: {
            error: "bad_request",
            message: "Invalid verification request",
          },
        };
      }

      const sessionId = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + sessionTtlMs);

      try {
        const engineResult = await engine.createSession({
          sessionId,
          request: input.request,
          baseUrl,
          ttlMs: sessionTtlMs,
        });

        const session: Session = {
          id: sessionId,
          status: "pending",
          request: input.request,
          qrUrl: engineResult.qrUrl,
          createdAt: now,
          expiresAt,
          _engineData: engineResult.engineData,
        };

        await store.set(sessionKey(sessionId), session, sessionTtlMs);

        return {
          status: 201,
          headers: modeHeader(),
          body: sessionToDTO(session),
        };
      } catch (err) {
        console.error("[eudi-verify] createSession error:", err);
        return {
          status: 500,
          headers: modeHeader(),
          body: {
            error: "internal_error",
            message: "Failed to create session",
          },
        };
      }
    },

    async getSession(ctx): Promise<HandlerResponse<SessionDTO | ApiError>> {
      const { sessionId } = ctx.params;

      if (!sessionId) {
        return {
          status: 400,
          headers: modeHeader(),
          body: {
            error: "bad_request",
            message: "Missing session ID",
          },
        };
      }

      const session = await getStoredSession(sessionId);

      if (!session) {
        return {
          status: 404,
          headers: modeHeader(),
          body: {
            error: "not_found",
            message: "Session not found",
          },
        };
      }

      return {
        status: 200,
        headers: modeHeader(),
        body: sessionToDTO(session),
      };
    },

    async cancelSession(ctx): Promise<HandlerResponse<SessionDTO | ApiError>> {
      const { sessionId } = ctx.params;

      if (!sessionId) {
        return {
          status: 400,
          headers: modeHeader(),
          body: {
            error: "bad_request",
            message: "Missing session ID",
          },
        };
      }

      const session = await getStoredSession(sessionId);

      if (!session) {
        return {
          status: 404,
          headers: modeHeader(),
          body: {
            error: "not_found",
            message: "Session not found",
          },
        };
      }

      if (isTerminalStatus(session.status)) {
        return {
          status: 409,
          headers: modeHeader(),
          body: {
            error: "conflict",
            message: `Session already in terminal state: ${session.status}`,
          },
        };
      }

      const cancelled: Session = { ...session, status: "cancelled" };

      if (engine.cancelSession) {
        try {
          await engine.cancelSession(session);
        } catch (err) {
          console.error("[eudi-verify] cancelSession engine error:", err);
        }
      }

      await store.set(sessionKey(sessionId), cancelled, sessionTtlMs);

      return {
        status: 200,
        headers: modeHeader(),
        body: sessionToDTO(cancelled),
      };
    },

    async verifyToken(
      ctx,
    ): Promise<HandlerResponse<VerifyTokenResult | ApiError>> {
      const input = ctx.body as VerifyTokenInput | undefined;

      if (!input?.token || typeof input.token !== "string") {
        return {
          status: 400,
          headers: modeHeader(),
          body: {
            error: "bad_request",
            message: "Missing or invalid token",
          },
        };
      }

      const result = await tokenService.verify(input.token);

      return {
        status: 200,
        headers: modeHeader(),
        body: result,
      };
    },

    async handleCallback(
      ctx,
    ): Promise<HandlerResponse<{ status: string } | ApiError>> {
      logDemoWarning();

      if (!ctx.rawBody) {
        return {
          status: 400,
          headers: modeHeader(),
          body: {
            error: "bad_request",
            message: "Missing callback body",
          },
        };
      }

      let callbackData;
      try {
        callbackData = await engine.parseCallback(ctx.rawBody);
      } catch (err) {
        console.error("[eudi-verify] parseCallback error:", err);
        return {
          status: 400,
          headers: modeHeader(),
          body: {
            error: "bad_request",
            message: "Invalid callback format",
          },
        };
      }

      const session = await getStoredSession(callbackData.sessionId);

      if (!session) {
        return {
          status: 400,
          headers: modeHeader(),
          body: {
            error: "bad_request",
            message: "Session not found for callback",
          },
        };
      }

      if (isTerminalStatus(session.status) || session.status === "processing") {
        // Already finalized, or a concurrent callback already claimed this
        // session — respond idempotently WITHOUT re-running crypto. This is
        // the replay guard: closes the TOCTOU window a naive get-then-set
        // would leave open around the `engine.handleCallback` await below.
        // See THREAT_MODEL.md.
        return {
          status: 200,
          headers: modeHeader(),
          body: { status: "ok" },
        };
      }

      const claimed = await store.compareAndSet<Session>(
        sessionKey(session.id),
        (current) =>
          current !== undefined &&
          !isTerminalStatus(current.status) &&
          current.status !== "processing",
        { ...session, status: "processing" },
        sessionTtlMs,
      );

      if (!claimed) {
        // Lost the race to another callback for the same session (retry,
        // replay, or genuine race) — do not invoke the engine.
        return {
          status: 200,
          headers: modeHeader(),
          body: { status: "ok" },
        };
      }

      try {
        const result = await engine.handleCallback(callbackData, session);
        // Trust is only ever 'anchored' when the engine explicitly reports
        // it; engines that don't report a trust decision (MockEngine,
        // demo-mode OpenEudiEngine) default to 'none'.
        const trustLevel = result.trustLevel ?? "none";

        const updated: Session = {
          ...session,
          status: result.status,
          claims: result.claims,
          trustLevel: result.success ? trustLevel : undefined,
          error: result.error,
        };

        if (result.success && result.claims) {
          const token = await tokenService.mint(
            session.id,
            result.claims,
            trustLevel,
          );
          updated.token = token;
        }

        await store.set(sessionKey(session.id), updated, sessionTtlMs);

        return {
          status: 200,
          headers: modeHeader(),
          body: { status: "ok" },
        };
      } catch (err) {
        console.error("[eudi-verify] handleCallback error:", err);

        const errorSession: Session = {
          ...session,
          status: "error",
          error: "Verification failed",
        };
        await store.set(sessionKey(session.id), errorSession, sessionTtlMs);

        return {
          status: 200,
          headers: modeHeader(),
          body: { status: "ok" },
        };
      }
    },

    async getRequest(ctx): Promise<HandlerResponse<string | ApiError>> {
      const { requestId } = ctx.params;

      if (!requestId) {
        return {
          status: 400,
          headers: modeHeader(),
          body: {
            error: "bad_request",
            message: "Missing request ID",
          },
        };
      }

      const session = await getStoredSession(requestId);

      if (!session) {
        return {
          status: 404,
          headers: {
            ...modeHeader(),
            "Content-Type": "application/json",
          },
          body: {
            error: "not_found",
            message: "Request not found",
          },
        };
      }

      if (!engine.getAuthorizationRequest) {
        return {
          status: 501,
          headers: {
            ...modeHeader(),
            "Content-Type": "application/json",
          },
          body: {
            error: "not_implemented",
            message: "PAR not supported by this engine",
          },
        };
      }

      try {
        const jwt = await engine.getAuthorizationRequest(session);
        return {
          status: 200,
          headers: {
            ...modeHeader(),
            "Content-Type": "application/oauth-authz-req+jwt",
          },
          body: jwt,
        };
      } catch (err) {
        console.error("[eudi-verify] getRequest error:", err);
        return {
          status: 500,
          headers: {
            ...modeHeader(),
            "Content-Type": "application/json",
          },
          body: {
            error: "internal_error",
            message: "Failed to generate authorization request",
          },
        };
      }
    },
  };
}
