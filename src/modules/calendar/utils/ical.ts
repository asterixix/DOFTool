/**
 * iCal Import/Export Utilities
 * Based on RFC 5545 (iCalendar) format
 */

import { parseRRule } from './recurrence';

import type {
  CalendarEvent,
  Calendar,
  RecurrenceRule,
  EventReminder,
  EventAttendee,
} from '../types/Calendar.types';

// Simple iCal parser (for basic events)
// For production, use ical.js library

interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: Date;
  dtend: Date;
  allDay: boolean;
  rrule?: string;
  status?: string;
  categories?: string[];
}

/**
 * Parse iCal/ICS content into events
 */
export function parseICal(icalContent: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalContent.split(/\r?\n/);

  let currentEvent: Partial<ICalEvent> | null = null;
  let inEvent = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line) {
      continue;
    }

    // Handle line folding (continuation lines start with space or tab)
    while (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine && (nextLine.startsWith(' ') || nextLine.startsWith('\t'))) {
        i++;
        line += nextLine.substring(1);
      } else {
        break;
      }
    }

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {
        allDay: false,
      };
    } else if (line === 'END:VEVENT' && currentEvent) {
      inEvent = false;
      if (currentEvent.uid && currentEvent.summary && currentEvent.dtstart && currentEvent.dtend) {
        events.push(currentEvent as ICalEvent);
      }
      currentEvent = null;
    } else if (inEvent && currentEvent) {
      const splitIdx = line.indexOf(':');
      if (splitIdx === -1) {
        continue;
      }

      const property = line.slice(0, splitIdx);
      const value = line.slice(splitIdx + 1);

      // Handle property parameters (e.g., DTSTART;VALUE=DATE:20231225)
      const [propName, ...params] = property.split(';');
      const isDateOnly = params.some((p) => p === 'VALUE=DATE');

      if (!propName) {
        continue;
      }

      switch (propName.toUpperCase()) {
        case 'UID':
          currentEvent.uid = value;
          break;
        case 'SUMMARY':
          currentEvent.summary = unescapeICalText(value);
          break;
        case 'DESCRIPTION':
          currentEvent.description = unescapeICalText(value);
          break;
        case 'LOCATION':
          currentEvent.location = unescapeICalText(value);
          break;
        case 'DTSTART':
          currentEvent.dtstart = parseICalDateTime(value, isDateOnly);
          currentEvent.allDay = isDateOnly;
          break;
        case 'DTEND':
          currentEvent.dtend = parseICalDateTime(value, isDateOnly);
          break;
        case 'RRULE':
          currentEvent.rrule = value;
          break;
        case 'STATUS':
          currentEvent.status = value;
          break;
        case 'CATEGORIES':
          currentEvent.categories = value.split(',');
          break;
      }
    }
  }

  return events;
}

/**
 * Generate iCal/ICS content from events
 */
export function generateICal(calendar: Calendar, events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DOFTool//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(calendar.name)}`,
  ];

  if (calendar.description) {
    lines.push(`X-WR-CALDESC:${escapeICalText(calendar.description)}`);
  }

  if (calendar.timezone) {
    lines.push(`X-WR-TIMEZONE:${calendar.timezone}`);
  }

  for (const event of events) {
    lines.push(...generateICalEvent(event));
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generate VEVENT component
 */
function generateICalEvent(event: CalendarEvent): string[] {
  const lines: string[] = ['BEGIN:VEVENT'];

  lines.push(`UID:${event.id}@doftool.app`);
  lines.push(`DTSTAMP:${formatICalDateTime(new Date())}`);
  lines.push(`CREATED:${formatICalDateTime(new Date(event.createdAt))}`);
  lines.push(`LAST-MODIFIED:${formatICalDateTime(new Date(event.updatedAt))}`);

  // Date/time
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatICalDate(new Date(event.start))}`);
    lines.push(`DTEND;VALUE=DATE:${formatICalDate(new Date(event.end))}`);
  } else {
    lines.push(`DTSTART:${formatICalDateTime(new Date(event.start))}`);
    lines.push(`DTEND:${formatICalDateTime(new Date(event.end))}`);
  }

  // Title and description
  lines.push(`SUMMARY:${escapeICalText(event.title)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  // Status
  const statusMap: Record<string, string> = {
    confirmed: 'CONFIRMED',
    tentative: 'TENTATIVE',
    cancelled: 'CANCELLED',
  };
  lines.push(`STATUS:${statusMap[event.status] ?? 'CONFIRMED'}`);

  // Transparency (free/busy)
  lines.push(`TRANSP:${event.busyStatus === 'free' ? 'TRANSPARENT' : 'OPAQUE'}`);

  // Category
  if (event.category) {
    lines.push(`CATEGORIES:${event.category.toUpperCase()}`);
  }

  // Recurrence
  if (event.recurrence) {
    lines.push(generateRRule(event.recurrence));
  }

  // Reminders (VALARM)
  for (const reminder of event.reminders) {
    lines.push(...generateVAlarm(reminder));
  }

  // Attendees
  for (const attendee of event.attendees) {
    lines.push(generateAttendee(attendee));
  }

  lines.push('END:VEVENT');
  return lines;
}

/**
 * Generate RRULE string
 */
function generateRRule(rule: RecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.frequency.toUpperCase()}`];

  if (rule.interval && rule.interval !== 1) {
    parts.push(`INTERVAL=${rule.interval}`);
  }

  if (rule.count) {
    parts.push(`COUNT=${rule.count}`);
  }

  if (rule.until) {
    parts.push(`UNTIL=${formatICalDateTime(new Date(rule.until))}`);
  }

  if (rule.byDay && rule.byDay.length > 0) {
    const byDay = rule.byDay
      .map((bd) => (bd.position ? `${bd.position}${bd.day}` : bd.day))
      .join(',');
    parts.push(`BYDAY=${byDay}`);
  }

  if (rule.byMonthDay && rule.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
  }

  if (rule.byMonth && rule.byMonth.length > 0) {
    parts.push(`BYMONTH=${rule.byMonth.join(',')}`);
  }

  if (rule.weekStart) {
    parts.push(`WKST=${rule.weekStart}`);
  }

  return `RRULE:${parts.join(';')}`;
}

/**
 * Generate VALARM component
 */
function generateVAlarm(reminder: EventReminder): string[] {
  const lines: string[] = ['BEGIN:VALARM'];

  lines.push('ACTION:DISPLAY');

  // Trigger (negative means before event)
  const trigger = reminder.minutes === 0 ? 'PT0S' : `-PT${reminder.minutes}M`;
  lines.push(`TRIGGER:${trigger}`);

  lines.push('DESCRIPTION:Event reminder');
  lines.push('END:VALARM');

  return lines;
}

/**
 * Generate ATTENDEE line
 */
function generateAttendee(attendee: EventAttendee): string {
  const params: string[] = [];

  // Role
  const roleMap: Record<string, string> = {
    required: 'REQ-PARTICIPANT',
    optional: 'OPT-PARTICIPANT',
    chair: 'CHAIR',
    non_participant: 'NON-PARTICIPANT',
  };
  params.push(`ROLE=${roleMap[attendee.role] ?? 'REQ-PARTICIPANT'}`);

  // Participation status
  const partstatMap: Record<string, string> = {
    needs_action: 'NEEDS-ACTION',
    accepted: 'ACCEPTED',
    declined: 'DECLINED',
    tentative: 'TENTATIVE',
  };
  params.push(`PARTSTAT=${partstatMap[attendee.responseStatus] ?? 'NEEDS-ACTION'}`);

  // Common name
  params.push(`CN=${escapeICalText(attendee.name)}`);

  // Email
  const mailto = attendee.email
    ? `mailto:${attendee.email}`
    : `mailto:${attendee.id}@doftool.local`;

  return `ATTENDEE;${params.join(';')}:${mailto}`;
}

// Helper functions

function parseICalDateTime(value: string, isDateOnly: boolean): Date {
  if (isDateOnly) {
    // Format: YYYYMMDD
    if (value.length < 8) {
      return new Date();
    }
    const year = parseInt(value.slice(0, 4), 10);
    const month = parseInt(value.slice(4, 6), 10) - 1;
    const day = parseInt(value.slice(6, 8), 10);
    return new Date(year, month, day);
  }

  // Format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  if (value.length < 15) {
    return new Date();
  }
  const year = parseInt(value.slice(0, 4), 10);
  const month = parseInt(value.slice(4, 6), 10) - 1;
  const day = parseInt(value.slice(6, 8), 10);
  const hour = parseInt(value.slice(9, 11), 10);
  const minute = parseInt(value.slice(11, 13), 10);
  const second = parseInt(value.slice(13, 15), 10);

  if (value.endsWith('Z')) {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  return new Date(year, month, day, hour, minute, second);
}

function formatICalDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function formatICalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function unescapeICalText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Convert parsed iCal event to CalendarEvent input
 */
export function icalEventToCalendarEvent(
  icalEvent: ICalEvent,
  calendarId: string,
  familyId: string
): Omit<CalendarEvent, 'id'> {
  let recurrence: RecurrenceRule | undefined = undefined;

  if (icalEvent.rrule) {
    const parsed = parseRRule(icalEvent.rrule);
    if (parsed) {
      recurrence = parsed;
    }
  }

  const now = Date.now();

  return {
    calendarId,
    familyId,
    title: icalEvent.summary,
    description: icalEvent.description ?? undefined,
    location: icalEvent.location ?? undefined,
    url: undefined,
    start: icalEvent.dtstart.getTime(),
    end: icalEvent.dtend.getTime(),
    allDay: icalEvent.allDay,
    timezone: undefined,
    recurrence,
    recurrenceId: undefined,
    originalStart: undefined,
    status:
      (icalEvent.status?.toLowerCase() as 'confirmed' | 'tentative' | 'cancelled') ?? 'confirmed',
    busyStatus: 'busy',
    category: (icalEvent.categories?.[0]?.toLowerCase() as CalendarEvent['category']) ?? undefined,
    color: undefined,
    organizer: undefined,
    attendees: [],
    reminders: [],
    createdBy: 'import',
    lastModifiedBy: undefined,
    externalId: undefined,
    externalEtag: undefined,
    createdAt: now,
    updatedAt: now,
  };
}
