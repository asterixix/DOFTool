import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ExternalCalendarSyncService } from './ExternalCalendarSyncService';

import type { YjsService } from './YjsService';
import type { CalendarInfo } from '../main';
import * as Y from 'yjs';

// Mock Yjs
const mockYMap = {
  get: vi.fn(),
  set: vi.fn(),
  keys: vi.fn(),
  observe: vi.fn(),
  forEach: vi.fn(),
};

const mockYDoc = {
  getMap: vi.fn(() => mockYMap),
};

vi.mock('yjs', () => ({
  Doc: vi.fn(() => mockYDoc),
}));

describe('ExternalCalendarSyncService', () => {
  let syncService: ExternalCalendarSyncService;
  let mockYjsService: YjsService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockYjsService = {
      getDocument: vi.fn(() => mockYDoc),
      calendarsMap: mockYMap,
      getStructure: vi.fn(() => ({
        family: mockYMap,
        members: mockYMap,
        devices: mockYMap,
        invitations: mockYMap,
        calendars: mockYMap,
        events: mockYMap,
        taskLists: mockYMap,
        tasks: mockYMap,
        emailAccounts: mockYMap,
        emailLabels: mockYMap,
        conversations: mockYMap,
        internalMessages: [] as unknown as Y.Array<unknown>,
      })),
    } as unknown as YjsService;

    syncService = new ExternalCalendarSyncService(mockYjsService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('start', () => {
    it('should start sync service', async () => {
      mockYMap.keys.mockReturnValue({
        [Symbol.iterator]: function* () {
          // Empty iterator
        },
      });

      await syncService.start();

      expect(mockYMap.observe).toHaveBeenCalled();
    });

    it('should not start if already running', async () => {
      await syncService.start();

      const startCallCount = mockYMap.observe.mock.calls.length;
      await syncService.start();

      expect(mockYMap.observe.mock.calls.length).toBe(startCallCount);
    });
  });

  describe('stop', () => {
    it('should stop sync service', async () => {
      await syncService.start();
      syncService.stop();

      // Service should be stopped
      expect(syncService).toBeDefined();
    });

    it('should not stop if already stopped', () => {
      syncService.stop();
      syncService.stop(); // Should not throw

      expect(syncService).toBeDefined();
    });
  });

  describe('syncCalendar', () => {
    beforeEach(async () => {
      await syncService.start();
    });

    it('should sync calendar', async () => {
      const mockCalendar: CalendarInfo = {
        id: 'cal-1',
        familyId: 'family-1',
        name: 'Test Calendar',
        color: 'blue',
        ownerId: 'user-1',
        visibility: 'family',
        defaultPermission: 'view',
        sharedWith: [],
        defaultReminders: [],
        timezone: 'UTC',
        externalSyncEnabled: true,
        externalSource: {
          type: 'ical_url',
          url: 'https://example.com/cal.ics',
          syncDirection: 'one_way' as const,
        },
        syncInterval: 3600000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSyncAt: undefined,
      };

      // Mock the calendars map in the structure
      const calendarsMap = (mockYjsService.getStructure() as any).calendars;
      calendarsMap.get = vi.fn().mockReturnValue(mockCalendar);

      // Mock fetch for iCal data
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue('BEGIN:VCALENDAR\nEND:VCALENDAR'),
      }) as never;

      const result = await syncService.syncCalendar('cal-1');

      expect(result.success).toBe(true);
      expect(result.imported).toBeGreaterThanOrEqual(0);
    });

    it('should handle sync errors', async () => {
      mockYMap.get.mockReturnValue(null);

      const result = await syncService.syncCalendar('non-existent');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle fetch errors', async () => {
      const mockCalendar: CalendarInfo = {
        id: 'cal-1',
        familyId: 'family-1',
        name: 'Test Calendar',
        color: 'blue',
        ownerId: 'user-1',
        visibility: 'family',
        defaultPermission: 'view',
        sharedWith: [],
        defaultReminders: [],
        timezone: 'UTC',
        externalSyncEnabled: true,
        externalSource: {
          type: 'ical_url',
          url: 'https://invalid-url.com/cal.ics',
          syncDirection: 'one_way' as const,
        },
        syncInterval: 3600000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSyncAt: undefined,
      };

      mockYMap.get.mockReturnValue(mockCalendar);
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as never;

      const result = await syncService.syncCalendar('cal-1');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('syncAllCalendars', () => {
    beforeEach(async () => {
      await syncService.start();
    });

    it('should sync all calendars with external sync enabled', async () => {
      const mockCalendars: CalendarInfo[] = [
        {
          id: 'cal-1',
          familyId: 'family-1',
          name: 'Calendar 1',
          color: 'blue',
          ownerId: 'user-1',
          visibility: 'family',
          defaultPermission: 'view',
          sharedWith: [],
          defaultReminders: [],
          timezone: 'UTC',
          externalSyncEnabled: true,
          externalSource: {
            type: 'ical_url',
            url: 'https://example.com/cal1.ics',
            syncDirection: 'one_way' as const,
          },
          syncInterval: 3600000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastSyncAt: undefined,
        },
        {
          id: 'cal-2',
          familyId: 'family-1',
          name: 'Calendar 2',
          color: 'green',
          ownerId: 'user-1',
          visibility: 'family',
          defaultPermission: 'view',
          sharedWith: [],
          defaultReminders: [],
          timezone: 'UTC',
          externalSyncEnabled: false, // Not enabled
          externalSource: undefined,
          syncInterval: 3600000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastSyncAt: undefined,
        },
      ];

      // Mock the calendars map in the structure
      const calendarsMap = (mockYjsService.getStructure() as any).calendars;
      calendarsMap.forEach = vi.fn((callback) => {
        mockCalendars.forEach((calendar) => {
          callback(calendar, calendar.id);
        });
      });

      calendarsMap.get = vi.fn((id: string) => {
        return mockCalendars.find((cal) => cal.id === id);
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue('BEGIN:VCALENDAR\nEND:VCALENDAR'),
      }) as never;

      const syncCalendarSpy = vi.spyOn(syncService, 'syncCalendar');
      syncCalendarSpy.mockResolvedValue({ success: true, imported: 1, errors: [] });

      await syncService.syncAllCalendars();

      expect(syncCalendarSpy).toHaveBeenCalledWith('cal-1');
      expect(syncCalendarSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('periodic sync', () => {
    it('should setup periodic sync for calendars', async () => {
      const mockCalendar: CalendarInfo = {
        id: 'cal-1',
        familyId: 'family-1',
        name: 'Test Calendar',
        color: 'blue',
        ownerId: 'user-1',
        visibility: 'family',
        defaultPermission: 'view',
        sharedWith: [],
        defaultReminders: [],
        timezone: 'UTC',
        externalSyncEnabled: true,
        externalSource: {
          type: 'ical_url',
          url: 'https://example.com/cal.ics',
          syncDirection: 'one_way' as const,
        },
        syncInterval: 1000, // 1 second for testing
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSyncAt: undefined,
      };

      mockYMap.keys.mockReturnValue({
        [Symbol.iterator]: function* () {
          yield 'cal-1';
        },
      });

      // Mock the calendars map in the structure
      const calendarsMap = (mockYjsService.getStructure() as any).calendars;
      calendarsMap.get = vi.fn().mockReturnValue(mockCalendar);
      calendarsMap.keys = vi.fn(() => ['cal-1']);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue('BEGIN:VCALENDAR\nEND:VCALENDAR'),
      }) as never;

      await syncService.start();

      // Advance timer to trigger sync
      vi.advanceTimersByTime(1100);

      // Should have attempted sync
      expect(mockYMap.get).toHaveBeenCalledWith('cal-1');
    });
  });
});
