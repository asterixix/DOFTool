import { describe, it, expect, vi, beforeEach } from 'vitest';
import { track, trackScreen, trackAction, updateAnalyticsState } from './analytics';

vi.mock('@/stores/settings.store', () => ({
  useSettingsStore: {
    getState: vi.fn(() => ({
      privacy: { analyticsEnabled: false },
    })),
    subscribe: vi.fn(),
  },
}));

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('track', () => {
    it('should not throw when analytics is disabled', () => {
      expect(() => track('test_event')).not.toThrow();
    });

    it('should accept properties parameter', () => {
      expect(() => track('test_event', { key: 'value' })).not.toThrow();
    });

    it('should handle complex properties', () => {
      expect(() =>
        track('test_event', {
          string: 'value',
          number: 123,
          boolean: true,
          object: { nested: 'value' },
        })
      ).not.toThrow();
    });
  });

  describe('trackScreen', () => {
    it('should not throw', () => {
      expect(() => trackScreen('HomeScreen')).not.toThrow();
    });

    it('should accept additional properties', () => {
      expect(() => trackScreen('HomeScreen', { tab: 'calendar' })).not.toThrow();
    });
  });

  describe('trackAction', () => {
    it('should not throw', () => {
      expect(() => trackAction('button_click')).not.toThrow();
    });

    it('should accept additional properties', () => {
      expect(() => trackAction('button_click', { button: 'submit' })).not.toThrow();
    });
  });

  describe('updateAnalyticsState', () => {
    it('should not throw', () => {
      expect(() => updateAnalyticsState()).not.toThrow();
    });
  });
});
