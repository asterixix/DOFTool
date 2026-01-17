import { describe, it, expect } from 'vitest';
import { parseICal, generateICal, icalEventToCalendarEvent } from './ical';

import type { Calendar, CalendarEvent } from '../types/Calendar.types';

// Helper to create mock Calendar
function createMockCalendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    id: 'cal-1',
    familyId: 'family-1',
    name: 'Test Calendar',
    description: undefined,
    color: 'blue',
    icon: undefined,
    ownerId: 'user-1',
    ownerName: 'Test User',
    visibility: 'private',
    defaultPermission: 'none',
    sharedWith: [],
    defaultReminders: [],
    timezone: 'America/New_York',
    showDeclined: undefined,
    externalSyncEnabled: undefined,
    externalSource: undefined,
    lastSyncAt: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// Helper to create mock CalendarEvent
function createMockCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    calendarId: 'cal-1',
    familyId: 'family-1',
    title: 'Test Event',
    description: undefined,
    location: undefined,
    url: undefined,
    start: new Date('2024-01-15T10:00:00Z').getTime(),
    end: new Date('2024-01-15T11:00:00Z').getTime(),
    allDay: false,
    timezone: undefined,
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
  };
}

describe('ical', () => {
  describe('parseICal', () => {
    it('should parse basic VEVENT', () => {
      const ical = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-123
SUMMARY:Team Meeting
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      expect(events.length).toBe(1);
      expect(events[0]?.uid).toBe('event-123');
      expect(events[0]?.summary).toBe('Team Meeting');
      expect(events[0]?.allDay).toBe(false);
    });

    it('should parse all-day event', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-123
SUMMARY:Holiday
DTSTART;VALUE=DATE:20240115
DTEND;VALUE=DATE:20240116
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      expect(events.length).toBe(1);
      expect(events[0]?.allDay).toBe(true);
      expect(events[0]?.dtstart.getDate()).toBe(15);
    });

    it('should parse event with description and location', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-123
SUMMARY:Conference
DESCRIPTION:Annual team conference
LOCATION:Main Hall
DTSTART:20240115T100000Z
DTEND:20240115T120000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      expect(events[0]?.description).toBe('Annual team conference');
      expect(events[0]?.location).toBe('Main Hall');
    });

    it('should parse event with RRULE', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-123
SUMMARY:Weekly Meeting
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
RRULE:FREQ=WEEKLY;BYDAY=MO
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      expect(events[0]?.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
    });

    it('should parse event with status', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-123
SUMMARY:Tentative Meeting
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
STATUS:TENTATIVE
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      expect(events[0]?.status).toBe('TENTATIVE');
    });

    it('should parse event with categories', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-123
SUMMARY:Team Event
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
CATEGORIES:MEETING,WORK
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      expect(events[0]?.categories).toEqual(['MEETING', 'WORK']);
    });

    it('should handle line folding', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-123
SUMMARY:A very long event title that needs to be
 folded across multiple lines
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      expect(events[0]?.summary).toBe(
        'A very long event title that needs to befolded across multiple lines'
      );
    });

    it('should skip incomplete events', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-123
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      expect(events.length).toBe(0);
    });

    it('should handle empty input', () => {
      const events = parseICal('');
      expect(events.length).toBe(0);
    });

    it('should unescape special characters', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-123
SUMMARY:Meeting\\, with commas\\; and semicolons
DESCRIPTION:Line 1\\nLine 2
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      expect(events[0]?.summary).toBe('Meeting, with commas; and semicolons');
      expect(events[0]?.description).toBe('Line 1\nLine 2');
    });

    it('should parse multiple events', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-1
SUMMARY:Event 1
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT
BEGIN:VEVENT
UID:event-2
SUMMARY:Event 2
DTSTART:20240116T100000Z
DTEND:20240116T110000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      expect(events.length).toBe(2);
      expect(events[0]?.uid).toBe('event-1');
      expect(events[1]?.uid).toBe('event-2');
    });

    it('should parse UTC dates correctly', () => {
      const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-123
SUMMARY:UTC Event
DTSTART:20240115T150000Z
DTEND:20240115T160000Z
END:VEVENT
END:VCALENDAR`;

      const events = parseICal(ical);
      const start = events[0]?.dtstart;
      expect(start?.getUTCHours()).toBe(15);
      expect(start?.getUTCMinutes()).toBe(0);
    });
  });

  describe('generateICal', () => {
    it('should generate valid VCALENDAR', () => {
      const calendar = createMockCalendar({ name: 'My Calendar' });
      const events: CalendarEvent[] = [];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('END:VCALENDAR');
      expect(ical).toContain('VERSION:2.0');
      expect(ical).toContain('PRODID:-//DOFTool//Calendar//EN');
      expect(ical).toContain('X-WR-CALNAME:My Calendar');
    });

    it('should include calendar description if present', () => {
      const calendar = createMockCalendar({ description: 'Test description' });
      const ical = generateICal(calendar, []);

      expect(ical).toContain('X-WR-CALDESC:Test description');
    });

    it('should include timezone if present', () => {
      const calendar = createMockCalendar({ timezone: 'America/New_York' });
      const ical = generateICal(calendar, []);

      expect(ical).toContain('X-WR-TIMEZONE:America/New_York');
    });

    it('should generate VEVENT for each event', () => {
      const calendar = createMockCalendar();
      const events = [
        createMockCalendarEvent({ id: 'event-1', title: 'Event 1' }),
        createMockCalendarEvent({ id: 'event-2', title: 'Event 2' }),
      ];

      const ical = generateICal(calendar, events);

      expect(ical.match(/BEGIN:VEVENT/g)?.length).toBe(2);
      expect(ical.match(/END:VEVENT/g)?.length).toBe(2);
      expect(ical).toContain('SUMMARY:Event 1');
      expect(ical).toContain('SUMMARY:Event 2');
    });

    it('should generate all-day events correctly', () => {
      const calendar = createMockCalendar();
      const events = [createMockCalendarEvent({ allDay: true })];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('DTSTART;VALUE=DATE:');
      expect(ical).toContain('DTEND;VALUE=DATE:');
    });

    it('should include event description and location', () => {
      const calendar = createMockCalendar();
      const events = [
        createMockCalendarEvent({
          description: 'Event description',
          location: 'Event location',
        }),
      ];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('DESCRIPTION:Event description');
      expect(ical).toContain('LOCATION:Event location');
    });

    it('should include event status', () => {
      const calendar = createMockCalendar();
      const events = [createMockCalendarEvent({ status: 'tentative' })];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('STATUS:TENTATIVE');
    });

    it('should include event category', () => {
      const calendar = createMockCalendar();
      const events = [createMockCalendarEvent({ category: 'meeting' })];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('CATEGORIES:MEETING');
    });

    it('should generate RRULE for recurring events', () => {
      const calendar = createMockCalendar();
      const events = [
        createMockCalendarEvent({
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            byDay: [{ day: 'MO', position: undefined }],
          },
        }),
      ];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    });

    it('should generate RRULE with interval', () => {
      const calendar = createMockCalendar();
      const events = [
        createMockCalendarEvent({
          recurrence: {
            frequency: 'daily',
            interval: 2,
          },
        }),
      ];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('RRULE:FREQ=DAILY;INTERVAL=2');
    });

    it('should generate RRULE with count', () => {
      const calendar = createMockCalendar();
      const events = [
        createMockCalendarEvent({
          recurrence: {
            frequency: 'daily',
            interval: 1,
            count: 10,
          },
        }),
      ];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('COUNT=10');
    });

    it('should generate VALARM for reminders', () => {
      const calendar = createMockCalendar();
      const events = [
        createMockCalendarEvent({
          reminders: [{ id: 'r-1', minutes: 15 }],
        }),
      ];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('BEGIN:VALARM');
      expect(ical).toContain('TRIGGER:-PT15M');
      expect(ical).toContain('END:VALARM');
    });

    it('should generate ATTENDEE for attendees', () => {
      const calendar = createMockCalendar();
      const events = [
        createMockCalendarEvent({
          attendees: [
            {
              id: 'att-1',
              name: 'John Doe',
              email: 'john@example.com',
              isFamilyMember: false,
              memberId: undefined,
              responseStatus: 'accepted',
              respondedAt: undefined,
              role: 'required',
              optional: false,
            },
          ],
        }),
      ];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('ATTENDEE;');
      expect(ical).toContain('CN=John Doe');
      expect(ical).toContain('mailto:john@example.com');
      expect(ical).toContain('PARTSTAT=ACCEPTED');
    });

    it('should escape special characters', () => {
      const calendar = createMockCalendar();
      const events = [
        createMockCalendarEvent({
          title: 'Meeting, with commas; and semicolons',
          description: 'Line 1\nLine 2',
        }),
      ];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('SUMMARY:Meeting\\, with commas\\; and semicolons');
      expect(ical).toContain('DESCRIPTION:Line 1\\nLine 2');
    });

    it('should include transparency based on busy status', () => {
      const calendar = createMockCalendar();
      const events = [createMockCalendarEvent({ busyStatus: 'free' })];

      const ical = generateICal(calendar, events);

      expect(ical).toContain('TRANSP:TRANSPARENT');
    });
  });

  describe('icalEventToCalendarEvent', () => {
    it('should convert basic iCal event', () => {
      const icalEvent = {
        uid: 'event-123',
        summary: 'Test Event',
        dtstart: new Date('2024-01-15T10:00:00Z'),
        dtend: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
      };

      const result = icalEventToCalendarEvent(icalEvent, 'cal-1', 'family-1');

      expect(result.title).toBe('Test Event');
      expect(result.calendarId).toBe('cal-1');
      expect(result.familyId).toBe('family-1');
      expect(result.allDay).toBe(false);
      expect(result.start).toBe(icalEvent.dtstart.getTime());
      expect(result.end).toBe(icalEvent.dtend.getTime());
    });

    it('should convert event with description and location', () => {
      const icalEvent = {
        uid: 'event-123',
        summary: 'Test Event',
        description: 'Event description',
        location: 'Event location',
        dtstart: new Date('2024-01-15T10:00:00Z'),
        dtend: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
      };

      const result = icalEventToCalendarEvent(icalEvent, 'cal-1', 'family-1');

      expect(result.description).toBe('Event description');
      expect(result.location).toBe('Event location');
    });

    it('should convert event status', () => {
      const icalEvent = {
        uid: 'event-123',
        summary: 'Test Event',
        dtstart: new Date('2024-01-15T10:00:00Z'),
        dtend: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
        status: 'tentative',
      };

      const result = icalEventToCalendarEvent(icalEvent, 'cal-1', 'family-1');

      expect(result.status).toBe('tentative');
    });

    it('should set default values', () => {
      const icalEvent = {
        uid: 'event-123',
        summary: 'Test Event',
        dtstart: new Date('2024-01-15T10:00:00Z'),
        dtend: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
      };

      const result = icalEventToCalendarEvent(icalEvent, 'cal-1', 'family-1');

      expect(result.status).toBe('confirmed');
      expect(result.busyStatus).toBe('busy');
      expect(result.attendees).toEqual([]);
      expect(result.reminders).toEqual([]);
      expect(result.createdBy).toBe('import');
    });

    it('should convert category from categories array', () => {
      const icalEvent = {
        uid: 'event-123',
        summary: 'Test Event',
        dtstart: new Date('2024-01-15T10:00:00Z'),
        dtend: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
        categories: ['MEETING', 'WORK'],
      };

      const result = icalEventToCalendarEvent(icalEvent, 'cal-1', 'family-1');

      expect(result.category).toBe('meeting');
    });
  });
});
