/**
 * @eudi-verify/client - Polling Utility
 *
 * Exponential backoff polling with configurable intervals.
 */

/**
 * Configuration for the poller.
 */
export interface PollingConfig {
  /** Initial interval in milliseconds (default: 1000) */
  initialIntervalMs?: number;
  /** Maximum interval in milliseconds (default: 10000) */
  maxIntervalMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
}

/**
 * Poller instance returned by createPoller.
 */
export interface Poller {
  /** Start polling */
  start(): void;
  /** Stop polling */
  stop(): void;
  /** Reset interval to initial value */
  reset(): void;
}

const DEFAULT_CONFIG: Required<PollingConfig> = {
  initialIntervalMs: 1000,
  maxIntervalMs: 10_000,
  backoffMultiplier: 2,
};

/**
 * Create an exponential backoff poller.
 *
 * @param fn - Function to call on each poll. Returns true to stop polling.
 * @param config - Polling configuration.
 * @returns Poller instance with start/stop/reset methods.
 *
 * @example
 * ```ts
 * const poller = createPoller(async () => {
 *   const result = await checkStatus();
 *   return result.complete; // true stops polling
 * });
 *
 * poller.start();
 * // ... later
 * poller.stop();
 * ```
 */
export function createPoller(
  fn: () => Promise<boolean>,
  config: PollingConfig = {},
): Poller {
  const { initialIntervalMs, maxIntervalMs, backoffMultiplier } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let currentInterval = initialIntervalMs;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  async function poll(): Promise<void> {
    if (!running) return;

    try {
      const shouldStop = await fn();
      if (shouldStop || !running) {
        running = false;
        return;
      }
    } catch {
      // Continue polling on error (let caller handle errors)
    }

    if (!running) return;

    currentInterval = Math.min(
      currentInterval * backoffMultiplier,
      maxIntervalMs,
    );

    timeoutId = setTimeout(() => {
      void poll();
    }, currentInterval);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      currentInterval = initialIntervalMs;
      void poll();
    },

    stop(): void {
      running = false;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },

    reset(): void {
      currentInterval = initialIntervalMs;
    },
  };
}
