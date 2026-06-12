import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPoller } from './polling.js';

describe('createPoller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls immediately on start', async () => {
    const pollFn = vi.fn().mockResolvedValue(true);
    const poller = createPoller(pollFn);

    poller.start();
    await vi.runAllTimersAsync();

    expect(pollFn).toHaveBeenCalledTimes(1);
  });

  it('stops polling when function returns true', async () => {
    let callCount = 0;
    const pollFn = vi.fn().mockImplementation(async () => {
      callCount++;
      return callCount >= 3;
    });

    const poller = createPoller(pollFn, { initialIntervalMs: 100 });
    poller.start();

    await vi.advanceTimersByTimeAsync(1000);

    expect(pollFn).toHaveBeenCalledTimes(3);
  });

  it('uses exponential backoff', async () => {
    const pollFn = vi.fn().mockResolvedValue(false);
    const poller = createPoller(pollFn, {
      initialIntervalMs: 100,
      maxIntervalMs: 1000,
      backoffMultiplier: 2,
    });

    poller.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(pollFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(200);
    expect(pollFn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(400);
    expect(pollFn).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(800);
    expect(pollFn).toHaveBeenCalledTimes(4);

    poller.stop();
  });

  it('respects max interval', async () => {
    const pollFn = vi.fn().mockResolvedValue(false);
    const poller = createPoller(pollFn, {
      initialIntervalMs: 100,
      maxIntervalMs: 200,
      backoffMultiplier: 10,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(pollFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(200);
    expect(pollFn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(200);
    expect(pollFn).toHaveBeenCalledTimes(3);

    poller.stop();
  });

  it('stops polling on stop()', async () => {
    const pollFn = vi.fn().mockResolvedValue(false);
    const poller = createPoller(pollFn, { initialIntervalMs: 100 });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(pollFn).toHaveBeenCalledTimes(1);

    poller.stop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(pollFn).toHaveBeenCalledTimes(1);
  });

  it('resets interval on reset()', async () => {
    const pollFn = vi.fn().mockResolvedValue(false);
    const poller = createPoller(pollFn, {
      initialIntervalMs: 100,
      maxIntervalMs: 10000,
      backoffMultiplier: 2,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(200);
    expect(pollFn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(400);
    expect(pollFn).toHaveBeenCalledTimes(3);

    poller.reset();
    poller.stop();
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    const callsBefore = pollFn.mock.calls.length;
    await vi.advanceTimersByTimeAsync(200);
    expect(pollFn).toHaveBeenCalledTimes(callsBefore + 1);

    poller.stop();
  });

  it('continues polling on error', async () => {
    let callCount = 0;
    const pollFn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 2) throw new Error('Test error');
      return callCount >= 4;
    });

    const poller = createPoller(pollFn, { initialIntervalMs: 100, maxIntervalMs: 100, backoffMultiplier: 1 });
    poller.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(pollFn).toHaveBeenCalledTimes(1);
    
    await vi.advanceTimersByTimeAsync(100);
    expect(pollFn).toHaveBeenCalledTimes(2);
    
    await vi.advanceTimersByTimeAsync(100);
    expect(pollFn).toHaveBeenCalledTimes(3);
    
    await vi.advanceTimersByTimeAsync(100);
    expect(pollFn).toHaveBeenCalledTimes(4);
  });

  it('does nothing if start() called while running', async () => {
    const pollFn = vi.fn().mockResolvedValue(false);
    const poller = createPoller(pollFn, { initialIntervalMs: 100 });

    poller.start();
    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(pollFn).toHaveBeenCalledTimes(1);

    poller.stop();
  });

  it('uses default config values', async () => {
    const pollFn = vi.fn().mockResolvedValue(false);
    const poller = createPoller(pollFn);

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(pollFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(pollFn).toHaveBeenCalledTimes(2);

    poller.stop();
  });
});
