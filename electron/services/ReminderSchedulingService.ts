/**
 * ReminderSchedulingService - Handles scheduling and triggering calendar event reminders
 * Uses the built-in NotificationService for all reminder notifications
 */

import type { NotificationService, NotificationPriority } from './NotificationService';
import type { StorageService } from './StorageService';

export interface CalendarEventReminder {
  id: string;
  minutes: number;
  enabled?: boolean;
  sent?: boolean;
  sentAt?: number;
}

export interface CalendarEventForReminder {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: number;
  end: number;
  allDay: boolean;
  category?: string;
  reminders: CalendarEventReminder[];
}

export interface ReminderPreferences {
  enabled: boolean;
  categories?: string[]; // Only trigger for specific categories (undefined = all)
  minMinutesBefore?: number; // Don't trigger reminders less than X minutes before
  maxRemindersPerEvent?: number; // Limit number of reminders per event
}

export interface ReminderSettings {
  global: ReminderPreferences;
  calendarOverrides?: Record<string, Partial<ReminderPreferences>>; // Per-calendar overrides
}

export class ReminderSchedulingService {
  private readonly storageService: StorageService;
  private readonly notificationService: NotificationService;
  private reminderTimers: Map<string, NodeJS.Timeout[]> = new Map();
  private settings: ReminderSettings;

  public constructor(storageService: StorageService, notificationService: NotificationService) {
    this.storageService = storageService;
    this.notificationService = notificationService;
    this.settings = ReminderSchedulingService.getDefaultSettings();
  }

  public async initialize(): Promise<void> {
    const storedSettings = await this.storageService.get('calendar:reminderSettings');
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings) as unknown;
        this.settings = ReminderSchedulingService.parseSettings(parsed);
      } catch {
        this.settings = ReminderSchedulingService.getDefaultSettings();
      }
    }

    await this.persistSettings();
  }

  public getSettings(): ReminderSettings {
    return { ...this.settings };
  }

  public async updateSettings(update: Partial<ReminderSettings>): Promise<ReminderSettings> {
    this.settings = {
      ...this.settings,
      ...update,
      global: {
        ...this.settings.global,
        ...(update.global ?? {}),
      },
      calendarOverrides: {
        ...this.settings.calendarOverrides,
        ...(update.calendarOverrides ?? {}),
      },
    };

    await this.persistSettings();
    return this.getSettings();
  }

  public clearEventReminders(eventId: string): void {
    const timers = this.reminderTimers.get(eventId);
    if (timers) {
      timers.forEach((timer) => clearTimeout(timer));
      this.reminderTimers.delete(eventId);
    }
  }

  public scheduleEventReminders(event: CalendarEventForReminder): void {
    this.clearEventReminders(event.id);

    const preferences = this.getPreferencesForCalendar(event.calendarId);

    if (!preferences.enabled || !event.reminders?.length) {
      return;
    }

    // Filter reminders based on preferences
    const validReminders = this.filterReminders(event, preferences);

    if (validReminders.length === 0) {
      return;
    }

    const timers: NodeJS.Timeout[] = [];
    const now = Date.now();

    for (const reminder of validReminders) {
      if (reminder.enabled === false) {
        continue;
      }

      const minutes = reminder.minutes ?? 0;
      const triggerAt = event.start - minutes * 60_000;
      const delay = triggerAt - now;

      // Skip past reminders
      if (delay <= 0) {
        continue;
      }

      // Check minimum minutes before setting
      if (preferences.minMinutesBefore !== undefined && minutes < preferences.minMinutesBefore) {
        continue;
      }

      const timeout = setTimeout(() => {
        void this.triggerReminder(event, reminder);
      }, delay);

      timers.push(timeout);
    }

    if (timers.length > 0) {
      this.reminderTimers.set(event.id, timers);
    }
  }

  private getPreferencesForCalendar(calendarId: string): ReminderPreferences {
    const override = this.settings.calendarOverrides?.[calendarId];
    if (!override) {
      return this.settings.global;
    }

    return {
      ...this.settings.global,
      ...override,
    };
  }

  private filterReminders(
    event: CalendarEventForReminder,
    preferences: ReminderPreferences
  ): CalendarEventReminder[] {
    let reminders = event.reminders ?? [];

    // Filter by category if specified
    if (preferences.categories && event.category) {
      if (!preferences.categories.includes(event.category)) {
        return [];
      }
    }

    // Limit number of reminders
    if (preferences.maxRemindersPerEvent) {
      reminders = reminders.slice(0, preferences.maxRemindersPerEvent);
    }

    return reminders;
  }

  private async triggerReminder(
    event: CalendarEventForReminder,
    reminder: CalendarEventReminder
  ): Promise<void> {
    const minutes = reminder.minutes ?? 0;
    const priority: NotificationPriority = minutes <= 5 ? 'urgent' : 'normal';

    const timeStr = event.allDay
      ? new Date(event.start).toLocaleDateString()
      : new Date(event.start).toLocaleString();

    let body = `Starts ${this.formatTimeBefore(minutes)}`;
    if (event.location) {
      body += `\nLocation: ${event.location}`;
    }

    await this.notificationService.emit({
      module: 'calendar',
      title: `Reminder: ${event.title}`,
      body,
      priority,
      data: {
        eventId: event.id,
        calendarId: event.calendarId,
        reminderId: reminder.id,
        triggerTime: timeStr,
      },
    });
  }

  private formatTimeBefore(minutes: number): string {
    if (minutes === 0) {
      return 'now';
    }

    if (minutes < 60) {
      return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    const days = Math.floor(minutes / 1440);
    return `in ${days} day${days !== 1 ? 's' : ''}`;
  }

  private async persistSettings(): Promise<void> {
    await this.storageService.set('calendar:reminderSettings', JSON.stringify(this.settings));
  }

  private static getDefaultSettings(): ReminderSettings {
    return {
      global: {
        enabled: true,
        categories: undefined,
        minMinutesBefore: 0,
        maxRemindersPerEvent: 5,
      },
      calendarOverrides: undefined,
    };
  }

  private static parseSettings(value: unknown): ReminderSettings {
    const defaults = ReminderSchedulingService.getDefaultSettings();

    if (!ReminderSchedulingService.isRecord(value)) {
      return defaults;
    }

    const globalValue = value.global;
    const global: ReminderPreferences = ReminderSchedulingService.isRecord(globalValue)
      ? {
          enabled:
            typeof globalValue.enabled === 'boolean'
              ? globalValue.enabled
              : defaults.global.enabled,
          categories:
            Array.isArray(globalValue.categories) &&
            globalValue.categories.every((c) => typeof c === 'string')
              ? globalValue.categories
              : defaults.global.categories,
          minMinutesBefore:
            typeof globalValue.minMinutesBefore === 'number'
              ? globalValue.minMinutesBefore
              : defaults.global.minMinutesBefore,
          maxRemindersPerEvent:
            typeof globalValue.maxRemindersPerEvent === 'number'
              ? globalValue.maxRemindersPerEvent
              : defaults.global.maxRemindersPerEvent,
        }
      : defaults.global;

    return {
      global,
      calendarOverrides: ReminderSchedulingService.isRecord(value.calendarOverrides)
        ? (value.calendarOverrides as Record<string, Partial<ReminderPreferences>>)
        : undefined,
    };
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
