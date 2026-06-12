/**
 * @eudi-verify/server - Rate Limiter
 *
 * Per-IP rate limiting for session creation to prevent abuse.
 * Uses sliding window counter stored in IKVStore.
 */

import type { IKVStore } from './store.js';
import { rateLimitKey } from './store.js';

/**
 * Rate limit configuration.
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window (default: 10) */
  maxRequests?: number;
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
  /** KV store for rate limit counters */
  store: IKVStore;
}

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Seconds until the rate limit resets (present if not allowed) */
  retryAfter?: number;
  /** Total limit */
  limit: number;
}

/**
 * Rate limiter interface.
 */
export interface RateLimiter {
  /**
   * Check if a request from the given IP is allowed.
   * Does NOT consume a request slot.
   */
  check(ip: string): Promise<RateLimitResult>;

  /**
   * Consume a request slot for the given IP.
   * Call this after check() returns allowed=true.
   */
  consume(ip: string): Promise<void>;

  /**
   * Check and consume in one operation.
   * Returns the result and consumes a slot if allowed.
   */
  checkAndConsume(ip: string): Promise<RateLimitResult>;
}

/**
 * Stored rate limit data.
 */
interface RateLimitData {
  count: number;
  windowStart: number;
}

/**
 * Create a rate limiter instance.
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const { maxRequests = 10, windowMs = 60_000, store } = config;

  async function getOrCreateWindow(ip: string): Promise<RateLimitData> {
    const key = rateLimitKey(ip);
    const now = Date.now();

    const existing = await store.get<RateLimitData>(key);

    if (existing && now - existing.windowStart < windowMs) {
      return existing;
    }

    const data: RateLimitData = {
      count: 0,
      windowStart: now,
    };
    await store.set(key, data, windowMs);
    return data;
  }

  async function incrementWindow(ip: string): Promise<void> {
    const key = rateLimitKey(ip);
    const now = Date.now();

    const existing = await store.get<RateLimitData>(key);

    if (existing && now - existing.windowStart < windowMs) {
      const updated: RateLimitData = {
        count: existing.count + 1,
        windowStart: existing.windowStart,
      };
      const remainingTtl = windowMs - (now - existing.windowStart);
      await store.set(key, updated, remainingTtl);
    } else {
      const data: RateLimitData = {
        count: 1,
        windowStart: now,
      };
      await store.set(key, data, windowMs);
    }
  }

  return {
    async check(ip: string): Promise<RateLimitResult> {
      const window = await getOrCreateWindow(ip);
      const remaining = Math.max(0, maxRequests - window.count);
      const allowed = window.count < maxRequests;

      const result: RateLimitResult = {
        allowed,
        remaining,
        limit: maxRequests,
      };

      if (!allowed) {
        const elapsed = Date.now() - window.windowStart;
        result.retryAfter = Math.ceil((windowMs - elapsed) / 1000);
      }

      return result;
    },

    async consume(ip: string): Promise<void> {
      await incrementWindow(ip);
    },

    async checkAndConsume(ip: string): Promise<RateLimitResult> {
      const window = await getOrCreateWindow(ip);
      const wouldBeCount = window.count + 1;
      const allowed = wouldBeCount <= maxRequests;

      if (allowed) {
        await incrementWindow(ip);
      }

      const remaining = Math.max(0, maxRequests - wouldBeCount);

      const result: RateLimitResult = {
        allowed,
        remaining: allowed ? remaining : Math.max(0, maxRequests - window.count),
        limit: maxRequests,
      };

      if (!allowed) {
        const elapsed = Date.now() - window.windowStart;
        result.retryAfter = Math.ceil((windowMs - elapsed) / 1000);
      }

      return result;
    },
  };
}
