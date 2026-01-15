/**
 * Recurrence Utilities
 * Expands recurring events based on RFC 5545 RRULE
 */

import type {
  RecurrenceRule,
  RecurrenceFrequency,
  RecurrenceByDay,
  WeekDay,
  CalendarEvent,
  ExpandedEvent,
} from '../types/Calendar.types';

// Week day to JS day mapping (0 = Sunday)
const WEEKDAY_TO_JS: Record<WeekDay, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

// JS day to week day mapping
const JS_TO_WEEKDAY: WeekDay[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Parse RRULE string to RecurrenceRule object
 */
export function parseRRule(rruleString: string): RecurrenceRule | null {
  try {
    const parts = rruleString.replace('RRULE:', '').split(';');
    let frequency: RecurrenceFrequency | undefined;
    let interval = 1;

    const rule: Partial<RecurrenceRule> = {
      interval: 1,
    };

    for (const part of parts) {
      if (!part) {
        continue;
      }
      const splitIdx = part.indexOf('=');
      if (splitIdx === -1) {
        continue;
      }

      const key = part.slice(0, splitIdx);
      const value = part.slice(splitIdx + 1);

      switch (key) {
        case 'FREQ':
          frequency = value.toLowerCase() as RecurrenceFrequency;
          rule.frequency = frequency;
          break;
        case 'INTERVAL':
          interval = parseInt(value, 10);
          rule.interval = interval;
          break;
        case 'COUNT':
          rule.count = parseInt(value, 10);
          break;
        case 'UNTIL':
          rule.until = parseICalDate(value);
          break;
        case 'BYDAY':
          rule.byDay = value.split(',').map(parseByDay);
          break;
        case 'BYMONTHDAY':
          rule.byMonthDay = value.split(',').map((v) => parseInt(v, 10));
          break;
        case 'BYMONTH':
          rule.byMonth = value.split(',').map((v) => parseInt(v, 10));
          break;
        case 'BYSETPOS':
          rule.bySetPos = value.split(',').map((v) => parseInt(v, 10));
          break;
        case 'WKST':
          rule.weekStart = value as WeekDay;
          break;
      }
    }

    if (!frequency) {
      return null;
    }

    const recurrenceRule: RecurrenceRule = {
      frequency,
      interval,
    };

    if (rule.count !== undefined) {
      recurrenceRule.count = rule.count;
    }
    if (rule.until !== undefined) {
      recurrenceRule.until = rule.until;
    }
    if (rule.byDay !== undefined) {
      recurrenceRule.byDay = rule.byDay;
    }
    if (rule.byMonthDay !== undefined) {
      recurrenceRule.byMonthDay = rule.byMonthDay;
    }
    if (rule.byMonth !== undefined) {
      recurrenceRule.byMonth = rule.byMonth;
    }
    if (rule.bySetPos !== undefined) {
      recurrenceRule.bySetPos = rule.bySetPos;
    }
    if (rule.byWeekNo !== undefined) {
      recurrenceRule.byWeekNo = rule.byWeekNo;
    }
    if (rule.byYearDay !== undefined) {
      recurrenceRule.byYearDay = rule.byYearDay;
    }
    if (rule.weekStart !== undefined) {
      recurrenceRule.weekStart = rule.weekStart;
    }
    if (rule.exdates !== undefined) {
      recurrenceRule.exdates = rule.exdates;
    }
    if (rule.rdates !== undefined) {
      recurrenceRule.rdates = rule.rdates;
    }

    return recurrenceRule;
  } catch {
    return null;
  }
}

/**
 * Convert RecurrenceRule to RRULE string
 */
export function toRRuleString(rule: RecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.frequency.toUpperCase()}`];

  if (rule.interval !== 1) {
    parts.push(`INTERVAL=${rule.interval}`);
  }
  if (rule.count) {
    parts.push(`COUNT=${rule.count}`);
  }
  if (rule.until) {
    parts.push(`UNTIL=${toICalDate(rule.until)}`);
  }
  if (rule.byDay && rule.byDay.length > 0) {
    parts.push(`BYDAY=${rule.byDay.map(byDayToString).join(',')}`);
  }
  if (rule.byMonthDay && rule.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
  }
  if (rule.byMonth && rule.byMonth.length > 0) {
    parts.push(`BYMONTH=${rule.byMonth.join(',')}`);
  }
  if (rule.bySetPos && rule.bySetPos.length > 0) {
    parts.push(`BYSETPOS=${rule.bySetPos.join(',')}`);
  }
  if (rule.weekStart) {
    parts.push(`WKST=${rule.weekStart}`);
  }

  return `RRULE:${parts.join(';')}`;
}

function parseByDay(str: string): RecurrenceByDay {
  const match = str.match(/^(-?\d+)?([A-Z]{2})$/);
  if (!match) {
    return { day: str as WeekDay, position: undefined };
  }
  const posMatch = match[1];
  const dayMatch = match[2];
  if (!dayMatch) {
    return { day: str as WeekDay, position: undefined };
  }
  return posMatch
    ? { day: dayMatch as WeekDay, position: parseInt(posMatch, 10) }
    : { day: dayMatch as WeekDay, position: undefined };
}

function byDayToString(bd: RecurrenceByDay): string {
  return bd.position ? `${bd.position}${bd.day}` : bd.day;
}

function parseICalDate(str: string): number {
  // Format: 20231231T235959Z or 20231231
  const year = parseInt(str.slice(0, 4), 10);
  const month = parseInt(str.slice(4, 6), 10) - 1;
  const day = parseInt(str.slice(6, 8), 10);

  if (str.length > 8) {
    const hour = parseInt(str.slice(9, 11), 10);
    const minute = parseInt(str.slice(11, 13), 10);
    const second = parseInt(str.slice(13, 15), 10);
    return new Date(Date.UTC(year, month, day, hour, minute, second)).getTime();
  }

  return new Date(year, month, day).getTime();
}

function toICalDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

/**
 * Expand recurring event into instances within a date range
 */
export function expandRecurringEvent(
  event: CalendarEvent,
  rangeStart: number,
  rangeEnd: number,
  maxInstances: number = 366 // Limit for safety
): ExpandedEvent[] {
  if (!event.recurrence) {
    // Non-recurring event - just check if it's in range
    if (event.start < rangeEnd && event.end > rangeStart) {
      return [
        {
          ...event,
          isRecurrenceInstance: false,
        },
      ];
    }
    return [];
  }

  const instances: ExpandedEvent[] = [];
  const rule = event.recurrence;
  const duration = event.end - event.start;
  const exdates = new Set((rule.exdates ?? []).map((d) => startOfDay(d)));

  let currentDate = new Date(event.start);
  let count = 0;

  // Helper to check if date matches rule filters
  const matchesFilters = (date: Date): boolean => {
    // Check byMonth
    if (rule.byMonth && rule.byMonth.length > 0) {
      if (!rule.byMonth.includes(date.getMonth() + 1)) {
        return false;
      }
    }

    // Check byMonthDay
    if (rule.byMonthDay && rule.byMonthDay.length > 0) {
      const dayOfMonth = date.getDate();
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const matches = rule.byMonthDay.some((d) => {
        if (d > 0) {
          return d === dayOfMonth;
        }
        return d + daysInMonth + 1 === dayOfMonth;
      });
      if (!matches) {
        return false;
      }
    }

    // Check byDay (without position)
    if (rule.byDay && rule.byDay.length > 0 && !rule.byDay.some((bd) => bd.position)) {
      const weekday = JS_TO_WEEKDAY[date.getDay()];
      if (!rule.byDay.some((bd) => bd.day === weekday)) {
        return false;
      }
    }

    return true;
  };

  // Iterate through occurrences
  while (count < maxInstances) {
    const instanceStart = currentDate.getTime();

    // Check end conditions
    if (rule.until && instanceStart > rule.until) {
      break;
    }
    if (instanceStart > rangeEnd) {
      break;
    }
    if (rule.count && count >= rule.count) {
      break;
    }

    // Check if instance is in range and not excluded
    if (instanceStart >= rangeStart - duration) {
      const dayStart = startOfDay(instanceStart);

      if (!exdates.has(dayStart) && matchesFilters(currentDate)) {
        instances.push({
          ...event,
          isRecurrenceInstance: true,
          instanceDate: instanceStart,
          masterEventId: event.id,
          start: instanceStart,
          end: instanceStart + duration,
          // Generate unique ID for instance
          id: `${event.id}_${instanceStart}`,
        });
        count++;
      }
    } else {
      count++; // Count even if before range
    }

    // Advance to next occurrence
    currentDate = getNextOccurrence(currentDate, rule);
  }

  return instances;
}

function getNextOccurrence(current: Date, rule: RecurrenceRule): Date {
  const next = new Date(current);
  const interval = rule.interval;

  switch (rule.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;

    case 'weekly':
      if (rule.byDay && rule.byDay.length > 0) {
        // Find next matching day
        const days = rule.byDay.map((bd) => WEEKDAY_TO_JS[bd.day]).sort((a, b) => a - b);
        const currentDay = next.getDay();
        const nextDayIndex = days.findIndex((d) => d > currentDay);

        if (nextDayIndex !== -1) {
          // Found a day later this week
          const nextDay = days[nextDayIndex];
          if (nextDay !== undefined) {
            next.setDate(next.getDate() + (nextDay - currentDay));
          }
        } else if (days[0] !== undefined) {
          // Move to first day of next week(s)
          const daysUntilNextWeek = 7 - currentDay + days[0];
          next.setDate(next.getDate() + daysUntilNextWeek + (interval - 1) * 7);
        } else {
          next.setDate(next.getDate() + 7 * interval);
        }
      } else {
        next.setDate(next.getDate() + 7 * interval);
      }
      break;

    case 'monthly':
      if (rule.byDay?.some((bd) => bd.position)) {
        // Handle "first Monday", "last Friday", etc.
        next.setMonth(next.getMonth() + interval);
        const bd = rule.byDay.find((bd) => bd.position);
        if (bd?.position) {
          setToNthWeekday(next, bd.day, bd.position);
        }
      } else if (
        rule.byMonthDay &&
        rule.byMonthDay.length > 0 &&
        rule.byMonthDay[0] !== undefined
      ) {
        next.setMonth(next.getMonth() + interval);
        next.setDate(rule.byMonthDay[0]);
      } else {
        next.setMonth(next.getMonth() + interval);
      }
      break;

    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next;
}

function setToNthWeekday(date: Date, weekday: WeekDay, n: number): void {
  const targetDay = WEEKDAY_TO_JS[weekday];
  if (targetDay === undefined) {
    return;
  }

  if (n > 0) {
    // First, second, third, etc.
    date.setDate(1);
    const firstDay = date.getDay();
    let diff = targetDay - firstDay;
    if (diff < 0) {
      diff += 7;
    }
    date.setDate(1 + diff + (n - 1) * 7);
  } else {
    // Last, second-to-last, etc.
    const month = date.getMonth();
    date.setMonth(month + 1, 0); // Last day of month
    const lastDay = date.getDay();
    let diff = lastDay - targetDay;
    if (diff < 0) {
      diff += 7;
    }
    date.setDate(date.getDate() - diff - (Math.abs(n) - 1) * 7);
  }
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Get human-readable description of recurrence rule
 */
export function describeRecurrence(rule: RecurrenceRule): string {
  const parts: string[] = [];

  // Frequency
  if (rule.interval === 1) {
    parts.push(rule.frequency.charAt(0).toUpperCase() + rule.frequency.slice(1));
  } else {
    const unit = rule.frequency === 'daily' ? 'day' : rule.frequency.replace('ly', '');
    parts.push(`Every ${rule.interval} ${unit}s`);
  }

  // Days
  if (rule.byDay && rule.byDay.length > 0) {
    if (
      rule.byDay.length === 5 &&
      rule.byDay.every((bd) => ['MO', 'TU', 'WE', 'TH', 'FR'].includes(bd.day))
    ) {
      parts.push('on weekdays');
    } else if (rule.byDay.length === 2 && rule.byDay.every((bd) => ['SA', 'SU'].includes(bd.day))) {
      parts.push('on weekends');
    } else {
      const dayNames = rule.byDay.map((bd) => {
        const name = bd.day.charAt(0) + bd.day.charAt(1).toLowerCase();
        if (bd.position) {
          const pos = bd.position > 0 ? `${bd.position}${getOrdinalSuffix(bd.position)}` : 'last';
          return `${pos} ${name}`;
        }
        return name;
      });
      parts.push(`on ${dayNames.join(', ')}`);
    }
  }

  // End condition
  if (rule.count) {
    parts.push(`for ${rule.count} occurrences`);
  } else if (rule.until) {
    const date = new Date(rule.until);
    parts.push(`until ${date.toLocaleDateString()}`);
  }

  return parts.join(' ');
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  const index = (v - 20) % 10;
  return s[index] ?? s[v] ?? s[0] ?? 'th';
}
