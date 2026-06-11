/**
 * @eudi-verify/server - Key-Value Store Interface
 *
 * Abstraction for session and token storage. Implementations:
 * - MemoryKVStore: In-memory (default, for demo/testing)
 * - RedisKVStore: Redis (production, horizontal scaling)
 * - PostgresKVStore: Postgres (production, when Redis unavailable)
 */

/**
 * Generic key-value store interface for session and token storage.
 *
 * All implementations must support:
 * - TTL-based expiration
 * - Atomic get-and-delete for single-use tokens
 *
 * @example
 * ```ts
 * const store = new MemoryKVStore();
 * await store.set('session:123', session, 300_000); // 5 min TTL
 * const data = await store.get('session:123');
 * ```
 */
export interface IKVStore {
  /**
   * Get a value by key.
   * @returns The value, or undefined if not found or expired
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Set a value with optional TTL.
   * @param key - Storage key
   * @param value - Value to store (will be serialized)
   * @param ttlMs - Time-to-live in milliseconds (optional)
   */
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;

  /**
   * Delete a key.
   * @returns true if the key existed, false otherwise
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if a key exists (and is not expired).
   */
  has(key: string): Promise<boolean>;

  /**
   * Atomically get and delete a value.
   * Essential for single-use token consumption.
   * @returns The value if it existed, undefined otherwise
   */
  getAndDelete<T>(key: string): Promise<T | undefined>;

  /**
   * Clear all keys (useful for testing).
   */
  clear(): Promise<void>;
}

/**
 * Entry stored in memory with expiration tracking.
 */
interface MemoryEntry<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * In-memory implementation of IKVStore.
 *
 * Suitable for:
 * - Demo mode
 * - Development
 * - Testing
 * - Single-instance deployments
 *
 * NOT suitable for:
 * - Production with multiple instances (no shared state)
 * - High-volume traffic (memory limits)
 *
 * @example
 * ```ts
 * const store = new MemoryKVStore();
 *
 * // Store session with 5 minute TTL
 * await store.set('session:abc', { status: 'pending' }, 300_000);
 *
 * // Retrieve session
 * const session = await store.get<Session>('session:abc');
 *
 * // Consume single-use token (atomic get + delete)
 * const tokenData = await store.getAndDelete('token:xyz');
 * ```
 */
export class MemoryKVStore implements IKVStore {
  private store = new Map<string, MemoryEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Create a new in-memory store.
   * @param cleanupIntervalMs - How often to run expired key cleanup (default: 60s)
   */
  constructor(cleanupIntervalMs = 60_000) {
    if (cleanupIntervalMs > 0) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, cleanupIntervalMs);

      // Don't prevent Node from exiting
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key) as MemoryEntry<T> | undefined;

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  async getAndDelete<T>(key: string): Promise<T | undefined> {
    const value = await this.get<T>(key);
    if (value !== undefined) {
      this.store.delete(key);
    }
    return value;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Remove expired entries. Called automatically on interval.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval. Call when disposing the store.
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get the current number of entries (for testing/monitoring).
   */
  get size(): number {
    return this.store.size;
  }
}

/**
 * Key prefixes for namespacing different data types.
 */
export const KEY_PREFIX = {
  SESSION: 'session:',
  TOKEN: 'token:',
  RATE_LIMIT: 'rate:',
} as const;

/**
 * Build a session storage key.
 */
export function sessionKey(sessionId: string): string {
  return `${KEY_PREFIX.SESSION}${sessionId}`;
}

/**
 * Build a token storage key.
 */
export function tokenKey(tokenId: string): string {
  return `${KEY_PREFIX.TOKEN}${tokenId}`;
}

/**
 * Build a rate limit key for an IP address.
 */
export function rateLimitKey(ip: string): string {
  return `${KEY_PREFIX.RATE_LIMIT}${ip}`;
}
