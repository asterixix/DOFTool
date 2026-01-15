/**
 * Calendar Store - Zustand state management for calendar module
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { Calendar, CalendarEvent, CalendarView, ExpandedEvent } from '../types/Calendar.types';

interface CalendarStore {
  // State
  calendars: Calendar[];
  events: CalendarEvent[];
  expandedEvents: ExpandedEvent[]; // Events expanded for current view (includes recurrence instances)

  // View state
  currentView: CalendarView;
  currentDate: number;
  selectedDate: number | null;
  selectedEventId: string | null;
  selectedCalendarIds: string[]; // Which calendars are visible

  // Loading states
  isLoadingCalendars: boolean;
  isLoadingEvents: boolean;
  isSaving: boolean;

  // Error state
  error: string | null;

  // Editor state
  isEditorOpen: boolean;
  editingEvent: CalendarEvent | null;
  editingDate: number | null;
  editingEndDate: number | null;

  // Dialog state
  isShareDialogOpen: boolean;
  sharingCalendar: Calendar | null;
  isICalDialogOpen: boolean;
  icalCalendar: Calendar | null; // Pre-fill date when creating new event
  isExternalSubscriptionDialogOpen: boolean;
  externalSubscriptionCalendar: Calendar | null;

  // Actions - State setters
  setCalendars: (calendars: Calendar[]) => void;
  setEvents: (events: CalendarEvent[]) => void;
  setExpandedEvents: (events: ExpandedEvent[]) => void;
  setCurrentView: (view: CalendarView) => void;
  setCurrentDate: (date: number) => void;
  setSelectedDate: (date: number | null) => void;
  setSelectedEventId: (eventId: string | null) => void;
  setSelectedCalendarIds: (ids: string[]) => void;
  toggleCalendarVisibility: (calendarId: string) => void;
  setLoadingCalendars: (loading: boolean) => void;
  setLoadingEvents: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  // Editor actions
  openEditor: (event?: CalendarEvent | null, date?: number | null, endDate?: number | null) => void;
  closeEditor: () => void;

  // Dialog actions
  openShareDialog: (calendar: Calendar | null) => void;
  closeShareDialog: () => void;
  openICalDialog: (calendar: Calendar | null) => void;
  closeICalDialog: () => void;
  openExternalSubscriptionDialog: (calendar: Calendar | null) => void;
  closeExternalSubscriptionDialog: () => void;

  // Computed helpers
  getCalendarById: (id: string) => Calendar | undefined;
  getEventById: (id: string) => CalendarEvent | undefined;
  getVisibleCalendars: () => Calendar[];
  getEventsForDate: (date: number) => ExpandedEvent[];
  getEventsInRange: (start: number, end: number) => ExpandedEvent[];

  // Navigation helpers
  navigateToday: () => void;
  navigatePrev: () => void;
  navigateNext: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  calendars: [],
  events: [],
  expandedEvents: [],
  currentView: 'month' as CalendarView,
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
};

// Helper to get start of day
const startOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Helper to get end of day
const endOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

// Helper to add/subtract time based on view
const navigateDate = (current: number, view: CalendarView, direction: 'prev' | 'next'): number => {
  const date = new Date(current);
  const mult = direction === 'next' ? 1 : -1;

  switch (view) {
    case 'day':
      date.setDate(date.getDate() + mult);
      break;
    case 'week':
      date.setDate(date.getDate() + 7 * mult);
      break;
    case 'month':
      date.setMonth(date.getMonth() + mult);
      break;
    case 'year':
      date.setFullYear(date.getFullYear() + mult);
      break;
    case 'agenda':
      date.setDate(date.getDate() + 7 * mult);
      break;
  }

  return date.getTime();
};

export const useCalendarStore = create<CalendarStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // State setters
    setCalendars: (calendars) => {
      set({ calendars });
      // Auto-select all calendars if none selected
      const { selectedCalendarIds } = get();
      if (selectedCalendarIds.length === 0 && calendars.length > 0) {
        set({ selectedCalendarIds: calendars.map((c) => c.id) });
      }
    },
    setEvents: (events) => set({ events }),
    setExpandedEvents: (expandedEvents) => set({ expandedEvents }),
    setCurrentView: (currentView) => set({ currentView }),
    setCurrentDate: (currentDate) => set({ currentDate }),
    setSelectedDate: (selectedDate) => set({ selectedDate }),
    setSelectedEventId: (selectedEventId) => set({ selectedEventId }),
    setSelectedCalendarIds: (selectedCalendarIds) => set({ selectedCalendarIds }),
    toggleCalendarVisibility: (calendarId) => {
      const { selectedCalendarIds } = get();
      if (selectedCalendarIds.includes(calendarId)) {
        set({ selectedCalendarIds: selectedCalendarIds.filter((id) => id !== calendarId) });
      } else {
        set({ selectedCalendarIds: [...selectedCalendarIds, calendarId] });
      }
    },
    setLoadingCalendars: (isLoadingCalendars) => set({ isLoadingCalendars }),
    setLoadingEvents: (isLoadingEvents) => set({ isLoadingEvents }),
    setSaving: (isSaving) => set({ isSaving }),
    setError: (error) => set({ error }),

    // Editor actions
    openEditor: (event = null, date = null, endDate = null) =>
      set({
        isEditorOpen: true,
        editingEvent: event,
        editingDate: date,
        editingEndDate: endDate,
      }),
    closeEditor: () =>
      set({
        isEditorOpen: false,
        editingEvent: null,
        editingDate: null,
        editingEndDate: null,
      }),

    // Dialog actions
    openShareDialog: (calendar) =>
      set({
        isShareDialogOpen: true,
        sharingCalendar: calendar,
      }),
    closeShareDialog: () =>
      set({
        isShareDialogOpen: false,
        sharingCalendar: null,
      }),
    openICalDialog: (calendar) =>
      set({
        isICalDialogOpen: true,
        icalCalendar: calendar,
      }),
    closeICalDialog: () =>
      set({
        isICalDialogOpen: false,
        icalCalendar: null,
      }),
    openExternalSubscriptionDialog: (calendar) =>
      set({
        isExternalSubscriptionDialogOpen: true,
        externalSubscriptionCalendar: calendar,
      }),
    closeExternalSubscriptionDialog: () =>
      set({
        isExternalSubscriptionDialogOpen: false,
        externalSubscriptionCalendar: null,
      }),

    // Computed helpers
    getCalendarById: (id) => get().calendars.find((c) => c.id === id),
    getEventById: (id) => get().events.find((e) => e.id === id),
    getVisibleCalendars: () => {
      const { calendars, selectedCalendarIds } = get();
      return calendars.filter((c) => selectedCalendarIds.includes(c.id));
    },
    getEventsForDate: (date) => {
      const { expandedEvents, selectedCalendarIds } = get();
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      return expandedEvents.filter((event) => {
        if (!selectedCalendarIds.includes(event.calendarId)) {
          return false;
        }

        // All-day events
        if (event.allDay) {
          const eventStart = startOfDay(event.start);
          const eventEnd = endOfDay(event.end);
          return eventStart <= dayEnd && eventEnd >= dayStart;
        }

        // Timed events
        return event.start < dayEnd && event.end > dayStart;
      });
    },
    getEventsInRange: (start, end) => {
      const { expandedEvents, selectedCalendarIds } = get();

      return expandedEvents.filter((event) => {
        if (!selectedCalendarIds.includes(event.calendarId)) {
          return false;
        }
        return event.start < end && event.end > start;
      });
    },

    // Navigation helpers
    navigateToday: () => set({ currentDate: Date.now() }),
    navigatePrev: () => {
      const { currentDate, currentView } = get();
      set({ currentDate: navigateDate(currentDate, currentView, 'prev') });
    },
    navigateNext: () => {
      const { currentDate, currentView } = get();
      set({ currentDate: navigateDate(currentDate, currentView, 'next') });
    },

    // Reset
    reset: () => set(initialState),
  }))
);

// Selector hooks for optimized re-renders
export const selectCalendars = (state: CalendarStore): Calendar[] => state.calendars;
export const selectEvents = (state: CalendarStore): CalendarEvent[] => state.events;
export const selectExpandedEvents = (state: CalendarStore): ExpandedEvent[] => state.expandedEvents;
export const selectCurrentView = (state: CalendarStore): CalendarView => state.currentView;
export const selectCurrentDate = (state: CalendarStore): number => state.currentDate;
export const selectSelectedDate = (state: CalendarStore): number | null => state.selectedDate;
export const selectIsLoadingCalendars = (state: CalendarStore): boolean => state.isLoadingCalendars;
export const selectIsLoadingEvents = (state: CalendarStore): boolean => state.isLoadingEvents;
export const selectIsSaving = (state: CalendarStore): boolean => state.isSaving;
export const selectError = (state: CalendarStore): string | null => state.error;
export const selectIsEditorOpen = (state: CalendarStore): boolean => state.isEditorOpen;
export const selectEditingEvent = (state: CalendarStore): CalendarEvent | null =>
  state.editingEvent;
export const selectIsShareDialogOpen = (state: CalendarStore): boolean => state.isShareDialogOpen;
export const selectSharingCalendar = (state: CalendarStore): Calendar | null =>
  state.sharingCalendar;
export const selectIsICalDialogOpen = (state: CalendarStore): boolean => state.isICalDialogOpen;
export const selectICalCalendar = (state: CalendarStore): Calendar | null => state.icalCalendar;
export const selectIsExternalSubscriptionDialogOpen = (state: CalendarStore): boolean =>
  state.isExternalSubscriptionDialogOpen;
export const selectExternalSubscriptionCalendar = (state: CalendarStore): Calendar | null =>
  state.externalSubscriptionCalendar;
