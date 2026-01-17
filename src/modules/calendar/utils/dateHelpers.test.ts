import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getViewDateRange,
  getMonthViewDays,
  getMonthViewWeeks,
  getDayTimeSlots,
  formatEventTime,
  formatEventDuration,
  getViewTitle,
  navigateDate,
  isMultiDayEvent,
  getEventPosition,
  eventsOverlap,
  groupOverlappingEvents,
  formatRelativeTime,
} from './dateHelpers';

import type { ExpandedEvent } from '../types/Calendar.types';

// Helper to create mock ExpandedEvent
function createMockEvent(overrides: Partial<ExpandedEvent> = {}): ExpandedEvent {
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
    isRecurrenceInstance: false,
    ...overrides,
  };
}

describe('dateHelpers', () => {
  describe('getViewDateRange', () => {
    const testDate = new Date('2024-01-15');

    it('should return correct range for day view', () => {
      const { start, end } = getViewDateRange(testDate, 'day');
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(15);
      expect(start.getHours()).toBe(0);
      expect(end.getDate()).toBe(15);
      expect(end.getHours()).toBe(23);
    });

    it('should return correct range for week view (Sunday start)', () => {
      const { start, end } = getViewDateRange(testDate, 'week', 0);
      expect(start.getDay()).toBe(0); // Sunday
      expect(end.getDay()).toBe(6); // Saturday
    });

    it('should return correct range for week view (Monday start)', () => {
      const { start, end } = getViewDateRange(testDate, 'week', 1);
      expect(start.getDay()).toBe(1); // Monday
      expect(end.getDay()).toBe(0); // Sunday
    });

    it('should return correct range for month view', () => {
      const { start, end } = getViewDateRange(testDate, 'month');
      // Should return start of week containing month start and end of week containing month end
      // Start should be Sunday or Monday of first week
      expect(start.getDay()).toBeLessThanOrEqual(1); // 0=Sunday or 1=Monday
      // End should be Saturday or Sunday of last week
      expect(end.getDay()).toBeGreaterThanOrEqual(0);
    });

    it('should return correct range for year view', () => {
      const { start, end } = getViewDateRange(testDate, 'year');
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(11);
      expect(end.getDate()).toBe(31);
    });

    it('should return correct range for agenda view', () => {
      const { start, end } = getViewDateRange(testDate, 'agenda');
      expect(start.getDate()).toBe(15);
      // End should be ~4 weeks later (28-29 days due to endOfDay)
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThanOrEqual(29);
    });

    it('should handle timestamp input', () => {
      const timestamp = testDate.getTime();
      const { start, end } = getViewDateRange(timestamp, 'day');
      expect(start.getDate()).toBe(15);
      expect(end.getDate()).toBe(15);
    });

    it('should return month range for unknown view', () => {
      const { start, end } = getViewDateRange(testDate, 'unknown' as never);
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(0);
    });
  });

  describe('getMonthViewDays', () => {
    it('should return array of dates for month view', () => {
      const days = getMonthViewDays(new Date('2024-01-15'));
      expect(days.length).toBeGreaterThanOrEqual(28);
      expect(days.length).toBeLessThanOrEqual(42);
      // Should be divisible by 7 (full weeks)
      expect(days.length % 7).toBe(0);
    });

    it('should handle timestamp input', () => {
      const days = getMonthViewDays(new Date('2024-01-15').getTime());
      expect(days.length).toBeGreaterThanOrEqual(28);
    });
  });

  describe('getMonthViewWeeks', () => {
    it('should return array of week arrays', () => {
      const weeks = getMonthViewWeeks(new Date('2024-01-15'));
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks.length).toBeLessThanOrEqual(6);
      weeks.forEach((week) => {
        expect(week.length).toBe(7);
      });
    });
  });

  describe('getDayTimeSlots', () => {
    it('should return correct number of slots with default params', () => {
      const slots = getDayTimeSlots();
      // 24 hours * 2 slots per hour = 48 slots
      expect(slots.length).toBe(48);
    });

    it('should return correct number of slots with custom interval', () => {
      const slots = getDayTimeSlots(60);
      expect(slots.length).toBe(24);
    });

    it('should return correct number of slots with custom hours', () => {
      const slots = getDayTimeSlots(60, 9, 17);
      expect(slots.length).toBe(8);
      expect(slots[0]?.hour).toBe(9);
      expect(slots[slots.length - 1]?.hour).toBe(16);
    });

    it('should have correct label format', () => {
      const slots = getDayTimeSlots(60);
      expect(slots[0]?.label).toMatch(/12:00 AM/i);
      expect(slots[12]?.label).toMatch(/12:00 PM/i);
    });
  });

  describe('formatEventTime', () => {
    it('should return "All day" for all-day events', () => {
      const event = createMockEvent({ allDay: true });
      expect(formatEventTime(event)).toBe('All day');
    });

    it('should format same-day event times', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T11:30:00').getTime(),
      });
      const result = formatEventTime(event);
      expect(result).toContain('10:00');
      expect(result).toContain('11:30');
    });

    it('should format multi-day event times', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-16T11:00:00').getTime(),
      });
      const result = formatEventTime(event);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('16');
    });
  });

  describe('formatEventDuration', () => {
    it('should return "All day" for single-day all-day events', () => {
      const event = createMockEvent({
        allDay: true,
        start: new Date('2024-01-15').getTime(),
        end: new Date('2024-01-15').getTime(),
      });
      expect(formatEventDuration(event)).toBe('All day');
    });

    it('should return days count for multi-day all-day events', () => {
      const event = createMockEvent({
        allDay: true,
        start: new Date('2024-01-15').getTime(),
        end: new Date('2024-01-17').getTime(),
      });
      expect(formatEventDuration(event)).toBe('3 days');
    });

    it('should format minutes for short events', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T10:30:00').getTime(),
      });
      expect(formatEventDuration(event)).toBe('30 min');
    });

    it('should format hours for hour-long events', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T11:00:00').getTime(),
      });
      expect(formatEventDuration(event)).toBe('1 hour');
    });

    it('should format hours plural', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T13:00:00').getTime(),
      });
      expect(formatEventDuration(event)).toBe('3 hours');
    });

    it('should format hours and minutes', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T11:30:00').getTime(),
      });
      expect(formatEventDuration(event)).toBe('1h 30m');
    });
  });

  describe('getViewTitle', () => {
    const testDate = new Date('2024-01-15');

    it('should format day view title', () => {
      const title = getViewTitle(testDate, 'day');
      expect(title).toContain('Monday');
      expect(title).toContain('January');
      expect(title).toContain('15');
      expect(title).toContain('2024');
    });

    it('should format week view title for same-month week', () => {
      const title = getViewTitle(testDate, 'week');
      expect(title).toContain('January');
      expect(title).toContain('2024');
    });

    it('should format month view title', () => {
      const title = getViewTitle(testDate, 'month');
      expect(title).toBe('January 2024');
    });

    it('should format year view title', () => {
      const title = getViewTitle(testDate, 'year');
      expect(title).toBe('2024');
    });

    it('should format agenda view title', () => {
      const title = getViewTitle(testDate, 'agenda');
      expect(title).toContain('January');
      expect(title).toContain('2024');
    });

    it('should handle timestamp input', () => {
      const title = getViewTitle(testDate.getTime(), 'month');
      expect(title).toBe('January 2024');
    });
  });

  describe('navigateDate', () => {
    const testDate = new Date('2024-01-15');

    it('should navigate day forward', () => {
      const result = navigateDate(testDate, 'day', 'next');
      expect(result.getDate()).toBe(16);
    });

    it('should navigate day backward', () => {
      const result = navigateDate(testDate, 'day', 'prev');
      expect(result.getDate()).toBe(14);
    });

    it('should navigate week forward', () => {
      const result = navigateDate(testDate, 'week', 'next');
      expect(result.getDate()).toBe(22);
    });

    it('should navigate week backward', () => {
      const result = navigateDate(testDate, 'week', 'prev');
      expect(result.getDate()).toBe(8);
    });

    it('should navigate month forward', () => {
      const result = navigateDate(testDate, 'month', 'next');
      expect(result.getMonth()).toBe(1); // February
    });

    it('should navigate month backward', () => {
      const result = navigateDate(testDate, 'month', 'prev');
      expect(result.getMonth()).toBe(11); // December previous year
    });

    it('should navigate year forward', () => {
      const result = navigateDate(testDate, 'year', 'next');
      expect(result.getFullYear()).toBe(2025);
    });

    it('should navigate year backward', () => {
      const result = navigateDate(testDate, 'year', 'prev');
      expect(result.getFullYear()).toBe(2023);
    });

    it('should handle timestamp input', () => {
      const result = navigateDate(testDate.getTime(), 'day', 'next');
      expect(result.getDate()).toBe(16);
    });
  });

  describe('isMultiDayEvent', () => {
    it('should return false for same-day events', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T11:00:00').getTime(),
      });
      expect(isMultiDayEvent(event)).toBe(false);
    });

    it('should return true for multi-day events', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-16T11:00:00').getTime(),
      });
      expect(isMultiDayEvent(event)).toBe(true);
    });
  });

  describe('getEventPosition', () => {
    it('should calculate correct position for morning event', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T09:00:00').getTime(),
        end: new Date('2024-01-15T10:00:00').getTime(),
      });
      const dayStart = new Date('2024-01-15');
      const { top, height } = getEventPosition(event, dayStart, 60);

      expect(top).toBe(9 * 60); // 9 hours * 60 pixels
      expect(height).toBe(60); // 1 hour * 60 pixels
    });

    it('should enforce minimum height', () => {
      const event = createMockEvent({
        start: new Date('2024-01-15T09:00:00').getTime(),
        end: new Date('2024-01-15T09:10:00').getTime(), // 10 min event
      });
      const dayStart = new Date('2024-01-15');
      const { height } = getEventPosition(event, dayStart, 60);

      expect(height).toBe(20); // Minimum height
    });
  });

  describe('eventsOverlap', () => {
    it('should detect overlapping events', () => {
      const event1 = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T11:00:00').getTime(),
      });
      const event2 = createMockEvent({
        start: new Date('2024-01-15T10:30:00').getTime(),
        end: new Date('2024-01-15T11:30:00').getTime(),
      });
      expect(eventsOverlap(event1, event2)).toBe(true);
    });

    it('should detect non-overlapping events', () => {
      const event1 = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T11:00:00').getTime(),
      });
      const event2 = createMockEvent({
        start: new Date('2024-01-15T12:00:00').getTime(),
        end: new Date('2024-01-15T13:00:00').getTime(),
      });
      expect(eventsOverlap(event1, event2)).toBe(false);
    });

    it('should not overlap for adjacent events', () => {
      const event1 = createMockEvent({
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T11:00:00').getTime(),
      });
      const event2 = createMockEvent({
        start: new Date('2024-01-15T11:00:00').getTime(),
        end: new Date('2024-01-15T12:00:00').getTime(),
      });
      expect(eventsOverlap(event1, event2)).toBe(false);
    });
  });

  describe('groupOverlappingEvents', () => {
    it('should return empty array for empty input', () => {
      expect(groupOverlappingEvents([])).toEqual([]);
    });

    it('should group overlapping events together', () => {
      const event1 = createMockEvent({
        id: '1',
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T11:00:00').getTime(),
      });
      const event2 = createMockEvent({
        id: '2',
        start: new Date('2024-01-15T10:30:00').getTime(),
        end: new Date('2024-01-15T11:30:00').getTime(),
      });
      const event3 = createMockEvent({
        id: '3',
        start: new Date('2024-01-15T14:00:00').getTime(),
        end: new Date('2024-01-15T15:00:00').getTime(),
      });

      const groups = groupOverlappingEvents([event1, event2, event3]);
      expect(groups.length).toBe(2);
      expect(groups[0]?.length).toBe(2);
      expect(groups[1]?.length).toBe(1);
    });

    it('should keep non-overlapping events in separate groups', () => {
      const event1 = createMockEvent({
        id: '1',
        start: new Date('2024-01-15T10:00:00').getTime(),
        end: new Date('2024-01-15T11:00:00').getTime(),
      });
      const event2 = createMockEvent({
        id: '2',
        start: new Date('2024-01-15T12:00:00').getTime(),
        end: new Date('2024-01-15T13:00:00').getTime(),
      });

      const groups = groupOverlappingEvents([event1, event2]);
      expect(groups.length).toBe(2);
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "now" for current time', () => {
      expect(formatRelativeTime(new Date('2024-01-15T12:00:00'))).toBe('now');
    });

    it('should format minutes in future', () => {
      expect(formatRelativeTime(new Date('2024-01-15T12:30:00'))).toBe('in 30 min');
    });

    it('should format minutes in past', () => {
      expect(formatRelativeTime(new Date('2024-01-15T11:30:00'))).toBe('30 min ago');
    });

    it('should format hours in future', () => {
      expect(formatRelativeTime(new Date('2024-01-15T14:00:00'))).toBe('in 2 hours');
    });

    it('should format single hour in future', () => {
      expect(formatRelativeTime(new Date('2024-01-15T13:00:00'))).toBe('in 1 hour');
    });

    it('should format hours in past', () => {
      expect(formatRelativeTime(new Date('2024-01-15T10:00:00'))).toBe('2 hours ago');
    });

    it('should return "tomorrow" for next day', () => {
      expect(formatRelativeTime(new Date('2024-01-16T12:00:00'))).toBe('tomorrow');
    });

    it('should return "yesterday" for previous day', () => {
      expect(formatRelativeTime(new Date('2024-01-14T12:00:00'))).toBe('yesterday');
    });

    it('should format days in future within a week', () => {
      expect(formatRelativeTime(new Date('2024-01-18T12:00:00'))).toBe('in 3 days');
    });

    it('should format days in past within a week', () => {
      expect(formatRelativeTime(new Date('2024-01-12T12:00:00'))).toBe('3 days ago');
    });

    it('should format date for times beyond a week', () => {
      const result = formatRelativeTime(new Date('2024-01-30T12:00:00'));
      expect(result).toContain('Jan');
      expect(result).toContain('30');
    });

    it('should handle timestamp input', () => {
      expect(formatRelativeTime(new Date('2024-01-15T12:30:00').getTime())).toBe('in 30 min');
    });
  });
});
