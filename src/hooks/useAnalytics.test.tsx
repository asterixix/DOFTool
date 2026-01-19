import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { track, trackAction, trackScreen } from '@/shared/services/analytics';

import { usePageTracking, trackModuleAction, trackFeature } from './useAnalytics';

// Mock analytics service
vi.mock('@/shared/services/analytics', () => ({
  track: vi.fn(),
  trackAction: vi.fn(),
  trackScreen: vi.fn(),
}));

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('usePageTracking', () => {
    it('should track screen view on mount with default route', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
      );

      renderHook(() => usePageTracking(), { wrapper });

      expect(trackScreen).toHaveBeenCalledWith('welcome');
    });

    it('should track screen view for route path', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/calendar']}>{children}</MemoryRouter>
      );

      renderHook(() => usePageTracking(), { wrapper });

      expect(trackScreen).toHaveBeenCalledWith('calendar');
    });

    it('should track screen view on route change', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/tasks']}>{children}</MemoryRouter>
      );

      renderHook(() => usePageTracking(), { wrapper });

      expect(trackScreen).toHaveBeenCalledWith('tasks');
    });
  });

  describe('trackModuleAction', () => {
    it('should track action with module context', () => {
      trackModuleAction('calendar', 'event_created', { eventId: '123' });

      expect(trackAction).toHaveBeenCalledWith('event_created', {
        module: 'calendar',
        eventId: '123',
      });
    });

    it('should track action without additional properties', () => {
      trackModuleAction('tasks', 'task_completed');

      expect(trackAction).toHaveBeenCalledWith('task_completed', {
        module: 'tasks',
      });
    });

    it('should track action with multiple modules', () => {
      trackModuleAction('email', 'message_sent', { to: 'test@example.com' });
      trackModuleAction('family', 'member_added', { memberId: '456' });

      expect(trackAction).toHaveBeenCalledTimes(2);
      expect(trackAction).toHaveBeenNthCalledWith(1, 'message_sent', {
        module: 'email',
        to: 'test@example.com',
      });
      expect(trackAction).toHaveBeenNthCalledWith(2, 'member_added', {
        module: 'family',
        memberId: '456',
      });
    });
  });

  describe('trackFeature', () => {
    it('should track feature usage', () => {
      trackFeature('encryption', { algorithm: 'XChaCha20' });

      expect(track).toHaveBeenCalledWith('feature_used', {
        feature: 'encryption',
        algorithm: 'XChaCha20',
      });
    });

    it('should track feature usage without properties', () => {
      trackFeature('sync');

      expect(track).toHaveBeenCalledWith('feature_used', {
        feature: 'sync',
      });
    });

    it('should track multiple features', () => {
      trackFeature('calendar_view', { view: 'month' });
      trackFeature('task_filter', { filter: 'active' });

      expect(track).toHaveBeenCalledTimes(2);
      expect(track).toHaveBeenNthCalledWith(1, 'feature_used', {
        feature: 'calendar_view',
        view: 'month',
      });
      expect(track).toHaveBeenNthCalledWith(2, 'feature_used', {
        feature: 'task_filter',
        filter: 'active',
      });
    });
  });
});
