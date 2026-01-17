import { describe, it, expect } from 'vitest';
import {
  parseRRule,
  toRRuleString,
  expandRecurringEvent,
  describeRecurrence,
} from './recurrence';

import type { CalendarEvent, RecurrenceRule } from '../types/Calendar.types';

function createMockEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    calendarId: 'cal-1',
    familyId: 'family-1',
    title: 'Test Event',
    description: undefined,
    location: undefined,
    url: undefined,
    start: new Date('2024-01-15T10:00:00').getTime(),
    end: new Date('2024-01-15T11:00:00').getTime(),
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

describe('recurrence', () => {
  describe('parseRRule', () => {
    it('should parse daily frequency', () => {
      const result = parseRRule('FREQ=DAILY');
      expect(result).not.toBeNull();
      expect(result?.frequency).toBe('daily');
      expect(result?.interval).toBe(1);
    });

    it('should parse weekly frequency', () => {
      const result = parseRRule('FREQ=WEEKLY');
      expect(result).not.toBeNull();
      expect(result?.frequency).toBe('weekly');
    });

    it('should parse monthly frequency', () => {
      const result = parseRRule('FREQ=MONTHLY');
      expect(result).not.toBeNull();
      expect(result?.frequency).toBe('monthly');
    });

    it('should parse yearly frequency', () => {
      const result = parseRRule('FREQ=YEARLY');
      expect(result).not.toBeNull();
      expect(result?.frequency).toBe('yearly');
    });

    it('should parse interval', () => {
      const result = parseRRule('FREQ=WEEKLY;INTERVAL=2');
      expect(result?.interval).toBe(2);
    });

    it('should parse count', () => {
      const result = parseRRule('FREQ=DAILY;COUNT=10');
      expect(result?.count).toBe(10);
    });

    it('should parse UNTIL date', () => {
      const result = parseRRule('FREQ=DAILY;UNTIL=20241231T235959Z');
      expect(result?.until).toBeDefined();
      const untilDate = new Date(result?.until ?? 0);
      expect(untilDate.getUTCFullYear()).toBe(2024);
      expect(untilDate.getUTCMonth()).toBe(11); // December
      expect(untilDate.getUTCDate()).toBe(31);
    });

    it('should parse BYDAY', () => {
      const result = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR');
      expect(result?.byDay).toHaveLength(3);
      expect(result?.byDay?.[0]?.day).toBe('MO');
      expect(result?.byDay?.[1]?.day).toBe('WE');
      expect(result?.byDay?.[2]?.day).toBe('FR');
    });

    it('should parse BYDAY with position', () => {
      const result = parseRRule('FREQ=MONTHLY;BYDAY=1MO');
      expect(result?.byDay?.[0]?.day).toBe('MO');
      expect(result?.byDay?.[0]?.position).toBe(1);
    });

    it('should parse BYDAY with negative position (last)', () => {
      const result = parseRRule('FREQ=MONTHLY;BYDAY=-1FR');
      expect(result?.byDay?.[0]?.day).toBe('FR');
      expect(result?.byDay?.[0]?.position).toBe(-1);
    });

    it('should parse BYMONTHDAY', () => {
      const result = parseRRule('FREQ=MONTHLY;BYMONTHDAY=15');
      expect(result?.byMonthDay).toEqual([15]);
    });

    it('should parse BYMONTH', () => {
      const result = parseRRule('FREQ=YEARLY;BYMONTH=1,6,12');
      expect(result?.byMonth).toEqual([1, 6, 12]);
    });

    it('should parse WKST', () => {
      const result = parseRRule('FREQ=WEEKLY;WKST=MO');
      expect(result?.weekStart).toBe('MO');
    });

    it('should handle RRULE: prefix', () => {
      const result = parseRRule('RRULE:FREQ=DAILY');
      expect(result?.frequency).toBe('daily');
    });

    it('should return null for invalid rule', () => {
      const result = parseRRule('INVALID=RULE');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseRRule('');
      expect(result).toBeNull();
    });
  });

  describe('toRRuleString', () => {
    it('should generate daily rule', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
      expect(toRRuleString(rule)).toBe('RRULE:FREQ=DAILY');
    });

    it('should include interval when not 1', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 2 };
      expect(toRRuleString(rule)).toBe('RRULE:FREQ=WEEKLY;INTERVAL=2');
    });

    it('should include count', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1, count: 10 };
      expect(toRRuleString(rule)).toContain('COUNT=10');
    });

    it('should include UNTIL', () => {
      const rule: RecurrenceRule = {
        frequency: 'daily',
        interval: 1,
        until: new Date('2024-12-31T23:59:59Z').getTime(),
      };
      const result = toRRuleString(rule);
      expect(result).toContain('UNTIL=');
    });

    it('should include BYDAY', () => {
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        interval: 1,
        byDay: [
          { day: 'MO', position: undefined },
          { day: 'WE', position: undefined },
        ],
      };
      expect(toRRuleString(rule)).toContain('BYDAY=MO,WE');
    });

    it('should include BYDAY with position', () => {
      const rule: RecurrenceRule = {
        frequency: 'monthly',
        interval: 1,
        byDay: [{ day: 'MO', position: 1 }],
      };
      expect(toRRuleString(rule)).toContain('BYDAY=1MO');
    });

    it('should include BYMONTHDAY', () => {
      const rule: RecurrenceRule = {
        frequency: 'monthly',
        interval: 1,
        byMonthDay: [15, 30],
      };
      expect(toRRuleString(rule)).toContain('BYMONTHDAY=15,30');
    });

    it('should include BYMONTH', () => {
      const rule: RecurrenceRule = {
        frequency: 'yearly',
        interval: 1,
        byMonth: [1, 6],
      };
      expect(toRRuleString(rule)).toContain('BYMONTH=1,6');
    });

    it('should include WKST', () => {
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        interval: 1,
        weekStart: 'MO',
      };
      expect(toRRuleString(rule)).toContain('WKST=MO');
    });
  });

  describe('expandRecurringEvent', () => {
    it('should return non-recurring event if in range', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T11:00:00').getTime(),
      });

      const rangeStart = new Date('2024-01-01').getTime();
      const rangeEnd = new Date('2024-01-31').getTime();

      const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
      expect(instances).toHaveLength(1);
      expect(instances[0]?.isRecurrenceInstance).toBe(false);
    });

    it('should return empty array for non-recurring event outside range', () => {
      const event = createMockEvent({
        start: new Date('2024-02-15T10:00:00').getTime(),
        end: new Date('2024-02-15T11:00:00').getTime(),
      });

      const rangeStart = new Date('2024-01-01').getTime();
      const rangeEnd = new Date('2024-01-31').getTime();

      const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
      expect(instances).toHaveLength(0);
    });

    it('should expand daily recurring event', () => {
      const event = createMockEvent({
        start: new Date('2024-01-01T10:00:00').getTime(),
        end: new Date('2024-01-01T11:00:00').getTime(),
        recurrence: { frequency: 'daily', interval: 1 },
      });

      const rangeStart = new Date('2024-01-01').getTime();
      const rangeEnd = new Date('2024-01-07T23:59:59').getTime();

      const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
      expect(instances.length).toBeGreaterThanOrEqual(7);
    });

    it('should expand weekly recurring event', () => {
      const event = createMockEvent({
        start: new Date('2024-01-01T10:00:00').getTime(),
        end: new Date('2024-01-01T11:00:00').getTime(),
        recurrence: { frequency: 'weekly', interval: 1 },
      });

      const rangeStart = new Date('2024-01-01').getTime();
      const rangeEnd = new Date('2024-01-31').getTime();

      const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
      expect(instances.length).toBeGreaterThanOrEqual(4);
    });

    it('should respect count limit', () => {
      const event = createMockEvent({
        start: new Date('2024-01-01T10:00:00').getTime(),
        end: new Date('2024-01-01T11:00:00').getTime(),
        recurrence: { frequency: 'daily', interval: 1, count: 3 },
      });

      const rangeStart = new Date('2024-01-01').getTime();
      const rangeEnd = new Date('2024-01-31').getTime();

      const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
      expect(instances).toHaveLength(3);
    });

    it('should respect until date', () => {
      const event = createMockEvent({
        start: new Date('2024-01-01T10:00:00').getTime(),
        end: new Date('2024-01-01T11:00:00').getTime(),
        recurrence: {
          frequency: 'daily',
          interval: 1,
          until: new Date('2024-01-05').getTime(),
        },
      });

      const rangeStart = new Date('2024-01-01').getTime();
      const rangeEnd = new Date('2024-01-31').getTime();

      const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
      expect(instances.length).toBeLessThanOrEqual(5);
    });

    it('should generate unique IDs for instances', () => {
      const event = createMockEvent({
        start: new Date('2024-01-01T10:00:00').getTime(),
        end: new Date('2024-01-01T11:00:00').getTime(),
        recurrence: { frequency: 'daily', interval: 1, count: 5 },
      });

      const rangeStart = new Date('2024-01-01').getTime();
      const rangeEnd = new Date('2024-01-31').getTime();

      const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
      const ids = instances.map((i) => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should mark instances as recurrence instances', () => {
      const event = createMockEvent({
        start: new Date('2024-01-01T10:00:00').getTime(),
        end: new Date('2024-01-01T11:00:00').getTime(),
        recurrence: { frequency: 'daily', interval: 1, count: 3 },
      });

      const rangeStart = new Date('2024-01-01').getTime();
      const rangeEnd = new Date('2024-01-31').getTime();

      const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
      instances.forEach((instance) => {
        expect(instance.isRecurrenceInstance).toBe(true);
        expect(instance.masterEventId).toBe(event.id);
      });
    });

    it('should preserve event duration', () => {
      const event = createMockEvent({
        start: new Date('2024-01-01T10:00:00').getTime(),
        end: new Date('2024-01-01T12:00:00').getTime(), // 2 hour duration
        recurrence: { frequency: 'daily', interval: 1, count: 3 },
      });

      const rangeStart = new Date('2024-01-01').getTime();
      const rangeEnd = new Date('2024-01-31').getTime();

      const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
      instances.forEach((instance) => {
        const duration = instance.end - instance.start;
        expect(duration).toBe(2 * 60 * 60 * 1000); // 2 hours in ms
      });
    });

    it('should respect maxInstances limit', () => {
      const event = createMockEvent({
        start: new Date('2024-01-01T10:00:00').getTime(),
        end: new Date('2024-01-01T11:00:00').getTime(),
        recurrence: { frequency: 'daily', interval: 1 },
      });

      const rangeStart = new Date('2024-01-01').getTime();
      const rangeEnd = new Date('2025-12-31').getTime();

      const instances = expandRecurringEvent(event, rangeStart, rangeEnd, 10);
      expect(instances.length).toBeLessThanOrEqual(10);
    });
  });

  describe('describeRecurrence', () => {
    it('should describe daily recurrence', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
      expect(describeRecurrence(rule)).toBe('Daily');
    });

    it('should describe weekly recurrence', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 };
      expect(describeRecurrence(rule)).toBe('Weekly');
    });

    it('should describe monthly recurrence', () => {
      const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 };
      expect(describeRecurrence(rule)).toBe('Monthly');
    });

    it('should describe yearly recurrence', () => {
      const rule: RecurrenceRule = { frequency: 'yearly', interval: 1 };
      expect(describeRecurrence(rule)).toBe('Yearly');
    });

    it('should describe interval > 1', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 2 };
      expect(describeRecurrence(rule)).toContain('Every 2');
    });

    it('should describe weekday recurrence', () => {
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        interval: 1,
        byDay: [
          { day: 'MO', position: undefined },
          { day: 'TU', position: undefined },
          { day: 'WE', position: undefined },
          { day: 'TH', position: undefined },
          { day: 'FR', position: undefined },
        ],
      };
      expect(describeRecurrence(rule).toLowerCase()).toContain('weekday');
    });

    it('should describe weekend recurrence', () => {
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        interval: 1,
        byDay: [
          { day: 'SA', position: undefined },
          { day: 'SU', position: undefined },
        ],
      };
      expect(describeRecurrence(rule).toLowerCase()).toContain('weekend');
    });

    it('should describe count', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1, count: 10 };
      expect(describeRecurrence(rule)).toContain('10 occurrences');
    });

    it('should describe until date', () => {
      const rule: RecurrenceRule = {
        frequency: 'daily',
        interval: 1,
        until: new Date('2024-12-31').getTime(),
      };
      expect(describeRecurrence(rule).toLowerCase()).toContain('until');
    });
  });
});
