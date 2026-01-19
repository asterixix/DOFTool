import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ReminderSchedulingService } from './ReminderSchedulingService';

import type { NotificationService, NotificationPriority } from './NotificationService';
import type { StorageService } from './StorageService';

describe('ReminderSchedulingService', () => {
  let reminderService: ReminderSchedulingService;
  let mockStorageService: StorageService;
  let mockNotificationService: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();

    mockStorageService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as StorageService;

    mockNotificationService = {
      emit: vi.fn().mockResolvedValue(null),
    } as unknown as NotificationService;

    reminderService = new ReminderSchedulingService(mockStorageService, mockNotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('initialize', () => {
    it('should initialize with default settings', async () => {
      await reminderService.initialize();

      const settings = reminderService.getSettings();
      expect(settings.global.enabled).toBe(true);
      expect(settings.global.maxRemindersPerEvent).toBe(5);
    });

    it('should load settings from storage', async () => {
      const storedSettings = {
        global: {
          enabled: false,
          maxRemindersPerEvent: 3,
        },
      };

      mockStorageService.get = vi.fn((key: string) => {
        if (key === 'calendar:reminderSettings') {
          return Promise.resolve(JSON.stringify(storedSettings));
        }
        return Promise.resolve(null);
      }) as typeof mockStorageService.get;

      await reminderService.initialize();

      const settings = reminderService.getSettings();
      expect(settings.global.enabled).toBe(false);
      expect(settings.global.maxRemindersPerEvent).toBe(3);
    });

    it('should handle invalid stored settings', async () => {
      mockStorageService.get = vi.fn((key: string) => {
        if (key === 'calendar:reminderSettings') {
          return Promise.resolve('invalid json');
        }
        return Promise.resolve(null);
      }) as typeof mockStorageService.get;

      await reminderService.initialize();

      const settings = reminderService.getSettings();
      expect(settings.global.enabled).toBe(true); // Uses defaults
    });
  });

  describe('updateSettings', () => {
    it('should update global settings', async () => {
      await reminderService.initialize();

      const updated = await reminderService.updateSettings({
        global: { enabled: false },
      });

      expect(updated.global.enabled).toBe(false);
      expect(mockStorageService.set).toHaveBeenCalled();
    });

    it('should merge calendar overrides', async () => {
      await reminderService.initialize();

      const updated = await reminderService.updateSettings({
        calendarOverrides: {
          'cal-1': { enabled: false },
        },
      });

      expect(updated.calendarOverrides?.['cal-1']?.enabled).toBe(false);
    });
  });

  describe('clearEventReminders', () => {
    it('should clear reminders for event', async () => {
      await reminderService.initialize();

      const event = {
        id: 'event-1',
        calendarId: 'cal-1',
        title: 'Test Event',
        start: Date.now() + 60000, // 1 minute from now
        end: Date.now() + 3600000,
        allDay: false,
        reminders: [{ id: 'reminder-1', minutes: 0 }],
      };

      reminderService.scheduleEventReminders(event);

      // Clear reminders
      reminderService.clearEventReminders('event-1');

      // Advance time past reminder trigger
      vi.advanceTimersByTime(61000);

      expect(mockNotificationService.emit).not.toHaveBeenCalled();
    });
  });

  describe('scheduleEventReminders', () => {
    beforeEach(async () => {
      await reminderService.initialize();
    });

    it('should schedule reminders for event', () => {
      const event = {
        id: 'event-1',
        calendarId: 'cal-1',
        title: 'Test Event',
        start: Date.now() + 60000, // 1 minute from now
        end: Date.now() + 3600000,
        allDay: false,
        reminders: [{ id: 'reminder-1', minutes: 0 }],
      };

      reminderService.scheduleEventReminders(event);

      // Advance time to trigger reminder
      vi.advanceTimersByTime(61000);

      expect(mockNotificationService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'calendar',
          title: expect.stringContaining('Test Event'),
        })
      );
    });

    it('should not schedule reminders when disabled', async () => {
      await reminderService.updateSettings({
        global: { enabled: false },
      });

      const event = {
        id: 'event-1',
        calendarId: 'cal-1',
        title: 'Test Event',
        start: Date.now() + 60000,
        end: Date.now() + 3600000,
        allDay: false,
        reminders: [{ id: 'reminder-1', minutes: 0 }],
      };

      reminderService.scheduleEventReminders(event);

      vi.advanceTimersByTime(61000);

      expect(mockNotificationService.emit).not.toHaveBeenCalled();
    });

    it('should filter reminders by category', async () => {
      await reminderService.updateSettings({
        global: {
          enabled: true,
          categories: ['work'],
        },
      });

      const event = {
        id: 'event-1',
        calendarId: 'cal-1',
        title: 'Test Event',
        start: Date.now() + 60000,
        end: Date.now() + 3600000,
        allDay: false,
        category: 'personal', // Different category
        reminders: [{ id: 'reminder-1', minutes: 0 }],
      };

      reminderService.scheduleEventReminders(event);

      vi.advanceTimersByTime(61000);

      expect(mockNotificationService.emit).not.toHaveBeenCalled();
    });

    it('should limit reminders per event', async () => {
      // Set max reminders to 2
      await reminderService.updateSettings({
        global: {
          enabled: true,
          maxRemindersPerEvent: 2,
        },
      });

      const event = {
        id: 'event-1',
        calendarId: 'cal-1',
        title: 'Test Event',
        start: Date.now() + 60000,
        end: Date.now() + 3600000,
        allDay: false,
        reminders: [
          { id: 'reminder-1', minutes: 0 },
          { id: 'reminder-2', minutes: 5 },
          { id: 'reminder-3', minutes: 10 },
        ],
      };

      reminderService.scheduleEventReminders(event);

      // Only first 2 reminders should be scheduled
      vi.advanceTimersByTime(61000);
      expect(mockNotificationService.emit).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(6000); // Total 67000ms
      expect(mockNotificationService.emit).toHaveBeenCalledTimes(2);

      // Third reminder should not trigger
      vi.advanceTimersByTime(5000);
      expect(mockNotificationService.emit).toHaveBeenCalledTimes(2);
    });

    it('should skip past reminders', () => {
      const pastTime = Date.now() - 60000; // 1 minute ago
      const event = {
        id: 'event-1',
        calendarId: 'cal-1',
        title: 'Test Event',
        start: pastTime,
        end: pastTime + 3600000,
        allDay: false,
        reminders: [{ id: 'reminder-1', minutes: 0 }],
      };

      reminderService.scheduleEventReminders(event);

      // Advance time - reminder should not trigger as it's in the past
      vi.advanceTimersByTime(1000);

      expect(mockNotificationService.emit).not.toHaveBeenCalled();
    });

    it('should use urgent priority for reminders 5 minutes or less', async () => {
      const event = {
        id: 'event-1',
        calendarId: 'cal-1',
        title: 'Test Event',
        start: Date.now() + 300000, // 5 minutes from now
        end: Date.now() + 3600000,
        allDay: false,
        reminders: [{ id: 'reminder-1', minutes: 5 }],
      };

      reminderService.scheduleEventReminders(event);

      // Wait for the timeout to trigger
      await vi.advanceTimersByTimeAsync(240001); // Advance to trigger time

      expect(mockNotificationService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'urgent',
        })
      );
    });
  });

  describe('calendar overrides', () => {
    it('should use calendar-specific settings', async () => {
      await reminderService.updateSettings({
        global: { enabled: true },
        calendarOverrides: {
          'cal-1': { enabled: false },
        },
      });

      const event = {
        id: 'event-1',
        calendarId: 'cal-1', // Uses override
        title: 'Test Event',
        start: Date.now() + 60000,
        end: Date.now() + 3600000,
        allDay: false,
        reminders: [{ id: 'reminder-1', minutes: 0 }],
      };

      reminderService.scheduleEventReminders(event);

      vi.advanceTimersByTime(61000);

      // Should not trigger because calendar override disables reminders
      expect(mockNotificationService.emit).not.toHaveBeenCalled();
    });

    it('should fallback to global settings when no override', async () => {
      await reminderService.updateSettings({
        global: { enabled: true },
      });

      const event = {
        id: 'event-1',
        calendarId: 'cal-other', // No override
        title: 'Test Event',
        start: Date.now() + 60000,
        end: Date.now() + 3600000,
        allDay: false,
        reminders: [{ id: 'reminder-1', minutes: 0 }],
      };

      reminderService.scheduleEventReminders(event);

      vi.advanceTimersByTime(61000);

      expect(mockNotificationService.emit).toHaveBeenCalled();
    });
  });
});
