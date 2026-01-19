import { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useNotifications } from './useNotifications';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useNotifications', () => {
  const mockNotificationsAPI = {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    getHistory: vi.fn(),
    clearHistory: vi.fn(),
    emit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Setup mock electronAPI
    (window as unknown as { electronAPI: { notifications?: unknown } }).electronAPI = {
      notifications: mockNotificationsAPI,
    };

    // Setup default mocks
    mockNotificationsAPI.getPreferences.mockResolvedValue({
      paused: false,
      modules: {
        calendar: { enabled: true, allowUrgent: true, allowSound: true },
        tasks: { enabled: true, allowUrgent: true, allowSound: true },
        email: { enabled: true, allowUrgent: true, allowSound: true },
        family: { enabled: true, allowUrgent: true, allowSound: true },
        system: { enabled: true, allowUrgent: true, allowSound: true },
      },
      historyLimit: 100,
    });

    mockNotificationsAPI.getHistory.mockResolvedValue([]);
    mockNotificationsAPI.clearHistory.mockResolvedValue({ success: true });
    mockNotificationsAPI.updatePreferences.mockImplementation((update: Partial<unknown>) =>
      Promise.resolve({
        paused: false,
        modules: {
          calendar: { enabled: true, allowUrgent: true, allowSound: true },
          tasks: { enabled: true, allowUrgent: true, allowSound: true },
          email: { enabled: true, allowUrgent: true, allowSound: true },
          family: { enabled: true, allowUrgent: true, allowSound: true },
          system: { enabled: true, allowUrgent: true, allowSound: true },
        },
        historyLimit: 100,
        ...update,
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.history).toEqual([]);
    expect(result.current.preferences).toBeNull();
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should load preferences and history on mount', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockNotificationsAPI.getPreferences).toHaveBeenCalled();
    expect(mockNotificationsAPI.getHistory).toHaveBeenCalled();
    expect(result.current.preferences).toBeDefined();
    expect(result.current.history).toBeDefined();
  });

  it('should refresh history', async () => {
    const historyItems = [
      {
        id: '1',
        module: 'calendar' as const,
        title: 'Test',
        body: 'Test body',
        priority: 'normal' as const,
        createdAt: Date.now(),
      },
    ];

    mockNotificationsAPI.getHistory.mockResolvedValue(historyItems);

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshHistory();
    });

    expect(result.current.history).toEqual(historyItems);
  });

  it('should refresh preferences', async () => {
    const newPreferences = {
      paused: true,
      modules: {
        calendar: { enabled: false, allowUrgent: false, allowSound: false },
        tasks: { enabled: true, allowUrgent: true, allowSound: true },
        email: { enabled: true, allowUrgent: true, allowSound: true },
        family: { enabled: true, allowUrgent: true, allowSound: true },
        system: { enabled: true, allowUrgent: true, allowSound: true },
      },
      historyLimit: 50,
    };

    mockNotificationsAPI.getPreferences.mockResolvedValue(newPreferences);

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshPreferences();
    });

    expect(result.current.preferences).toEqual(newPreferences);
  });

  it('should clear history', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const success = await act(async () => {
      return await result.current.clearHistory();
    });

    expect(success).toBe(true);
    expect(mockNotificationsAPI.clearHistory).toHaveBeenCalled();
    expect(result.current.history).toEqual([]);
  });

  it('should update preferences', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const success = await act(async () => {
      return await result.current.updatePreferences({ paused: true });
    });

    expect(success).toBe(true);
    expect(mockNotificationsAPI.updatePreferences).toHaveBeenCalledWith({ paused: true });
  });

  it('should toggle paused state', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const success = await act(async () => {
      return await result.current.togglePaused();
    });

    expect(success).toBe(true);
    expect(mockNotificationsAPI.updatePreferences).toHaveBeenCalled();
  });

  it('should toggle module enabled state', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const success = await act(async () => {
      return await result.current.toggleModuleEnabled('calendar');
    });

    expect(success).toBe(true);
    expect(mockNotificationsAPI.updatePreferences).toHaveBeenCalled();
  });

  it('should calculate unread count', async () => {
    const now = Date.now();
    const historyItems = [
      {
        id: '1',
        module: 'calendar' as const,
        title: 'Old',
        priority: 'normal' as const,
        createdAt: now - 10000,
      },
      {
        id: '2',
        module: 'tasks' as const,
        title: 'New',
        priority: 'normal' as const,
        createdAt: now - 1000,
      },
    ];

    mockNotificationsAPI.getHistory.mockResolvedValue(historyItems);
    localStorageMock.getItem.mockReturnValue(String(now - 5000));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should count items after lastViewedAt (now - 5000)
    // So only item 2 (now - 1000) should be unread
    expect(result.current.unreadCount).toBe(1);
  });

  it('should mark as viewed', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.markAsViewed();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'notifications:lastViewedAt',
      expect.any(String)
    );
  });

  it('should handle errors when loading preferences', async () => {
    mockNotificationsAPI.getPreferences.mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load');
  });

  it('should handle errors when loading history', async () => {
    mockNotificationsAPI.getHistory.mockRejectedValue(new Error('Failed to load history'));
    mockNotificationsAPI.getPreferences.mockResolvedValue({
      paused: false,
      modules: {
        calendar: { enabled: true, allowUrgent: true, allowSound: true },
        tasks: { enabled: true, allowUrgent: true, allowSound: true },
        email: { enabled: true, allowUrgent: true, allowSound: true },
        family: { enabled: true, allowUrgent: true, allowSound: true },
        system: { enabled: true, allowUrgent: true, allowSound: true },
      },
      historyLimit: 100,
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load history');
  });

  it('should listen for notification updates', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate notification update event
    const updateEvent = new Event('notifications:updated');
    act(() => {
      window.dispatchEvent(updateEvent);
    });

    await waitFor(() => {
      expect(mockNotificationsAPI.getHistory).toHaveBeenCalledTimes(2);
    });
  });

  it('should cleanup event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNotifications());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('notifications:updated', expect.any(Function));
  });
});
