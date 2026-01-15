/**
 * Sync Performance Utilities
 *
 * Provides debouncing, throttling, and batching utilities for sync operations
 * to prevent blocking the main thread and improve overall app responsiveness.
 */

/** Debounce function with immediate execution option */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void; flush: () => void } {
  const { leading = false, trailing = true } = options;
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let isLeadingInvoked = false;

  function invokeFunc(): void {
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  }

  function debounced(this: unknown, ...args: Parameters<T>): void {
    lastArgs = args;

    if (leading && !isLeadingInvoked) {
      isLeadingInvoked = true;
      invokeFunc();
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (trailing && lastArgs) {
        invokeFunc();
      }
      isLeadingInvoked = false;
      timeoutId = null;
    }, delay);
  }

  debounced.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
    isLeadingInvoked = false;
  };

  debounced.flush = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      if (trailing && lastArgs) {
        invokeFunc();
      }
      isLeadingInvoked = false;
    }
  };

  return debounced as T & { cancel: () => void; flush: () => void };
}

/** Throttle function - limits execution to once per interval */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  interval: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): ((...args: TArgs) => void) & { cancel: () => void } {
  const { leading = true, trailing = true } = options;
  let lastCallTime: number | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: TArgs | null = null;

  function invokeFunc(): void {
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
      lastCallTime = Date.now();
    }
  }

  function throttled(this: unknown, ...args: TArgs): void {
    const now = Date.now();
    lastArgs = args;

    const timeSinceLastCall = lastCallTime ? now - lastCallTime : interval;

    if (timeSinceLastCall >= interval) {
      if (leading) {
        invokeFunc();
      } else if (!timeoutId && trailing) {
        timeoutId = setTimeout(() => {
          invokeFunc();
          timeoutId = null;
        }, interval);
      }
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        invokeFunc();
        timeoutId = null;
      }, interval - timeSinceLastCall);
    }
  }

  throttled.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
    lastCallTime = null;
  };

  return throttled as ((...args: TArgs) => void) & { cancel: () => void };
}

/** Batch multiple calls into a single execution */
export class BatchProcessor<T> {
  private batch: T[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly processor: (items: T[]) => void;
  private readonly maxBatchSize: number;
  private readonly maxWaitMs: number;

  constructor(
    processor: (items: T[]) => void,
    options: { maxBatchSize?: number; maxWaitMs?: number } = {}
  ) {
    this.processor = processor;
    this.maxBatchSize = options.maxBatchSize ?? 50;
    this.maxWaitMs = options.maxWaitMs ?? 100;
  }

  add(item: T): void {
    this.batch.push(item);

    if (this.batch.length >= this.maxBatchSize) {
      this.flush();
      return;
    }

    this.timeoutId ??= setTimeout(() => {
      this.flush();
    }, this.maxWaitMs);
  }

  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.batch.length > 0) {
      const items = this.batch;
      this.batch = [];
      this.processor(items);
    }
  }

  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.batch = [];
  }

  get pendingCount(): number {
    return this.batch.length;
  }
}

/** Queue for async operations with concurrency control */
export class AsyncQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private readonly maxConcurrency: number;

  constructor(maxConcurrency = 1) {
    this.maxConcurrency = maxConcurrency;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task = async (): Promise<void> => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          const reason = error instanceof Error ? error : new Error(String(error));
          reject(reason);
        }
      };

      this.queue.push(task);
      void this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) {
      return;
    }

    this.running++;
    try {
      await task();
    } finally {
      this.running--;
      void this.processQueue();
    }
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.running;
  }
}

/** Deferred execution using setImmediate for non-blocking operations */
export function deferToNextTick<T>(fn: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        resolve(fn());
      } catch (error) {
        const reason = error instanceof Error ? error : new Error(String(error));
        reject(reason);
      }
    });
  });
}

/** Chunk an array into smaller pieces for batched processing */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/** Process array items in chunks with yielding to event loop */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize = 10
): Promise<R[]> {
  const results: R[] = [];
  const chunks = chunkArray(items, chunkSize);

  for (const chunk of chunks) {
    await deferToNextTick(() => {
      for (const item of chunk) {
        results.push(processor(item));
      }
    });
  }

  return results;
}

/** Rate limiter for operations */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private lastRefillTime: number;

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefillTime = Date.now();
  }

  tryAcquire(tokens = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  get availableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/** Performance metrics collector - no-op in production to save memory */
export class PerformanceMetrics {
  /** Execute function directly without measuring */
  measure<T>(_name: string, fn: () => T): T {
    return fn();
  }

  /** Execute async function directly without measuring */
  async measureAsync<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  getStats(_name: string): undefined {
    return undefined;
  }

  getAllStats(): Record<string, never> {
    return {};
  }

  reset(): void {
    // No-op
  }
}

/** Global performance metrics instance */
export const syncMetrics = new PerformanceMetrics();
