import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useCalendarStore } from './calendar.store';

import type { Calendar, CalendarEvent, ExpandedEvent } from '../types/Calendar.types';

describe('calendar.store', () => {
  beforeEach(() => {
    const { reset } = useCalendarStore.getState();
    act(() => {
      reset();
    });
  });

  describe('initial state', () => {
    it('should have empty calendars array initially', () => {
      const state = useCalendarStore.getState();
      expect(state.calendars).toEqual([]);
    });

    it('should have empty events array initially', () => {
      const state = useCalendarStore.getState();
      expect(state.events).toEqual([]);
    });

    it('should have month view initially', () => {
      const state = useCalendarStore.getState();
      expect(state.currentView).toBe('month');
    });

    it('should have current date initially', () => {
      const state = useCalendarStore.getState();
      expect(state.currentDate).toBeGreaterThan(0);
    });

    it('should have null selectedDate initially', () => {
      const state = useCalendarStore.getState();
      expect(state.selectedDate).toBeNull();
    });

    it('should have false loading states initially', () => {
      const state = useCalendarStore.getState();
      expect(state.isLoadingCalendars).toBe(false);
      expect(state.isLoadingEvents).toBe(false);
      expect(state.isSaving).toBe(false);
    });
  });

  describe('setters', () => {
    it('should set calendars', () => {
      const calendars: Calendar[] = [
        {
          id: 'cal-1',
          familyId: 'family-1',
          name: 'Work',
          color: 'blue',
          ownerId: 'user-1',
          visibility: 'family',
          defaultPermission: 'view',
          sharedWith: [],
          defaultReminders: [],
          timezone: 'UTC',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const { setCalendars } = useCalendarStore.getState();
      act(() => {
        setCalendars(calendars);
      });

      expect(useCalendarStore.getState().calendars).toEqual(calendars);
    });

    it('should set events', () => {
      const events: CalendarEvent[] = [
        {
          id: 'event-1',
          calendarId: 'cal-1',
          title: 'Test Event',
          start: Date.now(),
          end: Date.now() + 3600000,
          allDay: false,
          timezone: 'UTC',
          status: 'confirmed',
          busyStatus: 'busy',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          familyId: 'family-1',
          createdBy: 'user-1',
        },
      ];

      const { setEvents } = useCalendarStore.getState();
      act(() => {
        setEvents(events);
      });

      expect(useCalendarStore.getState().events).toEqual(events);
    });

    it('should set expanded events', () => {
      const expandedEvents: ExpandedEvent[] = [
        {
          id: 'event-1',
          originalEventId: 'event-1',
          calendarId: 'cal-1',
          title: 'Test Event',
          start: Date.now(),
          end: Date.now() + 3600000,
          allDay: false,
          timezone: 'UTC',
          status: 'confirmed',
          busyStatus: 'busy',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          familyId: 'family-1',
          createdBy: 'user-1',
        },
      ];

      const { setExpandedEvents } = useCalendarStore.getState();
      act(() => {
        setExpandedEvents(expandedEvents);
      });

      expect(useCalendarStore.getState().expandedEvents).toEqual(expandedEvents);
    });

    it('should set current view', () => {
      const { setCurrentView } = useCalendarStore.getState();
      act(() => {
        setCurrentView('week');
      });

      expect(useCalendarStore.getState().currentView).toBe('week');
    });

    it('should set current date', () => {
      const date = Date.now() + 86400000; // Tomorrow
      const { setCurrentDate } = useCalendarStore.getState();
      act(() => {
        setCurrentDate(date);
      });

      expect(useCalendarStore.getState().currentDate).toBe(date);
    });

    it('should toggle calendar visibility', () => {
      const { setSelectedCalendarIds, toggleCalendarVisibility } = useCalendarStore.getState();
      act(() => {
        setSelectedCalendarIds(['cal-1']);
        toggleCalendarVisibility('cal-2');
      });

      expect(useCalendarStore.getState().selectedCalendarIds).toEqual(['cal-1', 'cal-2']);
    });

    it('should remove calendar from visibility when toggling off', () => {
      const { setSelectedCalendarIds, toggleCalendarVisibility } = useCalendarStore.getState();
      act(() => {
        setSelectedCalendarIds(['cal-1', 'cal-2']);
        toggleCalendarVisibility('cal-1');
      });

      expect(useCalendarStore.getState().selectedCalendarIds).toEqual(['cal-2']);
    });
  });

  describe('editor actions', () => {
    it('should open editor with event', () => {
      const event: CalendarEvent = {
        id: 'event-1',
        calendarId: 'cal-1',
        title: 'Test Event',
        start: Date.now(),
        end: Date.now() + 3600000,
        allDay: false,
        timezone: 'UTC',
        status: 'confirmed',
        busyStatus: 'busy',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        familyId: 'family-1',
        createdBy: 'user-1',
      };

      const { openEditor } = useCalendarStore.getState();
      act(() => {
        openEditor(event);
      });

      const state = useCalendarStore.getState();
      expect(state.isEditorOpen).toBe(true);
      expect(state.editingEvent).toEqual(event);
    });

    it('should open editor with date', () => {
      const date = Date.now();
      const { openEditor } = useCalendarStore.getState();
      act(() => {
        openEditor(null, date);
      });

      const state = useCalendarStore.getState();
      expect(state.isEditorOpen).toBe(true);
      expect(state.editingDate).toBe(date);
    });

    it('should close editor', () => {
      const { openEditor, closeEditor } = useCalendarStore.getState();
      act(() => {
        openEditor();
        closeEditor();
      });

      const state = useCalendarStore.getState();
      expect(state.isEditorOpen).toBe(false);
      expect(state.editingEvent).toBeNull();
      expect(state.editingDate).toBeNull();
    });
  });

  describe('dialog actions', () => {
    it('should open share dialog', () => {
      const calendar: Calendar = {
        id: 'cal-1',
        familyId: 'family-1',
        name: 'Work',
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

      const { openShareDialog } = useCalendarStore.getState();
      act(() => {
        openShareDialog(calendar);
      });

      const state = useCalendarStore.getState();
      expect(state.isShareDialogOpen).toBe(true);
      expect(state.sharingCalendar).toEqual(calendar);
    });

    it('should close share dialog', () => {
      const { openShareDialog, closeShareDialog } = useCalendarStore.getState();
      act(() => {
        openShareDialog(null);
        closeShareDialog();
      });

      const state = useCalendarStore.getState();
      expect(state.isShareDialogOpen).toBe(false);
      expect(state.sharingCalendar).toBeNull();
    });
  });

  describe('computed helpers', () => {
    it('should get calendar by id', () => {
      const calendar: Calendar = {
        id: 'cal-1',
        familyId: 'family-1',
        name: 'Work',
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

      const { setCalendars, getCalendarById } = useCalendarStore.getState();
      act(() => {
        setCalendars([calendar]);
      });

      const foundCalendar = getCalendarById('cal-1');
      expect(foundCalendar).toEqual(calendar);
    });

    it('should get event by id', () => {
      const event: CalendarEvent = {
        id: 'event-1',
        calendarId: 'cal-1',
        title: 'Test Event',
        start: Date.now(),
        end: Date.now() + 3600000,
        allDay: false,
        timezone: 'UTC',
        status: 'confirmed',
        busyStatus: 'busy',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        familyId: 'family-1',
        createdBy: 'user-1',
      };

      const { setEvents, getEventById } = useCalendarStore.getState();
      act(() => {
        setEvents([event]);
      });

      const foundEvent = getEventById('event-1');
      expect(foundEvent).toEqual(event);
    });

    it('should get visible calendars', () => {
      const calendars: Calendar[] = [
        {
          id: 'cal-1',
          familyId: 'family-1',
          name: 'Work',
          color: 'blue',
          ownerId: 'user-1',
          visibility: 'family',
          defaultPermission: 'view',
          sharedWith: [],
          defaultReminders: [],
          timezone: 'UTC',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'cal-2',
          familyId: 'family-1',
          name: 'Personal',
          color: 'green',
          ownerId: 'user-1',
          visibility: 'private',
          defaultPermission: 'view',
          sharedWith: [],
          defaultReminders: [],
          timezone: 'UTC',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const { setCalendars, setSelectedCalendarIds, getVisibleCalendars } =
        useCalendarStore.getState();
      act(() => {
        setCalendars(calendars);
        setSelectedCalendarIds(['cal-1']);
      });

      const visibleCalendars = getVisibleCalendars();
      expect(visibleCalendars).toHaveLength(1);
      expect(visibleCalendars[0].id).toBe('cal-1');
    });

    it('should get events for date', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const expandedEvents: ExpandedEvent[] = [
        {
          id: 'event-1',
          originalEventId: 'event-1',
          calendarId: 'cal-1',
          title: 'Today Event',
          start: today.getTime(),
          end: today.getTime() + 3600000,
          allDay: false,
          timezone: 'UTC',
          status: 'confirmed',
          busyStatus: 'busy',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          familyId: 'family-1',
          createdBy: 'user-1',
        },
        {
          id: 'event-2',
          originalEventId: 'event-2',
          calendarId: 'cal-1',
          title: 'Tomorrow Event',
          start: today.getTime() + 86400000,
          end: today.getTime() + 86400000 + 3600000,
          allDay: false,
          timezone: 'UTC',
          status: 'confirmed',
          busyStatus: 'busy',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          familyId: 'family-1',
          createdBy: 'user-1',
        },
      ];

      const { setExpandedEvents, setSelectedCalendarIds, getEventsForDate } =
        useCalendarStore.getState();
      act(() => {
        // Must set selectedCalendarIds for getEventsForDate to return events
        setSelectedCalendarIds(['cal-1']);
        setExpandedEvents(expandedEvents);
      });

      const eventsForDate = getEventsForDate(todayStart.getTime());
      expect(eventsForDate).toHaveLength(1);
      expect(eventsForDate[0].title).toBe('Today Event');
    });
  });

  describe('navigation helpers', () => {
    it('should navigate to today', () => {
      const { setCurrentDate, navigateToday } = useCalendarStore.getState();
      const futureDate = Date.now() + 86400000 * 10; // 10 days from now
      act(() => {
        setCurrentDate(futureDate);
        navigateToday();
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDate = useCalendarStore.getState().currentDate;
      const currentDateDay = new Date(currentDate);
      currentDateDay.setHours(0, 0, 0, 0);
      expect(currentDateDay.getTime()).toBe(today.getTime());
    });

    it('should navigate previous in day view', () => {
      const { setCurrentView, setCurrentDate, navigatePrev } = useCalendarStore.getState();
      const baseDate = new Date('2024-01-15T12:00:00Z').getTime();
      act(() => {
        setCurrentView('day');
        setCurrentDate(baseDate);
        navigatePrev();
      });

      const prevDate = useCalendarStore.getState().currentDate;
      const expectedDate = new Date(baseDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
      expect(new Date(prevDate).getDate()).toBe(expectedDate.getDate());
    });

    it('should navigate next in week view', () => {
      const { setCurrentView, setCurrentDate, navigateNext } = useCalendarStore.getState();
      const baseDate = new Date('2024-01-15T12:00:00Z').getTime();
      act(() => {
        setCurrentView('week');
        setCurrentDate(baseDate);
        navigateNext();
      });

      const nextDate = useCalendarStore.getState().currentDate;
      const expectedDate = new Date(baseDate);
      expectedDate.setDate(expectedDate.getDate() + 7);
      expect(new Date(nextDate).getDate()).toBe(expectedDate.getDate());
    });

    it('should navigate previous in month view', () => {
      const { setCurrentView, setCurrentDate, navigatePrev } = useCalendarStore.getState();
      const baseDate = new Date('2024-03-15T12:00:00Z').getTime();
      act(() => {
        setCurrentView('month');
        setCurrentDate(baseDate);
        navigatePrev();
      });

      const prevDate = useCalendarStore.getState().currentDate;
      const prevMonth = new Date(prevDate).getMonth();
      const expectedMonth = new Date(baseDate).getMonth() - 1;
      expect(prevMonth).toBe(expectedMonth);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const calendar: Calendar = {
        id: 'cal-1',
        familyId: 'family-1',
        name: 'Work',
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

      const { setCalendars, setCurrentView, setError, openEditor, reset } =
        useCalendarStore.getState();
      act(() => {
        setCalendars([calendar]);
        setCurrentView('week');
        setError('Error');
        openEditor();
        reset();
      });

      const state = useCalendarStore.getState();
      expect(state.calendars).toEqual([]);
      expect(state.currentView).toBe('month');
      expect(state.error).toBeNull();
      expect(state.isEditorOpen).toBe(false);
    });
  });
});
