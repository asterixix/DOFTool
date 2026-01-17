/**
 * Date Formatting Utilities
 *
 * Provides date and time formatting functions that respect regional settings
 * from the settings store.
 */

import { format as dateFnsFormat } from 'date-fns';

import type { DateFormat, TimeFormat, WeekStartDay } from '@/stores/settings.store';

/**
 * Get date format string for date-fns format function
 */
export function getDateFormatString(dateFormat: DateFormat): string {
  switch (dateFormat) {
    case 'MM/DD/YYYY':
      return 'MM/dd/yyyy';
    case 'DD/MM/YYYY':
      return 'dd/MM/yyyy';
    case 'YYYY-MM-DD':
      return 'yyyy-MM-dd';
    default:
      return 'MM/dd/yyyy';
  }
}

/**
 * Format date according to regional settings
 */
export function formatDateWithSettings(date: Date | number, dateFormat: DateFormat): string {
  const formatString = getDateFormatString(dateFormat);
  return dateFnsFormat(date, formatString);
}

/**
 * Format time according to regional settings
 */
export function formatTimeWithSettings(date: Date | number, timeFormat: TimeFormat): string {
  if (timeFormat === '24h') {
    return dateFnsFormat(date, 'HH:mm');
  }
  return dateFnsFormat(date, 'h:mm a');
}

/**
 * Format date and time according to regional settings
 */
export function formatDateTimeWithSettings(
  date: Date | number,
  dateFormat: DateFormat,
  timeFormat: TimeFormat
): string {
  const dateStr = formatDateWithSettings(date, dateFormat);
  const timeStr = formatTimeWithSettings(date, timeFormat);
  return `${dateStr} ${timeStr}`;
}

/**
 * Convert WeekStartDay to date-fns format (0 = Sunday, 1 = Monday)
 */
export function weekStartDayToNumber(weekStartDay: WeekStartDay): 0 | 1 {
  return weekStartDay === 'sunday' ? 0 : 1;
}
