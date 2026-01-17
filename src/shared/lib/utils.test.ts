import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, generateId, sleep, debounce, formatDate, formatTime } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should merge Tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('should handle undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });
  });

  describe('generateId', () => {
    it('should generate a string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate valid UUID format', () => {
      const id = generateId();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return a promise', () => {
      const result = sleep(100);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve after specified time', async () => {
      const callback = vi.fn();
      sleep(100).then(callback);

      expect(callback).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(100);

      expect(callback).toHaveBeenCalled();
    });

    it('should resolve to undefined', async () => {
      const promise = sleep(100);
      vi.advanceTimersByTime(100);
      const result = await promise;
      expect(result).toBeUndefined();
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should delay function execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);

      debouncedFn();
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the debounced function', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should use latest arguments on multiple calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('first');
      vi.advanceTimersByTime(50);
      debouncedFn('second');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('second');
    });
  });

  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toContain('2024');
    });

    it('should format date string', () => {
      const result = formatDate('2024-01-15');
      expect(result).toContain('2024');
    });

    it('should respect custom options', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, { weekday: 'long' });
      // Result should include weekday (varies by locale)
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatTime', () => {
    it('should format Date object', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatTime(date);
      // Should contain hours and minutes
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should format date string', () => {
      const result = formatTime('2024-01-15T14:30:00');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should respect custom options', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatTime(date, { hour12: false });
      expect(result).toBeTruthy();
    });
  });

  describe('getFocusableElements', () => {
    it('should return empty array for document without focusable elements', async () => {
      document.body.innerHTML = '<div>No focusable elements</div>';
      const { getFocusableElements } = await import('./utils');
      const result = getFocusableElements(document);
      expect(result).toEqual([]);
    });

    it('should exclude disabled elements', async () => {
      document.body.innerHTML = '<button disabled id="btn1">Disabled</button>';
      const { getFocusableElements } = await import('./utils');
      const result = getFocusableElements(document);
      expect(result.length).toBe(0);
    });

    it('should exclude hidden inputs', async () => {
      document.body.innerHTML = '<input type="hidden" id="hidden1" />';
      const { getFocusableElements } = await import('./utils');
      const result = getFocusableElements(document);
      expect(result.length).toBe(0);
    });

    it('should exclude aria-hidden elements', async () => {
      document.body.innerHTML = '<button aria-hidden="true" id="btn1">Hidden</button>';
      const { getFocusableElements } = await import('./utils');
      const result = getFocusableElements(document);
      expect(result.length).toBe(0);
    });

    it('should exclude negative tabindex elements', async () => {
      document.body.innerHTML = '<button tabindex="-1" id="btn1">Not focusable</button>';
      const { getFocusableElements } = await import('./utils');
      const result = getFocusableElements(document);
      expect(result.length).toBe(0);
    });
  });

  describe('moveFocus', () => {
    it('should return false when no focusable elements', async () => {
      document.body.innerHTML = '<div>No focusables</div>';
      const { moveFocus } = await import('./utils');
      const result = moveFocus('next');
      expect(result).toBe(false);
    });
  });
});
