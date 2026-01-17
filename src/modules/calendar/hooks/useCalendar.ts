/**
 * useCalendar Hook - Main hook for calendar operations
 */

/* eslint-disable @typescript-eslint/no-base-to-string -- API response mapping with fallbacks */

import { useCallback, useEffect, useRef } from 'react';

import { getCalendarAPI } from '@/shared/utils/electronAPI';

import { useCalendarStore } from '../stores/calendar.store';
import { getViewDateRange } from '../utils/dateHelpers';
import { expandRecurringEvent } from '../utils/recurrence';

import type {
  Calendar,
  CalendarEvent,
  ExpandedEvent,
  CalendarView,
  CreateCalendarInput,
  UpdateCalendarInput,
  CreateEventInput,
  UpdateEventInput,
  CalendarColor,
  RecurrenceRule,
  CalendarShare,
  CalendarPermission,
  ExternalCalendarSource,
  EventStatus,
  EventCategory,
  AttendeeRole,
  WeekDay,
} from '../types/Calendar.types';

// Type from electron API
interface CreateEventData {
  calendarId: string;
  title: string;
  description: string | undefined;
  location: string | undefined;
  start: number;
  end: number;
  allDay: boolean;
  timezone: string | undefined;
  recurrence: RecurrenceData | undefined;
  category: string | undefined;
  color: string | undefined;
  reminders: Array<{ id: string; type: string; minutes: number }> | undefined;
  attendees: AttendeeData[] | undefined;
}

interface RecurrenceData {
  frequency: string;
  interval: number;
  count: number | undefined;
  until: number | undefined;
  byDay: Array<{ day: string; position: number | undefined }> | undefined;
  byMonthDay: number[] | undefined;
  byMonth: number[] | undefined;
  exdates: number[] | undefined;
}

interface AttendeeData {
  id: string;
  name: string;
  email: string | undefined;
  isFamilyMember: boolean;
  memberId: string | undefined;
  responseStatus: string;
  role: string;
  optional: boolean;
}

interface UseCalendarReturn {
  // State
  calendars: Calendar[];
  events: CalendarEvent[];
  expandedEvents: ExpandedEvent[];
  currentView: CalendarView;
  currentDate: number;
  selectedDate: number | null;
  selectedEventId: string | null;
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

  // Computed
  visibleCalendars: Calendar[];
  selectedCalendarIds: string[];

  // Calendar actions
  loadCalendars: () => Promise<void>;
  createCalendar: (input: CreateCalendarInput) => Promise<Calendar | null>;
  updateCalendar: (input: UpdateCalendarInput) => Promise<Calendar | null>;
  deleteCalendar: (calendarId: string) => Promise<boolean>;
  toggleCalendarVisibility: (calendarId: string) => void;

  // Event actions
  loadEvents: () => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent | null>;
  updateEvent: (input: UpdateEventInput) => Promise<CalendarEvent | null>;
  deleteEvent: (eventId: string) => Promise<boolean>;

  // View actions
  setView: (view: CalendarView) => void;
  setCurrentDate: (date: number) => void;
  setSelectedDate: (date: number | null) => void;
  navigateToday: () => void;
  navigatePrev: () => void;
  navigateNext: () => void;

  // Editor actions
  openEventEditor: (
    event?: CalendarEvent | null,
    date?: number | null,
    endDate?: number | null
  ) => void;
  closeEventEditor: () => void;

  // Helpers
  getCalendarById: (id: string) => Calendar | undefined;
  getEventById: (id: string) => CalendarEvent | undefined;
  getEventsForDate: (date: number) => ExpandedEvent[];
  clearError: () => void;

  // Import/Export
  importICal: (
    calendarId: string,
    icalData: string
  ) => Promise<{ imported: number; errors: string[] }>;
  exportICal: (calendarId: string) => Promise<string>;

  // Sharing
  shareCalendar: (
    calendarId: string,
    memberId: string,
    permission: CalendarPermission
  ) => Promise<CalendarShare>;
  updateCalendarShare: (
    calendarId: string,
    memberId: string,
    permission: CalendarPermission
  ) => Promise<CalendarShare>;
  unshareCalendar: (calendarId: string, memberId: string) => Promise<boolean>;
  getCalendarShares: (calendarId: string) => Promise<CalendarShare[]>;

  // Dialogs
  openShareDialog: (calendar: Calendar | null) => void;
  closeShareDialog: () => void;
  openICalDialog: (calendar: Calendar | null) => void;
  closeICalDialog: () => void;

  // External sync
  subscribeExternalCalendar: (calendarId: string, url: string) => Promise<Calendar | null>;
  unsubscribeExternalCalendar: (calendarId: string) => Promise<boolean>;
  syncExternalCalendar: (
    calendarId: string
  ) => Promise<{ success: boolean; imported: number; errors: string[] }>;
  getExternalSyncStatus: (calendarId: string) => Promise<{
    externalSyncEnabled: boolean;
    externalSource?: {
      type: string;
      url?: string;
      syncDirection: string;
    };
    lastSyncAt?: number;
    syncInterval: number;
  }>;

  // External subscription dialog
  isExternalSubscriptionDialogOpen: boolean;
  externalSubscriptionCalendar: Calendar | null;
  openExternalSubscriptionDialog: (calendar: Calendar | null) => void;
  closeExternalSubscriptionDialog: () => void;
}

export function useCalendar(): UseCalendarReturn {
  // Store selectors
  const calendars: Calendar[] = useCalendarStore((state) => state.calendars);
  const events: CalendarEvent[] = useCalendarStore((state) => state.events);
  const expandedEvents: ExpandedEvent[] = useCalendarStore((state) => state.expandedEvents);
  const currentView: CalendarView = useCalendarStore((state) => state.currentView);
  const currentDate: number = useCalendarStore((state) => state.currentDate);
  const selectedDate: number | null = useCalendarStore((state) => state.selectedDate);
  const selectedEventId: string | null = useCalendarStore((state) => state.selectedEventId);
  const selectedCalendarIds: string[] = useCalendarStore((state) => state.selectedCalendarIds);
  const isLoadingCalendars: boolean = useCalendarStore((state) => state.isLoadingCalendars);
  const isLoadingEvents: boolean = useCalendarStore((state) => state.isLoadingEvents);
  const isSaving: boolean = useCalendarStore((state) => state.isSaving);
  const error: string | null = useCalendarStore((state) => state.error);
  const isEditorOpen: boolean = useCalendarStore((state) => state.isEditorOpen);
  const editingEvent: CalendarEvent | null = useCalendarStore((state) => state.editingEvent);
  const editingDate: number | null = useCalendarStore((state) => state.editingDate);
  const editingEndDate: number | null = useCalendarStore((state) => state.editingEndDate);

  // Store actions
  const setCalendars: (calendars: Calendar[]) => void = useCalendarStore(
    (state) => state.setCalendars
  );
  const setEvents: (events: CalendarEvent[]) => void = useCalendarStore((state) => state.setEvents);
  const setExpandedEvents: (events: ExpandedEvent[]) => void = useCalendarStore(
    (state) => state.setExpandedEvents
  );
  const setCurrentView: (view: CalendarView) => void = useCalendarStore(
    (state) => state.setCurrentView
  );
  const storeSetCurrentDate: (date: number) => void = useCalendarStore(
    (state) => state.setCurrentDate
  );
  const storeSetSelectedDate: (date: number | null) => void = useCalendarStore(
    (state) => state.setSelectedDate
  );
  const storeToggleCalendarVisibility: (calendarId: string) => void = useCalendarStore(
    (state) => state.toggleCalendarVisibility
  );
  const setLoadingCalendars: (loading: boolean) => void = useCalendarStore(
    (state) => state.setLoadingCalendars
  );
  const setLoadingEvents: (loading: boolean) => void = useCalendarStore(
    (state) => state.setLoadingEvents
  );
  const setSaving: (saving: boolean) => void = useCalendarStore((state) => state.setSaving);
  const setError: (error: string | null) => void = useCalendarStore((state) => state.setError);
  const openEditor: (
    event?: CalendarEvent | null,
    date?: number | null,
    endDate?: number | null
  ) => void = useCalendarStore((state) => state.openEditor);
  const closeEditor: () => void = useCalendarStore((state) => state.closeEditor);
  const openShareDialog: (calendar: Calendar | null) => void = useCalendarStore(
    (state) => state.openShareDialog
  );
  const closeShareDialog: () => void = useCalendarStore((state) => state.closeShareDialog);
  const openICalDialog: (calendar: Calendar | null) => void = useCalendarStore(
    (state) => state.openICalDialog
  );
  const closeICalDialog: () => void = useCalendarStore((state) => state.closeICalDialog);
  const openExternalSubscriptionDialog: (calendar: Calendar | null) => void = useCalendarStore(
    (state) => state.openExternalSubscriptionDialog
  );
  const closeExternalSubscriptionDialog: () => void = useCalendarStore(
    (state) => state.closeExternalSubscriptionDialog
  );
  const storeNavigateToday: () => void = useCalendarStore((state) => state.navigateToday);
  const storeNavigatePrev: () => void = useCalendarStore((state) => state.navigatePrev);
  const storeNavigateNext: () => void = useCalendarStore((state) => state.navigateNext);
  const getCalendarById: (id: string) => Calendar | undefined = useCalendarStore(
    (state) => state.getCalendarById
  );
  const getEventById: (id: string) => CalendarEvent | undefined = useCalendarStore(
    (state) => state.getEventById
  );
  const getVisibleCalendars: () => Calendar[] = useCalendarStore(
    (state) => state.getVisibleCalendars
  );
  const getEventsForDate: (date: number) => ExpandedEvent[] = useCalendarStore(
    (state) => state.getEventsForDate
  );

  const hasLoadedRef = useRef(false);

  // Load calendars
  const loadCalendars = useCallback(async () => {
    try {
      setLoadingCalendars(true);
      setError(null);

      const calendarAPI = getCalendarAPI();
      const result = await calendarAPI.getAll();

      // Map API response to Calendar type
      const cals: Calendar[] = result.map((cal: unknown) => {
        const c = cal as Record<string, unknown>;
        return {
          id: String(c['id'] ?? ''),
          familyId: String(c['familyId'] ?? ''),
          name: String(c['name'] ?? ''),
          description: c['description'] ? String(c['description']) : undefined,
          color: c['color'] as CalendarColor,
          icon: undefined,
          ownerId: String(c['ownerId'] ?? ''),
          ownerName: undefined,
          visibility: c['visibility'] as Calendar['visibility'],
          defaultPermission: c['defaultPermission'] as Calendar['defaultPermission'],
          sharedWith: (c['sharedWith'] as unknown[]).map((s: unknown) => {
            const share = s as Record<string, unknown>;
            return {
              memberId: String(share['memberId'] ?? ''),
              permission: share['permission'] as Calendar['defaultPermission'],
              sharedAt: Number(share['sharedAt'] ?? 0),
              sharedBy: String(share['sharedBy'] ?? ''),
            };
          }),
          defaultReminders: (c['defaultReminders'] as unknown[]).map((r: unknown) => {
            const reminder = r as Record<string, unknown>;
            return {
              id: String(reminder['id'] ?? ''),
              type: reminder['type'] as 'notification' | 'email' | 'popup',
              minutes: Number(reminder['minutes'] ?? 0),
            };
          }),
          timezone: String(c['timezone'] ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
          showDeclined: undefined,
          externalSyncEnabled: c['externalSyncEnabled']
            ? Boolean(c['externalSyncEnabled'])
            : undefined,
          externalSource: (() => {
            if (!c['externalSource']) {
              return undefined;
            }
            const es = c['externalSource'] as Record<string, unknown>;
            const source: ExternalCalendarSource = {
              type: es['type'] as string as ExternalCalendarSource['type'],
              syncDirection: es[
                'syncDirection'
              ] as string as ExternalCalendarSource['syncDirection'],
              ...(es['url'] ? { url: String(es['url']) } : {}),
              ...(es['accountId'] ? { accountId: String(es['accountId']) } : {}),
              ...(es['calendarId'] ? { calendarId: String(es['calendarId']) } : {}),
            };
            return source;
          })(),
          lastSyncAt: c['lastSyncAt'] ? Number(c['lastSyncAt']) : undefined,
          createdAt: Number(c['createdAt'] ?? Date.now()),
          updatedAt: Number(c['updatedAt'] ?? Date.now()),
        };
      });

      setCalendars(cals);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load calendars';
      setError(message);
      console.error('Failed to load calendars:', err);
    } finally {
      setLoadingCalendars(false);
    }
  }, [setLoadingCalendars, setError, setCalendars]);

  // Load events for current view
  const loadEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      setError(null);

      const { start, end } = getViewDateRange(currentDate, currentView);

      const query = {
        start: start.getTime(),
        end: end.getTime(),
      } as { calendarIds?: string[]; start: number; end: number };

      if (selectedCalendarIds.length > 0) {
        query.calendarIds = selectedCalendarIds;
      }

      const calendarAPI = getCalendarAPI();
      const result = await calendarAPI.getEvents(query);

      // Map API response to CalendarEvent type
      const evts: CalendarEvent[] = result.map((evt: unknown) => {
        const e = evt as Record<string, unknown>;
        let recurrence: RecurrenceRule | undefined = undefined;

        if (e['recurrence']) {
          const rec = e['recurrence'] as Record<string, unknown>;
          const recurrenceRule: RecurrenceRule = {
            frequency: rec['frequency'] as 'daily' | 'weekly' | 'monthly' | 'yearly',
            interval: Number(rec['interval'] ?? 1),
          };

          if (rec['count'] !== undefined) {
            recurrenceRule.count = Number(rec['count']);
          }
          if (rec['until'] !== undefined) {
            recurrenceRule.until = Number(rec['until']);
          }
          if (rec['byDay']) {
            recurrenceRule.byDay = (rec['byDay'] as unknown[]).map((d: unknown) => {
              const day = d as Record<string, unknown>;
              return {
                day: String(day['day'] ?? 'MO') as WeekDay,
                position: day['position'] ? Number(day['position']) : undefined,
              };
            });
          }
          if (rec['byMonthDay']) {
            recurrenceRule.byMonthDay = (rec['byMonthDay'] as unknown[]).map(Number);
          }
          if (rec['byMonth']) {
            recurrenceRule.byMonth = (rec['byMonth'] as unknown[]).map(Number);
          }
          if (rec['exdates']) {
            recurrenceRule.exdates = (rec['exdates'] as unknown[]).map(Number);
          }

          recurrence = recurrenceRule;
        }

        return {
          id: String(e['id'] ?? ''),
          calendarId: String(e['calendarId'] ?? ''),
          title: String(e['title'] ?? ''),
          description: e['description'] ? String(e['description']) : undefined,
          location: e['location'] ? String(e['location']) : undefined,
          start: Number(e['start'] ?? 0),
          end: Number(e['end'] ?? 0),
          allDay: Boolean(e['allDay'] ?? false),
          timezone: e['timezone'] ? String(e['timezone']) : '',
          category: e['category'] ? (e['category'] as EventCategory) : undefined,
          color: e['color'] ? (e['color'] as CalendarColor) : undefined,
          status: e['status'] as EventStatus,
          busyStatus: e['busyStatus'] as 'free' | 'busy' | 'tentative' | 'out_of_office',
          organizer: e['organizer']
            ? {
                id: String((e['organizer'] as Record<string, unknown>)['id'] ?? ''),
                name: String((e['organizer'] as Record<string, unknown>)['name'] ?? ''),
                email: (e['organizer'] as Record<string, unknown>)['email']
                  ? String((e['organizer'] as Record<string, unknown>)['email'])
                  : undefined,
                isFamilyMember: Boolean(
                  (e['organizer'] as Record<string, unknown>)['isFamilyMember'] ?? false
                ),
                memberId: (e['organizer'] as Record<string, unknown>)['memberId']
                  ? String((e['organizer'] as Record<string, unknown>)['memberId'])
                  : undefined,
                responseStatus: (e['organizer'] as Record<string, unknown>)['responseStatus'] as
                  | 'needs_action'
                  | 'accepted'
                  | 'declined'
                  | 'tentative',
                respondedAt: (e['organizer'] as Record<string, unknown>)['respondedAt']
                  ? Number((e['organizer'] as Record<string, unknown>)['respondedAt'])
                  : undefined,
                role: (e['organizer'] as Record<string, unknown>)['role'] as
                  | 'required'
                  | 'optional'
                  | 'chair'
                  | 'non_participant',
                optional: Boolean((e['organizer'] as Record<string, unknown>)['optional'] ?? false),
              }
            : undefined,
          recurrence,
          reminders: (e['reminders'] as unknown[]).map((r: unknown) => {
            const reminder = r as Record<string, unknown>;
            return {
              id: String(reminder['id'] ?? ''),
              type: reminder['type'] as 'notification' | 'email' | 'popup',
              minutes: Number(reminder['minutes'] ?? 0),
            };
          }),
          attendees: (e['attendees'] as unknown[]).map((a: unknown) => {
            const attendee = a as Record<string, unknown>;
            return {
              id: String(attendee['id'] ?? ''),
              name: String(attendee['name'] ?? ''),
              email: attendee['email'] ? String(attendee['email']) : undefined,
              isFamilyMember: Boolean(attendee['isFamilyMember'] ?? false),
              memberId: attendee['memberId'] ? String(attendee['memberId']) : undefined,
              responseStatus: attendee['responseStatus'] as
                | 'needs_action'
                | 'accepted'
                | 'declined'
                | 'tentative',
              respondedAt: attendee['respondedAt'] ? Number(attendee['respondedAt']) : undefined,
              role:
                (attendee['role'] as string) === 'resource'
                  ? 'optional'
                  : (attendee['role'] as AttendeeRole),
              optional: Boolean(attendee['optional'] ?? false),
            };
          }),
          createdAt: Number(e['createdAt'] ?? Date.now()),
          updatedAt: Number(e['updatedAt'] ?? Date.now()),
          familyId: String(e['familyId'] ?? ''),
          url: e['url'] ? String(e['url']) : undefined,
          recurrenceId: e['recurrenceId'] ? String(e['recurrenceId']) : undefined,
          originalStart: e['originalStart'] ? Number(e['originalStart']) : undefined,
          createdBy: String(e['createdBy'] ?? ''),
          lastModifiedBy: e['lastModifiedBy'] ? String(e['lastModifiedBy']) : undefined,
          externalId: e['externalId'] ? String(e['externalId']) : undefined,
          externalEtag: e['externalEtag'] ? String(e['externalEtag']) : undefined,
        };
      });

      setEvents(evts);

      // Expand recurring events
      const expanded: ExpandedEvent[] = [];
      for (const event of evts) {
        const instances = expandRecurringEvent(event, start.getTime(), end.getTime());
        expanded.push(...instances);
      }

      // Sort by start time
      expanded.sort((a, b) => a.start - b.start);
      setExpandedEvents(expanded);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load events';
      setError(message);
      console.error('Failed to load events:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, [
    setLoadingEvents,
    setError,
    setEvents,
    setExpandedEvents,
    currentDate,
    currentView,
    selectedCalendarIds,
  ]);

  // Create calendar
  const createCalendar = useCallback(
    async (input: CreateCalendarInput): Promise<Calendar | null> => {
      try {
        setSaving(true);
        setError(null);

        const createData = {
          name: input.name,
          color: input.color,
          visibility: input.visibility,
        } as {
          name: string;
          description?: string;
          color: string;
          visibility: string;
          timezone?: string;
        };

        if (input.description) {
          createData.description = input.description;
        }
        if (input.timezone) {
          createData.timezone = input.timezone;
        }

        const calendarAPI = getCalendarAPI();
        const result = await calendarAPI.create(createData);

        await loadCalendars();

        const r = result as Record<string, unknown>;
        return {
          id: String(r['id'] ?? ''),
          familyId: String(r['familyId'] ?? ''),
          name: String(r['name'] ?? ''),
          description: r['description'] ? String(r['description']) : undefined,
          color: r['color'] as CalendarColor,
          icon: undefined,
          ownerId: String(r['ownerId'] ?? ''),
          ownerName: undefined,
          visibility: r['visibility'] as Calendar['visibility'],
          defaultPermission: r['defaultPermission'] as Calendar['defaultPermission'],
          sharedWith: [],
          defaultReminders: [],
          timezone: String(r['timezone'] ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
          showDeclined: undefined,
          externalSyncEnabled: undefined,
          externalSource: undefined,
          lastSyncAt: undefined,
          createdAt: Number(r['createdAt'] ?? Date.now()),
          updatedAt: Number(r['updatedAt'] ?? Date.now()),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create calendar';
        setError(message);
        console.error('Failed to create calendar:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadCalendars]
  );

  // Update calendar
  const updateCalendar = useCallback(
    async (input: UpdateCalendarInput): Promise<Calendar | null> => {
      try {
        setSaving(true);
        setError(null);

        const { id, ...data } = input;
        const calendarAPI = getCalendarAPI();
        await calendarAPI.update(id, data);
        await loadCalendars();

        return getCalendarById(id) ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update calendar';
        setError(message);
        console.error('Failed to update calendar:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadCalendars, getCalendarById]
  );

  // Delete calendar
  const deleteCalendar = useCallback(
    async (calendarId: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        const calendarAPI = getCalendarAPI();
        await calendarAPI.delete(calendarId);
        await loadCalendars();
        await loadEvents();

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete calendar';
        setError(message);
        console.error('Failed to delete calendar:', err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadCalendars, loadEvents]
  );

  // Create event
  const createEvent = useCallback(
    async (input: CreateEventInput): Promise<CalendarEvent | null> => {
      try {
        setSaving(true);
        setError(null);

        // Build create data - include all required properties
        const createData: CreateEventData = {
          calendarId: input.calendarId,
          title: input.title,
          description: input.description,
          location: input.location,
          start: input.start,
          end: input.end,
          allDay: input.allDay,
          timezone: input.timezone,
          recurrence: undefined,
          category: input.category,
          color: input.color,
          reminders: undefined,
          attendees: undefined,
        };

        if (input.recurrence !== undefined) {
          createData.recurrence = {
            frequency: input.recurrence.frequency,
            interval: input.recurrence.interval,
            count: input.recurrence.count,
            until: input.recurrence.until,
            byDay: input.recurrence.byDay,
            byMonthDay: input.recurrence.byMonthDay,
            byMonth: input.recurrence.byMonth,
            exdates: input.recurrence.exdates,
          };
        }

        if (input.reminders !== undefined) {
          /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
          createData.reminders = input.reminders.map((r) => ({
            id: r.id,
            type: 'display',
            minutes: r.minutes,
          }));
          /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
        }

        if (input.attendees !== undefined) {
          createData.attendees = input.attendees.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            isFamilyMember: a.isFamilyMember,
            memberId: a.memberId,
            responseStatus: 'needs_action',
            role: a.role,
            optional: a.optional,
          }));
        }

        const calendarAPI = getCalendarAPI();
        await calendarAPI.createEvent(createData);

        await loadEvents();
        closeEditor();

        return null; // Events are reloaded
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create event';
        setError(message);
        console.error('Failed to create event:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadEvents, closeEditor]
  );

  // Update event
  const updateEvent = useCallback(
    async (input: UpdateEventInput): Promise<CalendarEvent | null> => {
      try {
        setSaving(true);
        setError(null);

        const { id, updateScope: _updateScope, ...data } = input;

        // Build update data with only defined properties
        const updateData: Partial<CreateEventData> = {};

        if (data.title !== undefined) {
          updateData.title = data.title;
        }
        if (data.description !== undefined) {
          updateData.description = data.description;
        }
        if (data.location !== undefined) {
          updateData.location = data.location;
        }
        if (data.start !== undefined) {
          updateData.start = data.start;
        }
        if (data.end !== undefined) {
          updateData.end = data.end;
        }
        if (data.allDay !== undefined) {
          updateData.allDay = data.allDay;
        }
        if (data.timezone !== undefined) {
          updateData.timezone = data.timezone;
        }
        if (data.category !== undefined) {
          updateData.category = data.category;
        }
        if (data.color !== undefined) {
          updateData.color = data.color;
        }

        if (data.recurrence !== undefined) {
          if (data.recurrence) {
            updateData.recurrence = {
              frequency: data.recurrence.frequency,
              interval: data.recurrence.interval,
              count: data.recurrence.count ?? undefined,
              until: data.recurrence.until ?? undefined,
              byDay:
                data.recurrence.byDay?.map((d) => ({
                  day: d.day,
                  position: d.position ?? undefined,
                })) ?? undefined,
              byMonthDay: data.recurrence.byMonthDay ?? undefined,
              byMonth: data.recurrence.byMonth ?? undefined,
              exdates: data.recurrence.exdates ?? undefined,
            };
          } else {
            updateData.recurrence = undefined;
          }
        }

        if (data.reminders !== undefined) {
          /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
          updateData.reminders = data.reminders.map((r) => ({
            id: r.id,
            type: 'display',
            minutes: r.minutes,
          }));
          /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
        }

        if (data.attendees !== undefined) {
          updateData.attendees = data.attendees.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email ?? undefined,
            isFamilyMember: a.isFamilyMember,
            memberId: a.memberId ?? undefined,
            responseStatus: a.responseStatus,
            role: a.role,
            optional: a.optional,
          }));
        }

        const calendarAPI = getCalendarAPI();
        await calendarAPI.updateEvent(id, updateData);

        await loadEvents();
        closeEditor();

        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update event';
        setError(message);
        console.error('Failed to update event:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadEvents, closeEditor]
  );

  // Delete event
  const deleteEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        const calendarAPI = getCalendarAPI();
        await calendarAPI.deleteEvent(eventId);
        await loadEvents();

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete event';
        setError(message);
        console.error('Failed to delete event:', err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadEvents]
  );

  // Import iCal
  const importICal = useCallback(
    async (calendarId: string, icalData: string) => {
      try {
        setSaving(true);
        setError(null);

        const calendarAPI = getCalendarAPI();
        const result = await calendarAPI.importICal(calendarId, icalData);
        await loadEvents();

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import iCal';
        setError(message);
        console.error('Failed to import iCal:', err);
        return { imported: 0, errors: [message] };
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadEvents]
  );

  // Export iCal
  const exportICal = useCallback(
    async (calendarId: string) => {
      try {
        const calendarAPI = getCalendarAPI();
        return await calendarAPI.exportICal(calendarId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to export iCal';
        setError(message);
        console.error('Failed to export iCal:', err);
        return '';
      }
    },
    [setError]
  );

  // Share calendar
  const shareCalendar = useCallback(
    async (
      calendarId: string,
      memberId: string,
      permission: CalendarPermission
    ): Promise<CalendarShare> => {
      try {
        setSaving(true);
        setError(null);

        const calendarAPI = getCalendarAPI();
        const result = await calendarAPI.share(calendarId, memberId, permission);
        await loadCalendars(); // Refresh to get updated sharing info

        return result as CalendarShare;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to share calendar';
        setError(message);
        console.error('Failed to share calendar:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadCalendars]
  );

  // Update calendar share
  const updateCalendarShare = useCallback(
    async (
      calendarId: string,
      memberId: string,
      permission: CalendarPermission
    ): Promise<CalendarShare> => {
      try {
        setSaving(true);
        setError(null);

        const calendarAPI = getCalendarAPI();
        const result = await calendarAPI.updateShare(calendarId, memberId, permission);
        await loadCalendars(); // Refresh to get updated sharing info

        return result as CalendarShare;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update calendar share';
        setError(message);
        console.error('Failed to update calendar share:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadCalendars]
  );

  // Unshare calendar
  const unshareCalendar = useCallback(
    async (calendarId: string, memberId: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        const calendarAPI = getCalendarAPI();
        await calendarAPI.unshare(calendarId, memberId);
        await loadCalendars(); // Refresh to get updated sharing info

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to unshare calendar';
        setError(message);
        console.error('Failed to unshare calendar:', err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadCalendars]
  );

  // Get calendar shares
  const getCalendarShares = useCallback(
    async (calendarId: string): Promise<CalendarShare[]> => {
      try {
        const calendarAPI = getCalendarAPI();
        return (await calendarAPI.getShares(calendarId)) as CalendarShare[];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get calendar shares';
        setError(message);
        console.error('Failed to get calendar shares:', err);
        return [];
      }
    },
    [setError]
  );

  // Subscribe to external calendar
  const subscribeExternalCalendar = useCallback(
    async (calendarId: string, url: string): Promise<Calendar | null> => {
      try {
        setSaving(true);
        setError(null);

        const calendarAPI = getCalendarAPI();
        await calendarAPI.subscribeExternal(calendarId, url);
        await loadCalendars(); // Refresh to get updated sync info
        await loadEvents(); // Reload events as new ones may have been imported

        const calendar = getCalendarById(calendarId);
        return calendar ?? null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to subscribe to external calendar';
        setError(message);
        console.error('Failed to subscribe to external calendar:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadCalendars, loadEvents, getCalendarById]
  );

  // Unsubscribe from external calendar
  const unsubscribeExternalCalendar = useCallback(
    async (calendarId: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        const calendarAPI = getCalendarAPI();
        await calendarAPI.unsubscribeExternal(calendarId);
        await loadCalendars(); // Refresh to get updated sync info

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to unsubscribe from external calendar';
        setError(message);
        console.error('Failed to unsubscribe from external calendar:', err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadCalendars]
  );

  // Sync external calendar manually
  const syncExternalCalendar = useCallback(
    async (
      calendarId: string
    ): Promise<{ success: boolean; imported: number; errors: string[] }> => {
      try {
        setSaving(true);
        setError(null);

        const calendarAPI = getCalendarAPI();
        const result = await calendarAPI.syncExternal(calendarId);
        await loadCalendars(); // Refresh to get updated lastSyncAt
        await loadEvents(); // Reload events as new ones may have been imported

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync external calendar';
        setError(message);
        console.error('Failed to sync external calendar:', err);
        return { success: false, imported: 0, errors: [message] };
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadCalendars, loadEvents]
  );

  // Get external sync status
  const getExternalSyncStatus = useCallback(
    async (
      calendarId: string
    ): Promise<{
      externalSyncEnabled: boolean;
      externalSource?: {
        type: string;
        url?: string;
        syncDirection: string;
      };
      lastSyncAt?: number;
      syncInterval: number;
    }> => {
      try {
        const calendarAPI = getCalendarAPI();
        return await calendarAPI.getSyncStatus(calendarId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get sync status';
        setError(message);
        console.error('Failed to get sync status:', err);
        return {
          externalSyncEnabled: false,
          syncInterval: 24 * 60 * 60 * 1000,
        };
      }
    },
    [setError]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Initial load
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      void loadCalendars();
    }
  }, [loadCalendars]);

  // Load events when view or date changes
  useEffect(() => {
    if (calendars.length > 0) {
      void loadEvents();
    }
  }, [currentDate, currentView, selectedCalendarIds, loadEvents, calendars.length]);

  return {
    // State
    calendars,
    events,
    expandedEvents,
    currentView,
    currentDate,
    selectedDate,
    selectedEventId,
    isLoadingCalendars,
    isLoadingEvents,
    isSaving,
    error,
    isEditorOpen,
    editingEvent,
    editingDate,
    editingEndDate,
    isShareDialogOpen: useCalendarStore((state) => state.isShareDialogOpen),
    sharingCalendar: useCalendarStore((state) => state.sharingCalendar),
    isICalDialogOpen: useCalendarStore((state) => state.isICalDialogOpen),
    icalCalendar: useCalendarStore((state) => state.icalCalendar),
    isExternalSubscriptionDialogOpen: useCalendarStore(
      (state) => state.isExternalSubscriptionDialogOpen
    ),
    externalSubscriptionCalendar: useCalendarStore((state) => state.externalSubscriptionCalendar),

    // Computed
    visibleCalendars: getVisibleCalendars(),
    selectedCalendarIds,

    // Calendar actions
    loadCalendars,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    toggleCalendarVisibility: storeToggleCalendarVisibility,

    // Event actions
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,

    // View actions
    setView: setCurrentView,
    setCurrentDate: storeSetCurrentDate,
    setSelectedDate: storeSetSelectedDate,
    navigateToday: storeNavigateToday,
    navigatePrev: storeNavigatePrev,
    navigateNext: storeNavigateNext,

    // Editor actions
    openEventEditor: openEditor,
    closeEventEditor: closeEditor,

    // Dialog actions
    openShareDialog,
    closeShareDialog,
    openICalDialog,
    closeICalDialog,
    openExternalSubscriptionDialog,
    closeExternalSubscriptionDialog,

    // External sync
    subscribeExternalCalendar,
    unsubscribeExternalCalendar,
    syncExternalCalendar,
    getExternalSyncStatus,

    // Helpers
    getCalendarById,
    getEventById,
    getEventsForDate,
    clearError,

    // Import/Export
    importICal,
    exportICal,

    // Sharing
    shareCalendar,
    updateCalendarShare,
    unshareCalendar,
    getCalendarShares,
  };
}
