import crypto from 'crypto';

import { Notification } from 'electron';

import type { StorageService } from './StorageService';

export type NotificationModule = 'calendar' | 'tasks' | 'email' | 'family' | 'system';
export type NotificationPriority = 'silent' | 'normal' | 'urgent';

export interface NotificationModulePreferences {
  enabled: boolean;
  allowUrgent: boolean;
  allowSound: boolean;
}

export interface NotificationPreferences {
  paused: boolean;
  modules: Record<NotificationModule, NotificationModulePreferences>;
  historyLimit: number;
}

export interface NotificationPreferencesUpdate {
  paused?: boolean;
  historyLimit?: number;
  modules?: Partial<Record<NotificationModule, Partial<NotificationModulePreferences>>>;
}

export interface NotificationEvent {
  module: NotificationModule;
  title: string;
  body?: string;
  priority: NotificationPriority;
  createdAt?: number;
  data?: Record<string, unknown>;
}

export interface NotificationHistoryItem extends Required<
  Pick<NotificationEvent, 'module' | 'title' | 'priority'>
> {
  id: string;
  body?: string;
  createdAt: number;
  data?: Record<string, unknown>;
}

export class NotificationService {
  private readonly storageService: StorageService;
  private preferences: NotificationPreferences;
  private history: NotificationHistoryItem[];

  public constructor(storageService: StorageService) {
    this.storageService = storageService;
    this.preferences = NotificationService.getDefaultPreferences();
    this.history = [];
  }

  public async initialize(): Promise<void> {
    const storedPreferences = await this.storageService.get('notifications:preferences');
    if (storedPreferences) {
      try {
        const parsed = JSON.parse(storedPreferences) as unknown;
        this.preferences = NotificationService.parsePreferences(parsed);
      } catch {
        this.preferences = NotificationService.getDefaultPreferences();
      }
    }

    const storedHistory = await this.storageService.get('notifications:history');
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as unknown;
        this.history = NotificationService.parseHistory(parsed);
      } catch {
        this.history = [];
      }
    }

    await this.persist();
  }

  public getPreferences(): NotificationPreferences {
    return this.preferences;
  }

  public async updatePreferences(
    update: NotificationPreferencesUpdate
  ): Promise<NotificationPreferences> {
    const modulesUpdate = update.modules
      ? NotificationService.mergeModulePreferences(update.modules)
      : undefined;

    this.preferences = {
      ...this.preferences,
      ...update,
      modules: {
        ...this.preferences.modules,
        ...(modulesUpdate ?? {}),
      },
    };

    await this.persist();
    return this.preferences;
  }

  public getHistory(): NotificationHistoryItem[] {
    return [...this.history];
  }

  public async clearHistory(): Promise<void> {
    this.history = [];
    await this.persist();
  }

  public async emit(event: NotificationEvent): Promise<NotificationHistoryItem | null> {
    const normalized = this.normalizeEvent(event);

    if (this.preferences.paused) {
      const item = this.appendHistory(normalized);
      await this.persist();
      return item;
    }

    const modulePrefs = this.preferences.modules[normalized.module];
    const allowedByModule = modulePrefs.enabled;
    const urgentBypass = normalized.priority === 'urgent' && modulePrefs.allowUrgent;

    if (!allowedByModule && !urgentBypass) {
      const item = this.appendHistory(normalized);
      await this.persist();
      return item;
    }

    const item = this.appendHistory(normalized);

    if (normalized.priority !== 'silent') {
      const shouldBeSilent = !modulePrefs.allowSound;
      const notification = new Notification({
        title: item.title,
        body: item.body ?? '',
        silent: shouldBeSilent,
      });

      notification.show();
    }

    await this.persist();
    return item;
  }

  private normalizeEvent(event: NotificationEvent): Required<
    Omit<NotificationEvent, 'body' | 'data'>
  > & {
    body?: string;
    data?: Record<string, unknown>;
  } {
    const createdAt = event.createdAt ?? Date.now();

    return {
      module: event.module,
      title: event.title,
      body: event.body,
      priority: event.priority,
      createdAt,
      data: event.data,
    };
  }

  private appendHistory(
    event: Required<Omit<NotificationEvent, 'body' | 'data'>> & {
      body?: string;
      data?: Record<string, unknown>;
    }
  ): NotificationHistoryItem {
    const item: NotificationHistoryItem = {
      id: crypto.randomUUID(),
      module: event.module,
      title: event.title,
      body: event.body,
      priority: event.priority,
      createdAt: event.createdAt,
      data: event.data,
    };

    this.history.unshift(item);
    const limit = Math.max(1, this.preferences.historyLimit);
    if (this.history.length > limit) {
      this.history = this.history.slice(0, limit);
    }

    return item;
  }

  private async persist(): Promise<void> {
    await this.storageService.set('notifications:preferences', JSON.stringify(this.preferences));
    await this.storageService.set('notifications:history', JSON.stringify(this.history));
  }

  private static mergeModulePreferences(
    modules: Partial<Record<NotificationModule, Partial<NotificationModulePreferences>>>
  ): Partial<Record<NotificationModule, NotificationModulePreferences>> {
    const defaults = NotificationService.getDefaultPreferences().modules;
    const merged: Partial<Record<NotificationModule, NotificationModulePreferences>> = {};

    const keys = Object.keys(modules) as NotificationModule[];
    for (const key of keys) {
      const update = modules[key];
      if (!update) {
        continue;
      }
      merged[key] = {
        ...defaults[key],
        ...update,
      };
    }

    return merged;
  }

  private static getDefaultPreferences(): NotificationPreferences {
    return {
      paused: false,
      historyLimit: 200,
      modules: {
        calendar: { enabled: true, allowUrgent: true, allowSound: true },
        tasks: { enabled: true, allowUrgent: true, allowSound: true },
        email: { enabled: true, allowUrgent: true, allowSound: true },
        family: { enabled: true, allowUrgent: true, allowSound: true },
        system: { enabled: true, allowUrgent: true, allowSound: true },
      },
    };
  }

  private static parsePreferences(value: unknown): NotificationPreferences {
    if (!NotificationService.isRecord(value)) {
      return NotificationService.getDefaultPreferences();
    }

    const defaults = NotificationService.getDefaultPreferences();

    const paused = typeof value.paused === 'boolean' ? value.paused : defaults.paused;
    const historyLimit =
      typeof value.historyLimit === 'number' && Number.isFinite(value.historyLimit)
        ? value.historyLimit
        : defaults.historyLimit;

    const modulesValue = value.modules;
    const modules = NotificationService.isRecord(modulesValue) ? modulesValue : {};

    const moduleKeys: NotificationModule[] = ['calendar', 'tasks', 'email', 'family', 'system'];
    const parsedModules: Record<NotificationModule, NotificationModulePreferences> = {
      calendar: defaults.modules.calendar,
      tasks: defaults.modules.tasks,
      email: defaults.modules.email,
      family: defaults.modules.family,
      system: defaults.modules.system,
    };

    for (const key of moduleKeys) {
      const current = modules[key];
      if (!NotificationService.isRecord(current)) {
        continue;
      }

      parsedModules[key] = {
        enabled:
          typeof current.enabled === 'boolean' ? current.enabled : defaults.modules[key].enabled,
        allowUrgent:
          typeof current.allowUrgent === 'boolean'
            ? current.allowUrgent
            : defaults.modules[key].allowUrgent,
        allowSound:
          typeof current.allowSound === 'boolean'
            ? current.allowSound
            : defaults.modules[key].allowSound,
      };
    }

    return {
      paused,
      historyLimit,
      modules: parsedModules,
    };
  }

  private static parseHistory(value: unknown): NotificationHistoryItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const items: NotificationHistoryItem[] = [];

    for (const entry of value) {
      if (!NotificationService.isRecord(entry)) {
        continue;
      }

      const id = typeof entry.id === 'string' ? entry.id : crypto.randomUUID();
      const module = NotificationService.isNotificationModule(entry.module)
        ? entry.module
        : 'system';
      const title = typeof entry.title === 'string' ? entry.title : '(Notification)';
      const priority = NotificationService.isNotificationPriority(entry.priority)
        ? entry.priority
        : 'normal';
      const createdAt = typeof entry.createdAt === 'number' ? entry.createdAt : Date.now();
      const body = typeof entry.body === 'string' ? entry.body : undefined;
      const data = NotificationService.isRecord(entry.data) ? entry.data : undefined;

      items.push({ id, module, title, priority, createdAt, body, data });
    }

    return items;
  }

  private static isNotificationModule(value: unknown): value is NotificationModule {
    return (
      value === 'calendar' ||
      value === 'tasks' ||
      value === 'email' ||
      value === 'family' ||
      value === 'system'
    );
  }

  private static isNotificationPriority(value: unknown): value is NotificationPriority {
    return value === 'silent' || value === 'normal' || value === 'urgent';
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
