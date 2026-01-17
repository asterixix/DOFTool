/**
 * Date Helper Utilities for Calendar Module
 */

import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  isSameDay,
  isSameMonth,
  isSameYear,
  isToday,
  isWithinInterval,
  eachDayOfInterval,
  differenceInMinutes,
  differenceInDays,
  differenceInHours,
} from 'date-fns';

import type { CalendarView, ExpandedEvent } from '../types/Calendar.types';

// Re-export date-fns functions we use frequently
export {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  isSameYear,
  isToday,
  isWithinInterval,
  eachDayOfInterval,
  differenceInMinutes,
  differenceInHours,
};

/**
 * Get the date range for a calendar view
 * @param weekStartsOn - 0 for Sunday, 1 for Monday (defaults to 0)
 */
export function getViewDateRange(
  date: Date | number,
  view: CalendarView,
  weekStartsOn: 0 | 1 = 0
): { start: Date; end: Date } {
  const d = typeof date === 'number' ? new Date(date) : date;

  switch (view) {
    case 'day':
      return {
        start: startOfDay(d),
        end: endOfDay(d),
      };

    case 'week':
      return {
        start: startOfWeek(d, { weekStartsOn }),
        end: endOfWeek(d, { weekStartsOn }),
      };

    case 'month': {
      // Include days from prev/next month that appear in the grid
      const monthStart = startOfMonth(d);
      const monthEnd = endOfMonth(d);
      return {
        start: startOfWeek(monthStart, { weekStartsOn }),
        end: endOfWeek(monthEnd, { weekStartsOn }),
      };
    }

    case 'year':
      return {
        start: startOfYear(d),
        end: endOfYear(d),
      };

    case 'agenda':
      // Default to 4 weeks for agenda view
      return {
        start: startOfDay(d),
        end: endOfDay(addWeeks(d, 4)),
      };

    default:
      return {
        start: startOfMonth(d),
        end: endOfMonth(d),
      };
  }
}

/**
 * Get all days to display in month view (including padding)
 */
export function getMonthViewDays(
  date: Date | number,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0
): Date[] {
  const d = typeof date === 'number' ? new Date(date) : date;
  const { start, end } = getViewDateRange(
    d,
    'month',
    weekStartsOn === 0 || weekStartsOn === 1 ? weekStartsOn : 0
  );
  return eachDayOfInterval({ start, end });
}

/**
 * Get weeks for month view (array of week arrays)
 */
export function getMonthViewWeeks(
  date: Date | number,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0
): Date[][] {
  const days = getMonthViewDays(date, weekStartsOn);
  const weeks: Date[][] = [];

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
}

/**
 * Get time slots for day/week view
 */
export function getDayTimeSlots(
  intervalMinutes: number = 30,
  startHour: number = 0,
  endHour: number = 24
): { hour: number; minute: number; label: string }[] {
  const slots: { hour: number; minute: number; label: string }[] = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      slots.push({
        hour,
        minute,
        label: format(date, 'h:mm a'),
      });
    }
  }

  return slots;
}

/**
 * Format event time display
 */
export function formatEventTime(event: ExpandedEvent): string {
  if (event.allDay) {
    return 'All day';
  }

  const start = new Date(event.start);
  const end = new Date(event.end);

  if (isSameDay(start, end)) {
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  }

  return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'MMM d, h:mm a')}`;
}

/**
 * Format event duration
 */
export function formatEventDuration(event: ExpandedEvent): string {
  if (event.allDay) {
    const days = differenceInDays(new Date(event.end), new Date(event.start)) + 1;
    return days === 1 ? 'All day' : `${days} days`;
  }

  const minutes = differenceInMinutes(new Date(event.end), new Date(event.start));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Get view title (e.g., "January 2024", "Week 4, 2024")
 */
export function getViewTitle(date: Date | number, view: CalendarView): string {
  const d = typeof date === 'number' ? new Date(date) : date;

  switch (view) {
    case 'day':
      return format(d, 'EEEE, MMMM d, yyyy');
    case 'week': {
      const weekStart = startOfWeek(d);
      const weekEnd = endOfWeek(d);
      if (isSameMonth(weekStart, weekEnd)) {
        return format(weekStart, 'MMMM yyyy');
      }
      if (isSameYear(weekStart, weekEnd)) {
        return `${format(weekStart, 'MMM')} - ${format(weekEnd, 'MMM yyyy')}`;
      }
      return `${format(weekStart, 'MMM yyyy')} - ${format(weekEnd, 'MMM yyyy')}`;
    }
    case 'month':
      return format(d, 'MMMM yyyy');
    case 'year':
      return format(d, 'yyyy');
    case 'agenda':
      return format(d, 'MMMM yyyy');
    default:
      return format(d, 'MMMM yyyy');
  }
}

/**
 * Navigate to next/prev period based on view
 */
export function navigateDate(
  date: Date | number,
  view: CalendarView,
  direction: 'next' | 'prev'
): Date {
  const d = typeof date === 'number' ? new Date(date) : date;
  const fn =
    direction === 'next'
      ? { day: addDays, week: addWeeks, month: addMonths, year: addYears, agenda: addWeeks }
      : { day: subDays, week: subWeeks, month: subMonths, year: subYears, agenda: subWeeks };

  return fn[view](d, 1);
}

/**
 * Check if an event spans multiple days
 */
export function isMultiDayEvent(event: ExpandedEvent): boolean {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return !isSameDay(start, end);
}

/**
 * Get position and height for timed event in day view
 */
export function getEventPosition(
  event: ExpandedEvent,
  dayStart: Date,
  pixelsPerHour: number = 60
): { top: number; height: number } {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);

  const startMinutes = differenceInMinutes(eventStart, startOfDay(dayStart));
  const durationMinutes = differenceInMinutes(eventEnd, eventStart);

  const top = (startMinutes / 60) * pixelsPerHour;
  const height = Math.max((durationMinutes / 60) * pixelsPerHour, 20); // Min 20px

  return { top, height };
}

/**
 * Check if two events overlap
 */
export function eventsOverlap(event1: ExpandedEvent, event2: ExpandedEvent): boolean {
  return event1.start < event2.end && event1.end > event2.start;
}

/**
 * Group overlapping events for layout
 */
export function groupOverlappingEvents(events: ExpandedEvent[]): ExpandedEvent[][] {
  if (events.length === 0) {
    return [];
  }

  // Sort by start time
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const groups: ExpandedEvent[][] = [];
  let currentGroup: ExpandedEvent[] = [];
  let groupEnd = 0;

  for (const event of sorted) {
    if (currentGroup.length === 0 || event.start < groupEnd) {
      currentGroup.push(event);
      groupEnd = Math.max(groupEnd, event.end);
    } else {
      groups.push(currentGroup);
      currentGroup = [event];
      groupEnd = event.end;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Format relative time (e.g., "in 2 hours", "yesterday")
 */
export function formatRelativeTime(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffMinutes = differenceInMinutes(d, now);
  const diffHours = differenceInHours(d, now);
  const diffDays = differenceInDays(d, now);

  if (Math.abs(diffMinutes) < 60) {
    if (diffMinutes === 0) {
      return 'now';
    }
    if (diffMinutes > 0) {
      return `in ${diffMinutes} min`;
    }
    return `${Math.abs(diffMinutes)} min ago`;
  }

  if (Math.abs(diffHours) < 24) {
    if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    }
    return `${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? 's' : ''} ago`;
  }

  if (diffDays === 0) {
    return 'today';
  }
  if (diffDays === 1) {
    return 'tomorrow';
  }
  if (diffDays === -1) {
    return 'yesterday';
  }

  if (diffDays > 0 && diffDays < 7) {
    return `in ${diffDays} days`;
  }
  if (diffDays < 0 && diffDays > -7) {
    return `${Math.abs(diffDays)} days ago`;
  }

  return format(d, 'MMM d');
}
