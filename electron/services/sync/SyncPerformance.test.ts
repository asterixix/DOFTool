import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  debounce,
  throttle,
  BatchProcessor,
  AsyncQueue,
  deferToNextTick,
  chunkArray,
  processInChunks,
  RateLimiter,
  PerformanceMetrics,
} from './SyncPerformance';

describe('SyncPerformance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should support leading execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100, { leading: true });

      debouncedFn();

      expect(fn).toHaveBeenCalledTimes(1);

      debouncedFn();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should support trailing execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100, { trailing: true });

      debouncedFn();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel debounced function', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn.cancel();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });

    it('should flush debounced function', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn.flush();

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should support leading execution', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100, { leading: true });

      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should support trailing execution', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100, { trailing: true });

      throttledFn();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel throttled function', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn.cancel();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('BatchProcessor', () => {
    it('should batch items', () => {
      const processor = vi.fn();
      const batchProcessor = new BatchProcessor(processor, { maxWaitMs: 100 });

      batchProcessor.add(1);
      batchProcessor.add(2);
      batchProcessor.add(3);

      expect(processor).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should flush when max batch size reached', () => {
      const processor = vi.fn();
      const batchProcessor = new BatchProcessor(processor, {
        maxBatchSize: 2,
        maxWaitMs: 100,
      });

      batchProcessor.add(1);
      batchProcessor.add(2);

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith([1, 2]);
    });

    it('should flush manually', () => {
      const processor = vi.fn();
      const batchProcessor = new BatchProcessor(processor, { maxWaitMs: 100 });

      batchProcessor.add(1);
      batchProcessor.flush();

      expect(processor).toHaveBeenCalledWith([1]);
    });

    it('should clear batch', () => {
      const processor = vi.fn();
      const batchProcessor = new BatchProcessor(processor, { maxWaitMs: 100 });

      batchProcessor.add(1);
      batchProcessor.add(2);
      batchProcessor.clear();
      batchProcessor.flush();

      expect(processor).not.toHaveBeenCalled();
    });

    it('should return pending count', () => {
      const processor = vi.fn();
      const batchProcessor = new BatchProcessor(processor, { maxWaitMs: 100 });

      expect(batchProcessor.pendingCount).toBe(0);

      batchProcessor.add(1);
      batchProcessor.add(2);

      expect(batchProcessor.pendingCount).toBe(2);
    });
  });

  describe('AsyncQueue', () => {
    it('should process async tasks sequentially', async () => {
      const queue = new AsyncQueue(1);
      const results: number[] = [];

      queue.add(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(1);
      });
      queue.add(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(2);
      });

      await vi.runAllTimersAsync();

      expect(results).toEqual([1, 2]);
    });

    it('should handle concurrency limit', async () => {
      const queue = new AsyncQueue(2);
      const results: number[] = [];

      queue.add(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(1);
      });
      queue.add(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(2);
      });
      queue.add(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(3);
      });

      await vi.runAllTimersAsync();

      expect(results.length).toBe(3);
    });

    it('should return pending count', () => {
      const queue = new AsyncQueue(1);

      queue.add(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      queue.add(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(queue.pendingCount).toBeGreaterThan(0);
    });

    it('should return active count', async () => {
      vi.useRealTimers();
      const queue = new AsyncQueue(1);

      const promise = queue.add(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(queue.activeCount).toBeGreaterThan(0);

      await promise;

      expect(queue.activeCount).toBe(0);
      vi.useFakeTimers();
    });

    it('should handle errors', async () => {
      const queue = new AsyncQueue(1);

      await expect(
        queue.add(async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('deferToNextTick', () => {
    it('should defer execution to next tick', async () => {
      const fn = vi.fn();
      const promise = deferToNextTick(fn);

      expect(fn).not.toHaveBeenCalled();

      await vi.advanceTimersToNextTimerAsync();
      await promise;

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle errors', async () => {
      const fn = vi.fn(() => {
        throw new Error('Test error');
      });

      const promise = deferToNextTick(fn);
      await vi.advanceTimersToNextTimerAsync();

      await expect(promise).rejects.toThrow('Test error');
    });
  });

  describe('chunkArray', () => {
    it('should chunk array into smaller pieces', () => {
      const array = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunkArray(array, 3);

      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should handle empty array', () => {
      const chunks = chunkArray([], 3);
      expect(chunks).toEqual([]);
    });

    it('should handle array smaller than chunk size', () => {
      const chunks = chunkArray([1, 2], 3);
      expect(chunks).toEqual([[1, 2]]);
    });
  });

  describe('processInChunks', () => {
    it('should process items in chunks', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn((item: number) => item * 2);

      const promise = processInChunks(items, processor, 2);

      // Advance timers for each chunk (3 chunks total)
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();

      const results = await promise;

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processor).toHaveBeenCalledTimes(5);
    });

    it('should handle empty array', async () => {
      const processor = vi.fn();
      const results = await processInChunks([], processor);

      expect(results).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('RateLimiter', () => {
    it('should acquire tokens', () => {
      const limiter = new RateLimiter(10, 1);

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.availableTokens).toBe(9);
    });

    it('should reject when no tokens available', () => {
      const limiter = new RateLimiter(1, 1);

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);
    });

    it('should refill tokens over time', () => {
      const limiter = new RateLimiter(10, 1);

      limiter.tryAcquire(10);
      expect(limiter.availableTokens).toBe(0);

      // Advance time (1 token per second = 10 tokens in 10 seconds)
      vi.advanceTimersByTime(10000);

      expect(limiter.availableTokens).toBeGreaterThan(0);
    });

    it('should not exceed max tokens', () => {
      const limiter = new RateLimiter(10, 1);

      limiter.tryAcquire(5);
      expect(limiter.availableTokens).toBe(5);

      vi.advanceTimersByTime(10000);

      expect(limiter.availableTokens).toBeLessThanOrEqual(10);
    });
  });

  describe('PerformanceMetrics', () => {
    it('should execute function without measuring', () => {
      const metrics = new PerformanceMetrics();
      const fn = vi.fn(() => 'result');

      const result = metrics.measure('test', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should execute async function without measuring', async () => {
      const metrics = new PerformanceMetrics();
      const fn = vi.fn(async () => 'result');

      const result = await metrics.measureAsync('test', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should return undefined stats', () => {
      const metrics = new PerformanceMetrics();

      expect(metrics.getStats('test')).toBeUndefined();
    });

    it('should return empty stats', () => {
      const metrics = new PerformanceMetrics();

      expect(metrics.getAllStats()).toEqual({});
    });

    it('should reset without error', () => {
      const metrics = new PerformanceMetrics();

      expect(() => metrics.reset()).not.toThrow();
    });
  });
});
