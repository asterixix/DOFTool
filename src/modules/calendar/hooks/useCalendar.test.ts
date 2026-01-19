import { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getCalendarAPI } from '@/shared/utils/electronAPI';

import { useCalendar } from './useCalendar';
import { useCalendarStore } from '../stores/calendar.store';
import { getViewDateRange } from '../utils/dateHelpers';
import { expandRecurringEvent } from '../utils/recurrence';

import type { Calendar, CalendarEvent } from '../types/Calendar.types';

// Mock dependencies
vi.mock('@/shared/utils/electronAPI', () => ({
  getCalendarAPI: vi.fn(),
}));

vi.mock('../stores/calendar.store', () => ({
  useCalendarStore: vi.fn(),
}));

vi.mock('../utils/dateHelpers', () => ({
  getViewDateRange: vi.fn(),
}));

vi.mock('../utils/recurrence', () => ({
  expandRecurringEvent: vi.fn(),
}));

describe('useCalendar', () => {
  const createCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
    id: 'cal-1',
    familyId: 'family-1',
    name: 'Work',
    description: undefined,
    color: 'blue',
    icon: undefined,
    ownerId: 'user-1',
    ownerName: undefined,
    visibility: 'family',
    defaultPermission: 'view',
    sharedWith: [],
    defaultReminders: [],
    timezone: 'UTC',
    showDeclined: undefined,
    externalSyncEnabled: undefined,
    externalSource: undefined,
    lastSyncAt: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  const createEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: 'event-1',
    calendarId: 'cal-1',
    familyId: 'family-1',
    title: 'Meeting',
    description: undefined,
    location: undefined,
    url: undefined,
    start: Date.now(),
    end: Date.now() + 3600000,
    allDay: false,
    timezone: 'UTC',
    recurrence: undefined,
    recurrenceId: undefined,
    originalStart: undefined,
    status: 'confirmed',
    busyStatus: 'busy',
    category: undefined,
    color: undefined,
    organizer: undefined,
    attendees: [],
    reminders: [],
    createdBy: 'user-1',
    lastModifiedBy: undefined,
    externalId: undefined,
    externalEtag: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });
  const mockGetCalendarAPI = getCalendarAPI as ReturnType<typeof vi.fn>;
  const mockUseCalendarStore = useCalendarStore as unknown as ReturnType<typeof vi.fn>;
  const mockCalendarAPI = {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    share: vi.fn(),
    updateShare: vi.fn(),
    unshare: vi.fn(),
    getShares: vi.fn(),
    importICal: vi.fn(),
    exportICal: vi.fn(),
    subscribeExternal: vi.fn(),
    unsubscribeExternal: vi.fn(),
    syncExternal: vi.fn(),
    getExternalSyncStatus: vi.fn(),
  };

  interface MockCalendarStore {
    calendars: Calendar[];
    events: CalendarEvent[];
    expandedEvents: CalendarEvent[];
    currentView: 'month' | 'week' | 'day' | 'agenda' | 'year';
    currentDate: number;
    selectedDate: number | null;
    selectedEventId: string | null;
    selectedCalendarIds: string[];
    isLoadingCalendars: boolean;
    isLoadingEvents: boolean;
    isSaving: boolean;
    error: string | null;
    isEditorOpen: boolean;
    editingEvent: CalendarEvent | null;
    editingDate: number | null;
    editingEndDate: number | null;
    isShareDialogOpen: boolean;
    sharingCalendar: Calendar | null;
    isICalDialogOpen: boolean;
    icalCalendar: Calendar | null;
    isExternalSubscriptionDialogOpen: boolean;
    externalSubscriptionCalendar: Calendar | null;
    setCalendars: ReturnType<typeof vi.fn>;
    setEvents: ReturnType<typeof vi.fn>;
    setExpandedEvents: ReturnType<typeof vi.fn>;
    setCurrentView: ReturnType<typeof vi.fn>;
    setCurrentDate: ReturnType<typeof vi.fn>;
    setSelectedDate: ReturnType<typeof vi.fn>;
    setSelectedEventId: ReturnType<typeof vi.fn>;
    setSelectedCalendarIds: ReturnType<typeof vi.fn>;
    toggleCalendarVisibility: ReturnType<typeof vi.fn>;
    setLoadingCalendars: ReturnType<typeof vi.fn>;
    setLoadingEvents: ReturnType<typeof vi.fn>;
    setSaving: ReturnType<typeof vi.fn>;
    setError: ReturnType<typeof vi.fn>;
    openEditor: ReturnType<typeof vi.fn>;
    closeEditor: ReturnType<typeof vi.fn>;
    openShareDialog: ReturnType<typeof vi.fn>;
    closeShareDialog: ReturnType<typeof vi.fn>;
    openICalDialog: ReturnType<typeof vi.fn>;
    closeICalDialog: ReturnType<typeof vi.fn>;
    openExternalSubscriptionDialog: ReturnType<typeof vi.fn>;
    closeExternalSubscriptionDialog: ReturnType<typeof vi.fn>;
    getCalendarById: ReturnType<typeof vi.fn>;
    getEventById: ReturnType<typeof vi.fn>;
    getVisibleCalendars: ReturnType<typeof vi.fn>;
    getEventsForDate: ReturnType<typeof vi.fn>;
    getEventsInRange: ReturnType<typeof vi.fn>;
    navigateToday: ReturnType<typeof vi.fn>;
    navigatePrev: ReturnType<typeof vi.fn>;
    navigateNext: ReturnType<typeof vi.fn>;
  }

  const mockStore: MockCalendarStore = {
    calendars: [],
    events: [],
    expandedEvents: [],
    currentView: 'month' as const,
    currentDate: Date.now(),
    selectedDate: null,
    selectedEventId: null,
    selectedCalendarIds: [],
    isLoadingCalendars: false,
    isLoadingEvents: false,
    isSaving: false,
    error: null,
    isEditorOpen: false,
    editingEvent: null,
    editingDate: null,
    editingEndDate: null,
    isShareDialogOpen: false,
    sharingCalendar: null,
    isICalDialogOpen: false,
    icalCalendar: null,
    isExternalSubscriptionDialogOpen: false,
    externalSubscriptionCalendar: null,
    setCalendars: vi.fn(),
    setEvents: vi.fn(),
    setExpandedEvents: vi.fn(),
    setCurrentView: vi.fn(),
    setCurrentDate: vi.fn(),
    setSelectedDate: vi.fn(),
    setSelectedEventId: vi.fn(),
    setSelectedCalendarIds: vi.fn(),
    toggleCalendarVisibility: vi.fn(),
    setLoadingCalendars: vi.fn(),
    setLoadingEvents: vi.fn(),
    setSaving: vi.fn(),
    setError: vi.fn(),
    openEditor: vi.fn(),
    closeEditor: vi.fn(),
    openShareDialog: vi.fn(),
    closeShareDialog: vi.fn(),
    openICalDialog: vi.fn(),
    closeICalDialog: vi.fn(),
    openExternalSubscriptionDialog: vi.fn(),
    closeExternalSubscriptionDialog: vi.fn(),
    getCalendarById: vi.fn(() => undefined),
    getEventById: vi.fn(() => undefined),
    getVisibleCalendars: vi.fn(() => []),
    getEventsForDate: vi.fn(() => []),
    getEventsInRange: vi.fn(() => []),
    navigateToday: vi.fn(),
    navigatePrev: vi.fn(),
    navigateNext: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCalendarAPI.mockReturnValue(mockCalendarAPI);
    mockUseCalendarStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state', async () => {
    mockCalendarAPI.getAll.mockResolvedValue([]);

    const { result } = renderHook(() => useCalendar());

    // Wait for the automatic loadCalendars to complete
    await waitFor(() => {
      expect(result.current.isLoadingCalendars).toBe(false);
    });

    expect(result.current.calendars).toEqual([]);
    expect(result.current.events).toEqual([]);
    expect(result.current.currentView).toBe('month');
    expect(result.current.error).toBeNull();
  });

  describe('loadCalendars', () => {
    it('should load calendars', async () => {
      const mockCalendars = [createCalendar()];

      mockCalendarAPI.getAll.mockResolvedValue(mockCalendars);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        await result.current.loadCalendars();
      });

      expect(mockCalendarAPI.getAll).toHaveBeenCalled();
      expect(mockStore.setLoadingCalendars).toHaveBeenCalledWith(true);
      expect(mockStore.setCalendars).toHaveBeenCalled();
      expect(mockStore.setLoadingCalendars).toHaveBeenCalledWith(false);
    });

    it('should handle load errors', async () => {
      mockCalendarAPI.getAll.mockRejectedValue(new Error('Failed to load'));

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        await result.current.loadCalendars();
      });

      expect(mockStore.setError).toHaveBeenCalled();
      expect(mockStore.setLoadingCalendars).toHaveBeenCalledWith(false);
    });
  });

  describe('loadEvents', () => {
    beforeEach(() => {
      // Ensure calendars are loaded for events tests
      mockStore.calendars = [createCalendar()];
      mockStore.selectedCalendarIds = ['cal-1'];
      mockStore.currentDate = Date.now();
      mockStore.currentView = 'month';
    });

    it('should load events', async () => {
      const mockEvents = [createEvent()];

      // getViewDateRange returns Date objects, not timestamps
      vi.mocked(getViewDateRange).mockReturnValue({
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      });
      mockCalendarAPI.getEvents.mockResolvedValue(mockEvents);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        await result.current.loadEvents();
      });

      expect(mockCalendarAPI.getEvents).toHaveBeenCalled();
      expect(mockStore.setLoadingEvents).toHaveBeenCalledWith(true);
      expect(mockStore.setEvents).toHaveBeenCalled();
      expect(mockStore.setExpandedEvents).toHaveBeenCalled();
      expect(mockStore.setLoadingEvents).toHaveBeenCalledWith(false);
    });

    it('should not load events if no calendars selected', async () => {
      mockStore.selectedCalendarIds = [];
      // getViewDateRange returns Date objects
      vi.mocked(getViewDateRange).mockReturnValue({
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      });

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        await result.current.loadEvents();
      });

      // Events still load, but without calendar filter when none selected
      expect(mockCalendarAPI.getEvents).toHaveBeenCalled();
    });
  });

  describe('createCalendar', () => {
    it('should create calendar', async () => {
      const input = {
        name: 'New Calendar',
        color: 'blue' as const,
        visibility: 'family' as const,
      };

      const mockResult = {
        id: 'cal-1',
        familyId: 'family-1',
        name: 'New Calendar',
        color: 'blue',
        ownerId: 'user-1',
        visibility: 'family',
        defaultPermission: 'view',
        sharedWith: [],
        defaultReminders: [],
        timezone: 'UTC',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockCalendarAPI.create.mockResolvedValue(mockResult);
      mockCalendarAPI.getAll.mockResolvedValue([mockResult]);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const created = await result.current.createCalendar(input);
        expect(created).toBeDefined();
      });

      expect(mockCalendarAPI.create).toHaveBeenCalledWith(input);
      expect(mockStore.setSaving).toHaveBeenCalledWith(true);
      expect(mockCalendarAPI.getAll).toHaveBeenCalled(); // Reloads calendars
      expect(mockStore.setSaving).toHaveBeenCalledWith(false);
    });

    it('should handle create errors', async () => {
      mockCalendarAPI.create.mockRejectedValue(new Error('Failed to create'));

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const created = await result.current.createCalendar({
          name: 'Test',
          color: 'blue',
          visibility: 'family',
        });
        expect(created).toBeNull();
      });

      expect(mockStore.setError).toHaveBeenCalled();
      expect(mockStore.setSaving).toHaveBeenCalledWith(false);
    });
  });

  describe('createEvent', () => {
    it('should create event', async () => {
      const input = {
        calendarId: 'cal-1',
        title: 'New Event',
        description: undefined,
        location: undefined,
        start: Date.now(),
        end: Date.now() + 3600000,
        allDay: false,
        timezone: 'UTC',
        recurrence: undefined,
        category: undefined,
        color: undefined,
        reminders: [],
        attendees: [],
      };

      const mockResult = {
        id: 'event-1',
        calendarId: 'cal-1',
        title: 'New Event',
        start: input.start,
        end: input.end,
        allDay: false,
        timezone: 'UTC',
        status: 'confirmed',
        busyStatus: 'busy',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        familyId: 'family-1',
        createdBy: 'user-1',
      };

      mockCalendarAPI.createEvent.mockResolvedValue(mockResult);
      mockCalendarAPI.getEvents.mockResolvedValue([mockResult]);
      vi.mocked(expandRecurringEvent).mockReturnValue([]);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const created = await result.current.createEvent(input);
        expect(created).toBeDefined();
      });

      expect(mockCalendarAPI.createEvent).toHaveBeenCalled();
      expect(mockStore.setSaving).toHaveBeenCalledWith(true);
      expect(mockStore.closeEditor).toHaveBeenCalled();
      expect(mockStore.setSaving).toHaveBeenCalledWith(false);
    });
  });

  describe('updateEvent', () => {
    it('should update event', async () => {
      const input = {
        id: 'event-1',
        updateScope: 'this' as const,
        title: 'Updated Event',
        description: undefined,
        location: undefined,
        start: Date.now(),
        end: Date.now() + 3600000,
        allDay: false,
        timezone: 'UTC',
        recurrence: undefined,
        recurrenceId: undefined,
        category: undefined,
        color: undefined,
        reminders: [],
        attendees: [],
      };

      mockStore.getEventById.mockReturnValue({
        id: 'event-1',
        calendarId: 'cal-1',
      });
      mockCalendarAPI.updateEvent.mockResolvedValue(undefined);
      mockCalendarAPI.getEvents.mockResolvedValue([]);
      vi.mocked(expandRecurringEvent).mockReturnValue([]);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const updated = await result.current.updateEvent(input);
        expect(updated).toBeDefined();
      });

      expect(mockCalendarAPI.updateEvent).toHaveBeenCalled();
      expect(mockStore.setSaving).toHaveBeenCalledWith(true);
      expect(mockStore.closeEditor).toHaveBeenCalled();
      expect(mockStore.setSaving).toHaveBeenCalledWith(false);
    });
  });

  describe('deleteEvent', () => {
    it('should delete event', async () => {
      mockStore.getEventById.mockReturnValue({
        id: 'event-1',
        calendarId: 'cal-1',
      });
      mockCalendarAPI.deleteEvent.mockResolvedValue(undefined);
      mockCalendarAPI.getEvents.mockResolvedValue([]);
      // Add getViewDateRange mock for loadEvents to work
      vi.mocked(getViewDateRange).mockReturnValue({
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      });
      vi.mocked(expandRecurringEvent).mockReturnValue([]);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const success = await result.current.deleteEvent('event-1');
        expect(success).toBe(true);
      });

      expect(mockCalendarAPI.deleteEvent).toHaveBeenCalledWith('event-1');
      expect(mockCalendarAPI.getEvents).toHaveBeenCalled(); // Reloads events
    });
  });

  describe('navigation', () => {
    it('should navigate today', () => {
      const { result } = renderHook(() => useCalendar());

      act(() => {
        result.current.navigateToday();
      });

      expect(mockStore.navigateToday).toHaveBeenCalled();
    });

    it('should navigate previous', () => {
      const { result } = renderHook(() => useCalendar());

      act(() => {
        result.current.navigatePrev();
      });

      expect(mockStore.navigatePrev).toHaveBeenCalled();
    });

    it('should navigate next', () => {
      const { result } = renderHook(() => useCalendar());

      act(() => {
        result.current.navigateNext();
      });

      expect(mockStore.navigateNext).toHaveBeenCalled();
    });
  });

  describe('editor actions', () => {
    it('should open event editor', () => {
      const { result } = renderHook(() => useCalendar());

      act(() => {
        result.current.openEventEditor();
      });

      expect(mockStore.openEditor).toHaveBeenCalled();
    });

    it('should close event editor', () => {
      const { result } = renderHook(() => useCalendar());

      act(() => {
        result.current.closeEventEditor();
      });

      expect(mockStore.closeEditor).toHaveBeenCalled();
    });
  });

  describe('sharing', () => {
    it('should share calendar', async () => {
      const mockShare = {
        calendarId: 'cal-1',
        memberId: 'member-1',
        permission: 'view' as const,
        sharedAt: Date.now(),
        sharedBy: 'user-1',
      };

      mockCalendarAPI.share.mockResolvedValue(mockShare);
      mockCalendarAPI.getAll.mockResolvedValue([]);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const share = await result.current.shareCalendar('cal-1', 'member-1', 'view');
        expect(share).toEqual(mockShare);
      });

      expect(mockCalendarAPI.share).toHaveBeenCalledWith('cal-1', 'member-1', 'view');
    });

    it('should unshare calendar', async () => {
      mockCalendarAPI.unshare.mockResolvedValue(undefined);
      mockCalendarAPI.getAll.mockResolvedValue([]);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const success = await result.current.unshareCalendar('cal-1', 'member-1');
        expect(success).toBe(true);
      });

      expect(mockCalendarAPI.unshare).toHaveBeenCalledWith('cal-1', 'member-1');
    });
  });

  describe('import/export', () => {
    it('should import iCal', async () => {
      const mockResult = { imported: 5, errors: [] };
      mockCalendarAPI.importICal.mockResolvedValue(mockResult);
      mockCalendarAPI.getEvents.mockResolvedValue([]);
      vi.mocked(getViewDateRange).mockReturnValue({
        start: new Date(Date.now() - 86400000),
        end: new Date(Date.now() + 86400000),
      });
      vi.mocked(expandRecurringEvent).mockReturnValue([]);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const result2 = await result.current.importICal('cal-1', 'BEGIN:VCALENDAR...');
        expect(result2.imported).toBe(5);
      });

      expect(mockCalendarAPI.importICal).toHaveBeenCalled();
    });

    it('should export iCal', async () => {
      mockCalendarAPI.exportICal.mockResolvedValue('BEGIN:VCALENDAR...');

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const exported = await result.current.exportICal('cal-1');
        expect(exported).toBe('BEGIN:VCALENDAR...');
      });

      expect(mockCalendarAPI.exportICal).toHaveBeenCalledWith('cal-1');
    });
  });

  describe('external sync', () => {
    it('should subscribe external calendar', async () => {
      const mockCalendar = {
        id: 'cal-1',
        name: 'External Calendar',
        color: 'blue',
        ownerId: 'user-1',
        visibility: 'family',
        defaultPermission: 'view',
        sharedWith: [],
        defaultReminders: [],
        timezone: 'UTC',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        familyId: 'family-1',
      };

      mockCalendarAPI.subscribeExternal.mockResolvedValue(mockCalendar);
      mockCalendarAPI.getAll.mockResolvedValue([mockCalendar]);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const calendar = await result.current.subscribeExternalCalendar(
          'cal-1',
          'https://example.com/cal.ics'
        );
        expect(calendar).toBeDefined();
      });

      expect(mockCalendarAPI.subscribeExternal).toHaveBeenCalled();
    });

    it('should sync external calendar', async () => {
      const mockResult = { success: true, imported: 10, errors: [] };
      mockCalendarAPI.syncExternal.mockResolvedValue(mockResult);
      mockCalendarAPI.getEvents.mockResolvedValue([]);
      vi.mocked(expandRecurringEvent).mockReturnValue([]);

      const { result } = renderHook(() => useCalendar());

      await act(async () => {
        const result2 = await result.current.syncExternalCalendar('cal-1');
        expect(result2.success).toBe(true);
        expect(result2.imported).toBe(10);
      });

      expect(mockCalendarAPI.syncExternal).toHaveBeenCalledWith('cal-1');
    });
  });

  describe('helpers', () => {
    it('should get calendar by id', () => {
      const calendar = {
        id: 'cal-1',
        name: 'Test Calendar',
      };

      mockStore.getCalendarById.mockReturnValue(calendar);

      const { result } = renderHook(() => useCalendar());

      const found = result.current.getCalendarById('cal-1');
      expect(found).toEqual(calendar);
    });

    it('should get event by id', () => {
      const event = {
        id: 'event-1',
        title: 'Test Event',
      };

      mockStore.getEventById.mockReturnValue(event);

      const { result } = renderHook(() => useCalendar());

      const found = result.current.getEventById('event-1');
      expect(found).toEqual(event);
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useCalendar());

      act(() => {
        result.current.clearError();
      });

      expect(mockStore.setError).toHaveBeenCalledWith(null);
    });
  });

  describe('loads calendars on mount', () => {
    it('should load calendars on mount', async () => {
      mockCalendarAPI.getAll.mockResolvedValue([]);

      renderHook(() => useCalendar());

      await waitFor(() => {
        expect(mockCalendarAPI.getAll).toHaveBeenCalled();
      });
    });
  });
});
