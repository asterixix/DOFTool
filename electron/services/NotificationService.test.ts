import { Notification } from 'electron';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NotificationService } from './NotificationService';

import type { StorageService } from './StorageService';

// Mock Electron Notification
vi.mock('electron', () => ({
  Notification: vi.fn().mockImplementation((options) => ({
    show: vi.fn(),
    ...options,
  })),
}));

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid'),
  },
});

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockStorageService: StorageService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorageService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as StorageService;

    notificationService = new NotificationService(mockStorageService);
  });

  describe('initialize', () => {
    it('should initialize with default preferences', async () => {
      await notificationService.initialize();

      const prefs = notificationService.getPreferences();
      expect(prefs.paused).toBe(false);
      expect(prefs.historyLimit).toBe(200);
      expect(prefs.modules.calendar.enabled).toBe(true);
    });

    it('should load preferences from storage', async () => {
      const storedPrefs = {
        paused: true,
        historyLimit: 100,
        modules: {
          calendar: { enabled: false, allowUrgent: false, allowSound: false },
        },
      };

      mockStorageService.get = vi.fn((key: string) => {
        if (key === 'notifications:preferences') {
          return Promise.resolve(JSON.stringify(storedPrefs));
        }
        return Promise.resolve(null);
      }) as typeof mockStorageService.get;

      await notificationService.initialize();

      const prefs = notificationService.getPreferences();
      expect(prefs.paused).toBe(true);
      expect(prefs.historyLimit).toBe(100);
      expect(prefs.modules.calendar.enabled).toBe(false);
    });

    it('should handle invalid stored preferences', async () => {
      mockStorageService.get = vi.fn((key: string) => {
        if (key === 'notifications:preferences') {
          return Promise.resolve('invalid json');
        }
        return Promise.resolve(null);
      }) as typeof mockStorageService.get;

      await notificationService.initialize();

      const prefs = notificationService.getPreferences();
      expect(prefs.paused).toBe(false); // Uses defaults
    });
  });

  describe('getPreferences', () => {
    it('should return current preferences', () => {
      const prefs = notificationService.getPreferences();
      expect(prefs).toBeDefined();
      expect(prefs).toHaveProperty('paused');
      expect(prefs).toHaveProperty('modules');
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      await notificationService.initialize();

      const updated = await notificationService.updatePreferences({
        paused: true,
        historyLimit: 150,
      });

      expect(updated.paused).toBe(true);
      expect(updated.historyLimit).toBe(150);
      expect(mockStorageService.set).toHaveBeenCalled();
    });

    it('should merge module preferences', async () => {
      await notificationService.initialize();

      const updated = await notificationService.updatePreferences({
        modules: {
          calendar: { enabled: false },
        },
      });

      expect(updated.modules.calendar.enabled).toBe(false);
      expect(updated.modules.calendar.allowUrgent).toBe(true); // Keeps other values
    });
  });

  describe('getHistory', () => {
    it('should return empty history initially', () => {
      const history = notificationService.getHistory();
      expect(history).toEqual([]);
    });

    it('should return notification history', async () => {
      await notificationService.initialize();

      await notificationService.emit({
        module: 'calendar',
        title: 'Test Notification',
        priority: 'normal',
      });

      const history = notificationService.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe('Test Notification');
    });
  });

  describe('clearHistory', () => {
    it('should clear history', async () => {
      await notificationService.initialize();

      await notificationService.emit({
        module: 'calendar',
        title: 'Test',
        priority: 'normal',
      });

      await notificationService.clearHistory();

      const history = notificationService.getHistory();
      expect(history).toEqual([]);
    });
  });

  describe('emit', () => {
    beforeEach(async () => {
      await notificationService.initialize();
    });

    it('should emit notification when enabled', async () => {
      const item = await notificationService.emit({
        module: 'calendar',
        title: 'Test Notification',
        body: 'Test body',
        priority: 'normal',
      });

      expect(item).toBeDefined();
      expect(item?.title).toBe('Test Notification');
      expect(mockStorageService.set).toHaveBeenCalled();
    });

    it('should not show notification when paused', async () => {
      await notificationService.updatePreferences({ paused: true });

      const item = await notificationService.emit({
        module: 'calendar',
        title: 'Test',
        priority: 'normal',
      });

      expect(item).toBeDefined();
      expect(Notification).not.toHaveBeenCalled();
    });

    it('should not show notification when module disabled', async () => {
      await notificationService.updatePreferences({
        modules: {
          calendar: { enabled: false },
        },
      });

      const item = await notificationService.emit({
        module: 'calendar',
        title: 'Test',
        priority: 'normal',
      });

      expect(item).toBeDefined();
      expect(Notification).not.toHaveBeenCalled();
    });

    it('should show urgent notification even when module disabled', async () => {
      await notificationService.updatePreferences({
        modules: {
          calendar: { enabled: false, allowUrgent: true },
        },
      });

      const item = await notificationService.emit({
        module: 'calendar',
        title: 'Urgent',
        priority: 'urgent',
      });

      expect(item).toBeDefined();
      expect(Notification).toHaveBeenCalled();
    });

    it('should not show silent notifications', async () => {
      const item = await notificationService.emit({
        module: 'calendar',
        title: 'Silent',
        priority: 'silent',
      });

      expect(item).toBeDefined();
      expect(Notification).not.toHaveBeenCalled();
    });

    it('should limit history size', async () => {
      await notificationService.updatePreferences({ historyLimit: 2 });

      await notificationService.emit({
        module: 'calendar',
        title: 'First',
        priority: 'normal',
      });
      await notificationService.emit({
        module: 'calendar',
        title: 'Second',
        priority: 'normal',
      });
      await notificationService.emit({
        module: 'calendar',
        title: 'Third',
        priority: 'normal',
      });

      const history = notificationService.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].title).toBe('Third'); // Most recent first
    });
  });
});
