/**
 * @eudi-verify/server - Token Service
 *
 * Implements captcha-style token minting and verification.
 * Tokens prove successful verification and are:
 * - Single-use (consumed on successful verify)
 * - Short-lived (5 minute TTL)
 * - HMAC-signed with server secret
 *
 * Format: eudi_v1.<base64url-payload>.<hmac>
 */

import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import type { IKVStore } from './store.js';
import { tokenKey } from './store.js';
import type {
  VerifiedClaims,
  VerifyTokenResult,
  VerificationTokenPayload,
} from './types.js';
import { TOKEN_VERSION, DEFAULT_TOKEN_TTL_MS } from './types.js';

/**
 * Configuration for the token service.
 */
export interface TokenServiceConfig {
  /** Secret key for HMAC signing. Must be at least 32 characters. */
  secret: string;
  /** Key ID for secret rotation (allows multiple active keys) */
  keyId?: string;
  /** Token TTL in milliseconds (default: 5 minutes) */
  ttlMs?: number;
  /** KV store for single-use token tracking */
  store: IKVStore;
}

/**
 * Stored token data (used for single-use verification).
 */
interface StoredTokenData {
  sessionId: string;
  claims: VerifiedClaims;
  createdAt: number;
}

/**
 * Token service for minting and verifying verification tokens.
 */
export interface TokenService {
  /**
   * Mint a new verification token.
   * @param sessionId - Session this token is bound to
   * @param claims - Verified claims to include in the token
   * @returns Opaque token string
   */
  mint(sessionId: string, claims: VerifiedClaims): Promise<string>;

  /**
   * Verify a token and consume it (single-use).
   * @param token - Token to verify
   * @returns Verification result with claims if valid
   */
  verify(token: string): Promise<VerifyTokenResult>;
}

/**
 * Create a token service instance.
 */
export function createTokenService(config: TokenServiceConfig): TokenService {
  const { secret, store, keyId = 'k1', ttlMs = DEFAULT_TOKEN_TTL_MS } = config;

  if (secret.length < 32) {
    throw new Error('Token secret must be at least 32 characters');
  }

  return {
    async mint(sessionId: string, claims: VerifiedClaims): Promise<string> {
      const tokenId = randomUUID();
      const exp = Math.floor((Date.now() + ttlMs) / 1000);
      const claimsHash = hashClaims(claims);

      const payload: VerificationTokenPayload = {
        sid: sessionId,
        kid: keyId,
        exp,
        hash: claimsHash,
      };

      const payloadB64 = base64UrlEncode(JSON.stringify(payload));
      const signature = createSignature(payloadB64, secret);
      const token = `${TOKEN_VERSION}.${payloadB64}.${signature}`;

      const tokenData: StoredTokenData = {
        sessionId,
        claims,
        createdAt: Date.now(),
      };
      await store.set(tokenKey(tokenId), tokenData, ttlMs);

      const fullPayload = { ...payload, tid: tokenId };
      const fullPayloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
      const fullSignature = createSignature(fullPayloadB64, secret);

      return `${TOKEN_VERSION}.${fullPayloadB64}.${fullSignature}`;
    },

    async verify(token: string): Promise<VerifyTokenResult> {
      const parsed = parseToken(token);
      if (!parsed) {
        return { valid: false, error: 'invalid_token' };
      }

      const { version, payloadB64, signature, payload } = parsed;

      if (version !== TOKEN_VERSION) {
        return { valid: false, error: 'invalid_token' };
      }

      if (!payload.tid || !payload.sid || !payload.exp || !payload.hash) {
        return { valid: false, error: 'invalid_token' };
      }

      const expectedSignature = createSignature(payloadB64, secret);
      if (!constantTimeCompare(signature, expectedSignature)) {
        return { valid: false, error: 'invalid_signature' };
      }

      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowSec) {
        await store.delete(tokenKey(payload.tid));
        return { valid: false, error: 'expired' };
      }

      const storedData = await store.getAndDelete<StoredTokenData>(
        tokenKey(payload.tid)
      );

      if (!storedData) {
        const currentSec = Math.floor(Date.now() / 1000);
        if (payload.exp <= currentSec) {
          return { valid: false, error: 'expired' };
        }
        return { valid: false, error: 'already_consumed' };
      }

      if (storedData.sessionId !== payload.sid) {
        return { valid: false, error: 'invalid_token' };
      }

      const expectedHash = hashClaims(storedData.claims);
      if (payload.hash !== expectedHash) {
        return { valid: false, error: 'invalid_token' };
      }

      return { valid: true, claims: storedData.claims };
    },
  };
}

/**
 * Parse a token string into its components.
 */
function parseToken(
  token: string
): {
  version: string;
  payloadB64: string;
  signature: string;
  payload: VerificationTokenPayload & { tid?: string };
} | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [version, payloadB64, signature] = parts;

  try {
    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);
    return { version, payloadB64, signature, payload };
  } catch {
    return null;
  }
}

/**
 * Create HMAC-SHA256 signature of the payload.
 */
function createSignature(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    const dummy = Buffer.alloc(a.length);
    timingSafeEqual(dummy, dummy);
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return timingSafeEqual(bufA, bufB);
}

/**
 * Hash claims for integrity verification.
 */
function hashClaims(claims: VerifiedClaims): string {
  const sorted = JSON.stringify(claims, Object.keys(claims).sort());
  return createHmac('sha256', 'claims')
    .update(sorted)
    .digest('base64url')
    .slice(0, 16);
}

/**
 * Base64URL encode a string.
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

/**
 * Base64URL decode to string.
 */
function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}
