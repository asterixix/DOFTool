/**
 * useNotifications - Hook for managing notifications
 *
 * Provides access to notification history, preferences, and actions
 * with automatic updates from the main process.
 */

import { useCallback, useEffect, useState } from 'react';

type NotificationModule = 'calendar' | 'tasks' | 'email' | 'family' | 'system';
type NotificationPriority = 'silent' | 'normal' | 'urgent';

interface NotificationModulePreferences {
  enabled: boolean;
  allowUrgent: boolean;
  allowSound: boolean;
}

interface NotificationPreferences {
  paused: boolean;
  modules: Record<NotificationModule, NotificationModulePreferences>;
  historyLimit: number;
}

interface NotificationHistoryItem {
  id: string;
  module: NotificationModule;
  title: string;
  body?: string;
  priority: NotificationPriority;
  createdAt: number;
  data?: Record<string, unknown>;
}

interface NotificationsAPI {
  getPreferences: () => Promise<NotificationPreferences>;
  updatePreferences: (update: Partial<NotificationPreferences>) => Promise<NotificationPreferences>;
  getHistory: () => Promise<NotificationHistoryItem[]>;
  clearHistory: () => Promise<{ success: boolean }>;
  emit: (event: {
    module: NotificationModule;
    title: string;
    body?: string;
    priority: NotificationPriority;
    data?: Record<string, unknown>;
  }) => Promise<NotificationHistoryItem | null>;
}

function getNotificationsAPI(): NotificationsAPI {
  const api = (window as unknown as { electronAPI?: { notifications?: NotificationsAPI } })
    .electronAPI?.notifications;
  if (!api) {
    throw new Error('Notifications API not available');
  }
  return api;
}

interface UseNotificationsReturn {
  // State
  history: NotificationHistoryItem[];
  preferences: NotificationPreferences | null;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshHistory: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
  clearHistory: () => Promise<boolean>;
  updatePreferences: (update: Partial<NotificationPreferences>) => Promise<boolean>;
  togglePaused: () => Promise<boolean>;
  toggleModuleEnabled: (module: NotificationModule) => Promise<boolean>;
  markAsViewed: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastViewedAt, setLastViewedAt] = useState<number>(() => {
    const stored = localStorage.getItem('notifications:lastViewedAt');
    return stored ? parseInt(stored, 10) : 0;
  });

  // Calculate unread count
  const unreadCount = history.filter((item) => item.createdAt > lastViewedAt).length;

  // Refresh history from main process
  const refreshHistory = useCallback(async (): Promise<void> => {
    try {
      const api = getNotificationsAPI();
      const items = await api.getHistory();
      setHistory(items);
      setError(null);
    } catch (err) {
      console.error('[useNotifications] Failed to refresh history:', err);
      setError(err instanceof Error ? err.message : 'Failed to get notifications');
    }
  }, []);

  // Refresh preferences from main process
  const refreshPreferences = useCallback(async (): Promise<void> => {
    try {
      const api = getNotificationsAPI();
      const prefs = await api.getPreferences();
      setPreferences(prefs);
      setError(null);
    } catch (err) {
      console.error('[useNotifications] Failed to refresh preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to get preferences');
    }
  }, []);

  // Clear notification history
  const clearHistory = useCallback(async (): Promise<boolean> => {
    try {
      const api = getNotificationsAPI();
      const result = await api.clearHistory();
      if (result.success) {
        setHistory([]);
      }
      return result.success;
    } catch (err) {
      console.error('[useNotifications] Failed to clear history:', err);
      return false;
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(
    async (update: Partial<NotificationPreferences>): Promise<boolean> => {
      try {
        const api = getNotificationsAPI();
        const updated = await api.updatePreferences(update);
        setPreferences(updated);
        return true;
      } catch (err) {
        console.error('[useNotifications] Failed to update preferences:', err);
        return false;
      }
    },
    []
  );

  // Toggle paused state
  const togglePaused = useCallback(async (): Promise<boolean> => {
    if (!preferences) {return false;}
    return updatePreferences({ paused: !preferences.paused });
  }, [preferences, updatePreferences]);

  // Toggle module enabled state
  const toggleModuleEnabled = useCallback(
    async (module: NotificationModule): Promise<boolean> => {
      if (!preferences) {return false;}
      const modulePrefs = preferences.modules[module];
      return updatePreferences({
        modules: {
          ...preferences.modules,
          [module]: {
            ...modulePrefs,
            enabled: !modulePrefs.enabled,
          },
        },
      } as Partial<NotificationPreferences>);
    },
    [preferences, updatePreferences]
  );

  // Mark as viewed (update lastViewedAt)
  const markAsViewed = useCallback((): void => {
    const now = Date.now();
    setLastViewedAt(now);
    localStorage.setItem('notifications:lastViewedAt', String(now));
  }, []);

  // Initial load
  useEffect(() => {
    const load = async (): Promise<void> => {
      setIsLoading(true);
      await Promise.all([refreshHistory(), refreshPreferences()]);
      setIsLoading(false);
    };
    void load();
  }, [refreshHistory, refreshPreferences]);

  // Listen for notification updates
  useEffect(() => {
    const handleUpdate = (): void => {
      void refreshHistory();
    };

    window.addEventListener('notifications:updated', handleUpdate);

    return () => {
      window.removeEventListener('notifications:updated', handleUpdate);
    };
  }, [refreshHistory]);

  return {
    history,
    preferences,
    unreadCount,
    isLoading,
    error,
    refreshHistory,
    refreshPreferences,
    clearHistory,
    updatePreferences,
    togglePaused,
    toggleModuleEnabled,
    markAsViewed,
  };
}

export type {
  NotificationModule,
  NotificationPriority,
  NotificationPreferences,
  NotificationHistoryItem,
  NotificationModulePreferences,
};
