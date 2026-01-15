/**
 * External Calendar Sync Service
 * Handles syncing calendars from external iCal URLs
 */

import type { YjsService } from './YjsService';
import type { CalendarInfo, CalendarEventInfo } from '../main';
import type * as Y from 'yjs';

interface IExternalCalendarSyncService {
  start(): Promise<void>;
  stop(): void;
  syncCalendar(
    calendarId: string
  ): Promise<{ success: boolean; imported: number; errors: string[] }>;
  syncAllCalendars(): Promise<void>;
}

export class ExternalCalendarSyncService implements IExternalCalendarSyncService {
  private yjsService: YjsService;
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  // 24 hours in milliseconds
  private readonly DEFAULT_SYNC_INTERVAL = 24 * 60 * 60 * 1000;

  constructor(yjsService: YjsService) {
    this.yjsService = yjsService;
  }

  /**
   * Start the sync service - syncs all calendars on startup and sets up periodic sync
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    console.log('Starting External Calendar Sync Service...');
    this.isRunning = true;

    // Sync all calendars on startup
    await this.syncAllCalendars();

    // Set up periodic sync for all calendars
    this.setupPeriodicSync();

    console.log('External Calendar Sync Service started');
  }

  /**
   * Stop the sync service and clear all intervals
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping External Calendar Sync Service...');
    this.isRunning = false;

    // Clear all sync intervals
    for (const interval of this.syncIntervals.values()) {
      clearInterval(interval);
    }
    this.syncIntervals.clear();

    console.log('External Calendar Sync Service stopped');
  }

  /**
   * Setup periodic sync for all calendars with external sync enabled
   */
  private setupPeriodicSync(): void {
    const { calendarsMap } = this.getCalendarCollections();

    // Use keys and get() to ensure proper typing and runtime checks
    for (const calendarId of Array.from(calendarsMap.keys())) {
      // Ensure calendarId is a string (Yjs maps can have unknown keys)
      if (typeof calendarId !== 'string') {
        continue;
      }
      const calendar = calendarsMap.get(calendarId);
      if (!calendar) {
        continue;
      }
      if (calendar.externalSyncEnabled && calendar.externalSource?.type === 'ical_url') {
        const interval =
          typeof calendar.syncInterval === 'number'
            ? calendar.syncInterval
            : this.DEFAULT_SYNC_INTERVAL;
        this.setupCalendarSync(calendarId, interval);
      }
    }

    // Listen for calendar changes to add/remove sync intervals
    calendarsMap.observe((event: Y.YMapEvent<CalendarInfo>) => {
      event.changes.keys.forEach((change: unknown, calendarId: unknown) => {
        // Validate types before accessing properties (guards against unsafe `unknown` values)
        if (typeof calendarId !== 'string') {
          return;
        }
        if (!change || typeof change !== 'object' || !('action' in change)) {
          return;
        }

        const action = (change as { action: unknown }).action as string;

        if (action === 'add' || action === 'update') {
          const calendar = calendarsMap.get(calendarId);
          if (calendar?.externalSyncEnabled && calendar.externalSource?.type === 'ical_url') {
            // Clear existing interval if any
            const existingInterval = this.syncIntervals.get(calendarId);
            if (existingInterval) {
              clearInterval(existingInterval);
            }

            const interval =
              typeof calendar.syncInterval === 'number'
                ? calendar.syncInterval
                : this.DEFAULT_SYNC_INTERVAL;
            this.setupCalendarSync(calendarId, interval);
          }
        } else if (action === 'delete') {
          // Clear interval when calendar is deleted
          const existingInterval = this.syncIntervals.get(calendarId);
          if (existingInterval) {
            clearInterval(existingInterval);
            this.syncIntervals.delete(calendarId);
          }
        }
      });
    });
  }

  /**
   * Setup periodic sync for a specific calendar
   */
  private setupCalendarSync(calendarId: string, intervalMs: number): void {
    // Clear existing interval if any
    const existingInterval = this.syncIntervals.get(calendarId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set up new interval
    const interval = setInterval(() => {
      if (this.isRunning) {
        console.log(`Syncing external calendar: ${calendarId}`);
        // Call syncCalendar and handle errors without returning a Promise from the callback
        this.syncCalendar(calendarId).catch((error) => {
          console.error(`Failed to sync calendar ${calendarId}:`, error);
        });
      }
    }, intervalMs);

    this.syncIntervals.set(calendarId, interval);
    console.log(`Set up periodic sync for calendar ${calendarId} (interval: ${intervalMs}ms)`);
  }

  /**
   * Sync all calendars with external sync enabled
   */
  async syncAllCalendars(): Promise<void> {
    const { calendarsMap } = this.getCalendarCollections();
    const syncPromises: Promise<void>[] = [];

    calendarsMap.forEach((calendar, calendarId) => {
      if (calendar.externalSyncEnabled && calendar.externalSource?.type === 'ical_url') {
        syncPromises.push(
          this.syncCalendar(calendarId)
            .then(() => undefined)
            .catch((error) => {
              console.error(`Failed to sync calendar ${calendarId}:`, error);
            })
        );
      }
    });

    await Promise.all(syncPromises);
  }

  /**
   * Sync a specific calendar from its external source
   */
  async syncCalendar(
    calendarId: string
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const { calendarsMap, eventsMap } = this.getCalendarCollections();
    const calendar = calendarsMap.get(calendarId);

    if (!calendar) {
      return { success: false, imported: 0, errors: ['Calendar not found'] };
    }

    if (!calendar.externalSyncEnabled || !calendar.externalSource) {
      return {
        success: false,
        imported: 0,
        errors: ['External sync not enabled for this calendar'],
      };
    }

    if (calendar.externalSource.type !== 'ical_url' || !calendar.externalSource.url) {
      return { success: false, imported: 0, errors: ['Invalid external source configuration'] };
    }

    try {
      // Fetch iCal data from URL with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 seconds

      const response = await fetch(calendar.externalSource.url, {
        headers: {
          'User-Agent': 'FamilySync/1.0',
          Accept: 'text/calendar',
        },
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId);
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const icalData = await response.text();

      // Parse and import iCal data
      const { parseICal, icalEventToCalendarEvent } =
        await import('../../src/modules/calendar/utils/ical');
      const icalEvents = parseICal(icalData);

      let imported = 0;
      const errors: string[] = [];
      const now = Date.now();

      // Track existing events by external ID to handle updates
      const existingEventsByExternalId = new Map<
        string,
        { id: string; event: CalendarEventInfo }
      >();
      eventsMap.forEach((event, eventId) => {
        if (event.calendarId === calendarId && event.externalId) {
          existingEventsByExternalId.set(event.externalId, { id: eventId, event });
        }
      });

      // Track which external IDs we've seen in this sync (to delete removed events later)
      const seenExternalIds = new Set<string>();

      // Import new/updated events
      for (const icalEvent of icalEvents) {
        try {
          const eventData = icalEventToCalendarEvent(icalEvent, calendarId, calendar.familyId);
          seenExternalIds.add(icalEvent.uid);

          // Find existing event by external ID or create new ID
          const existing = existingEventsByExternalId.get(icalEvent.uid);
          const eventId = existing?.id ?? `${calendarId}-${icalEvent.uid}`;
          const existingEvent = existing?.event;

          const newEvent: CalendarEventInfo = {
            id: eventId,
            calendarId,
            familyId: calendar.familyId,
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            start: eventData.start,
            end: eventData.end,
            allDay: eventData.allDay,
            timezone: eventData.timezone,
            recurrence: eventData.recurrence
              ? {
                  frequency: eventData.recurrence.frequency,
                  interval: eventData.recurrence.interval,
                  count: eventData.recurrence.count,
                  until: eventData.recurrence.until,
                  byDay: eventData.recurrence.byDay?.map((d) => ({
                    day: d.day,
                    position: d.position,
                  })),
                  byMonthDay: eventData.recurrence.byMonthDay,
                  byMonth: eventData.recurrence.byMonth,
                  exdates: eventData.recurrence.exdates,
                }
              : undefined,
            status: eventData.status,
            busyStatus: eventData.busyStatus,
            category: eventData.category,
            color: undefined,
            attendees: [],
            reminders: [],
            createdBy: existingEvent?.createdBy ?? 'external_sync',
            createdAt: existingEvent?.createdAt ?? now,
            updatedAt: now,
            externalId: icalEvent.uid,
            externalEtag: undefined,
          };

          eventsMap.set(eventId, newEvent);
          imported++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to import event "${icalEvent.summary}": ${errorMessage}`);
        }
      }

      // Delete events that are no longer in the external feed
      for (const [externalId, { id: eventId }] of existingEventsByExternalId) {
        if (!seenExternalIds.has(externalId)) {
          eventsMap.delete(eventId);
        }
      }

      // Update calendar's last sync time
      const updatedCalendar: CalendarInfo = {
        ...calendar,
        lastSyncAt: now,
        updatedAt: now,
      };
      calendarsMap.set(calendarId, updatedCalendar);

      console.log(
        `Synced calendar ${calendarId}: imported ${imported} events, ${errors.length} errors`
      );

      return { success: true, imported, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to sync calendar ${calendarId}:`, error);
      return { success: false, imported: 0, errors: [errorMessage] };
    }
  }

  /**
   * Get calendar collections from Yjs
   */
  private getCalendarCollections(): {
    calendarsMap: Y.Map<CalendarInfo>;
    eventsMap: Y.Map<CalendarEventInfo>;
  } {
    const structure = this.yjsService.getStructure();
    return {
      calendarsMap: structure.calendars as Y.Map<CalendarInfo>,
      eventsMap: structure.events as Y.Map<CalendarEventInfo>,
    };
  }
}
