import { describe, it, expect, vi, beforeEach } from 'vitest';

import { reportCrash, createErrorDetails } from './crashReporting';

vi.mock('@/stores/settings.store', () => ({
  useSettingsStore: {
    getState: vi.fn(() => ({
      privacy: { crashReportsEnabled: false },
    })),
  },
}));

describe('crashReporting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('createErrorDetails', () => {
    it('should create details from Error object', () => {
      const error = new Error('Test error');
      const details = createErrorDetails(error);

      expect(details.message).toBe('Test error');
      expect(details.stack).toBeDefined();
      expect(details.timestamp).toBeDefined();
    });

    it('should include userAgent when window is available', () => {
      const error = new Error('Test error');
      const details = createErrorDetails(error);

      expect(details.userAgent).toBeDefined();
    });

    it('should include URL when window is available', () => {
      const error = new Error('Test error');
      const details = createErrorDetails(error);

      expect(details.url).toBeDefined();
    });

    it('should accept additional info', () => {
      const error = new Error('Test error');
      const details = createErrorDetails(error, {
        filename: 'test.ts',
        lineno: 10,
        colno: 5,
      });

      expect(details.filename).toBe('test.ts');
      expect(details.lineno).toBe(10);
      expect(details.colno).toBe(5);
    });

    it('should handle ErrorEvent', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Script error',
        filename: 'script.js',
        lineno: 42,
        colno: 10,
      });

      const details = createErrorDetails(errorEvent);
      expect(details.message).toBe('Script error');
      expect(details.filename).toBe('script.js');
      expect(details.lineno).toBe(42);
      expect(details.colno).toBe(10);
    });
  });

  describe('reportCrash', () => {
    it('should not report when crash reporting is disabled', async () => {
      const mockOpen = vi.fn();
      window.open = mockOpen;

      await reportCrash({
        message: 'Test crash',
        timestamp: Date.now(),
      });

      expect(mockOpen).not.toHaveBeenCalled();
    });

    it('should not throw even when electronAPI is missing', async () => {
      await expect(
        reportCrash({
          message: 'Test crash',
          timestamp: Date.now(),
        })
      ).resolves.not.toThrow();
    });
  });
});
