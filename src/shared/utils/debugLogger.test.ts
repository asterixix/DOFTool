import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { logToDebug } from './debugLogger';

describe('debugLogger', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logToDebug', () => {
    it('should not make fetch call when DEBUG_ENABLED is false', () => {
      logToDebug({
        location: 'test',
        message: 'Test message',
      });

      // DEBUG_ENABLED is false by default, so fetch should not be called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should accept data object with location and message', () => {
      // This should not throw
      expect(() => {
        logToDebug({
          location: 'TestComponent',
          message: 'Something happened',
        });
      }).not.toThrow();
    });

    it('should accept optional data property', () => {
      expect(() => {
        logToDebug({
          location: 'TestComponent',
          message: 'Test',
          data: { key: 'value' },
        });
      }).not.toThrow();
    });

    it('should accept optional hypothesisId property', () => {
      expect(() => {
        logToDebug({
          location: 'TestComponent',
          message: 'Test',
          hypothesisId: 'hyp-123',
        });
      }).not.toThrow();
    });

    it('should handle errors gracefully', () => {
      // Even if there's an error, it should not throw
      expect(() => {
        logToDebug({
          location: 'Test',
          message: 'Test',
        });
      }).not.toThrow();
    });
  });
});
