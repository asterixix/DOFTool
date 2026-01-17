/**
 * Timezone Helper Utilities for Calendar Module
 * Uses Intl API for timezone conversion and formatting
 */

/**
 * Get the system's default timezone
 */
export function getSystemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get a list of common timezones with their display names
 */
export function getCommonTimezones(): Array<{ value: string; label: string; offset: string }> {
  const timezones = [
    // US Timezones
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'America/Anchorage', label: 'Alaska' },
    { value: 'Pacific/Honolulu', label: 'Hawaii' },

    // Europe
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Berlin', label: 'Berlin' },
    { value: 'Europe/Rome', label: 'Rome' },
    { value: 'Europe/Madrid', label: 'Madrid' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam' },
    { value: 'Europe/Stockholm', label: 'Stockholm' },
    { value: 'Europe/Warsaw', label: 'Warsaw' },
    { value: 'Europe/Moscow', label: 'Moscow' },

    // Asia
    { value: 'Asia/Dubai', label: 'Dubai' },
    { value: 'Asia/Kolkata', label: 'New Delhi' },
    { value: 'Asia/Bangkok', label: 'Bangkok' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
    { value: 'Asia/Shanghai', label: 'Beijing' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Seoul', label: 'Seoul' },
    { value: 'Asia/Singapore', label: 'Singapore' },

    // Australia
    { value: 'Australia/Sydney', label: 'Sydney' },
    { value: 'Australia/Melbourne', label: 'Melbourne' },
    { value: 'Australia/Perth', label: 'Perth' },

    // Americas
    { value: 'America/Toronto', label: 'Toronto' },
    { value: 'America/Vancouver', label: 'Vancouver' },
    { value: 'America/Mexico_City', label: 'Mexico City' },
    { value: 'America/Sao_Paulo', label: 'São Paulo' },
    { value: 'America/Buenos_Aires', label: 'Buenos Aires' },

    // Other
    { value: 'Africa/Johannesburg', label: 'Johannesburg' },
    { value: 'Pacific/Auckland', label: 'Auckland' },
    { value: 'UTC', label: 'UTC' },
  ];

  return timezones.map((tz) => ({
    value: tz.value,
    label: tz.label,
    offset: getTimezoneOffset(tz.value, new Date()),
  }));
}

/**
 * Get the offset string for a timezone (e.g., "UTC-5", "UTC+9")
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });

    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find((part) => part.type === 'timeZoneName');

    if (offsetPart) {
      // Extract offset like "GMT-5" or "GMT+9"
      const offset = offsetPart.value.replace('GMT', 'UTC');
      return offset;
    }

    // Fallback: calculate offset manually
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMs = tzDate.getTime() - utcDate.getTime();
    const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
    const offsetMins = Math.floor((Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60));
    const sign = offsetMs >= 0 ? '+' : '-';

    if (offsetMins === 0) {
      return `UTC${sign}${offsetHours}`;
    }
    return `UTC${sign}${offsetHours}:${offsetMins.toString().padStart(2, '0')}`;
  } catch {
    return 'UTC+0';
  }
}

/**
 * Convert a timestamp from one timezone to another
 * Returns the local time in the target timezone
 */
export function convertToTimezone(
  timestamp: number,
  targetTimezone: string,
  sourceTimezone?: string
): Date {
  const date = new Date(timestamp);

  // If source timezone is provided, first interpret the timestamp in that timezone
  if (sourceTimezone) {
    // Create a date string in the source timezone
    const sourceDateStr = date.toLocaleString('en-US', {
      timeZone: sourceTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Parse the date components
    const [datePart, timePart] = sourceDateStr.split(', ');
    const dateParts = datePart?.split('/').map(Number) ?? [];
    const timeParts = timePart?.split(':').map(Number) ?? [];
    const [month = 1, day = 1, year = 1970] = dateParts;
    const [hours = 0, minutes = 0, seconds = 0] = timeParts;

    // Create a date in UTC using these components
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

    // Get the offset difference between source and UTC
    // This is complex, so we'll use a simpler approach
    return convertTimezoneDate(utcDate, sourceTimezone, targetTimezone);
  }

  // Otherwise, interpret timestamp in target timezone
  return convertTimezoneDate(date, getSystemTimezone(), targetTimezone);
}

/**
 * Convert a date from one timezone representation to another
 * This preserves the "wall clock time" meaning
 */
function convertTimezoneDate(date: Date, fromTz: string, toTz: string): Date {
  // Get the date/time string in the source timezone
  const fromStr = date.toLocaleString('en-US', {
    timeZone: fromTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Parse components
  const [datePart, timePart] = fromStr.split(', ');
  const dateParts = datePart?.split('/').map(Number) ?? [];
  const timeParts = timePart?.split(':').map(Number) ?? [];
  const [month = 1, day = 1, year = 1970] = dateParts;
  const [hours = 0, minutes = 0, seconds = 0] = timeParts;

  // Create date string for target timezone
  const dateInTarget = new Date(year, month - 1, day, hours, minutes, seconds);

  // Adjust for timezone offset difference
  const fromOffset = getTimezoneOffsetMs(fromTz, dateInTarget);
  const toOffset = getTimezoneOffsetMs(toTz, dateInTarget);
  const offsetDiff = toOffset - fromOffset;

  return new Date(dateInTarget.getTime() - offsetDiff);
}

/**
 * Get timezone offset in milliseconds for a given date
 */
function getTimezoneOffsetMs(timezone: string, date: Date): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tz = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return tz.getTime() - utc.getTime();
}

/**
 * Format a date in a specific timezone
 */
export function formatInTimezone(
  date: Date | number,
  formatString: string,
  timezone: string
): string {
  const d = typeof date === 'number' ? new Date(date) : date;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: formatString.includes('a') || formatString.includes('A'),
    });

    const parts = formatter.formatToParts(d);

    // Convert format string to use parts
    let result = formatString;

    // Map format tokens to Intl parts
    const tokenMap: Record<string, string> = {
      yyyy: parts.find((p) => p.type === 'year')?.value ?? '',
      MM: parts.find((p) => p.type === 'month')?.value ?? '',
      dd: parts.find((p) => p.type === 'day')?.value ?? '',
      HH: parts.find((p) => p.type === 'hour')?.value ?? '',
      mm: parts.find((p) => p.type === 'minute')?.value ?? '',
      a: parts.find((p) => p.type === 'dayPeriod')?.value ?? '',
    };

    // Simple replacement (for more complex formatting, use date-fns-tz)
    result = result.replace(/yyyy/g, tokenMap['yyyy'] ?? '');
    result = result.replace(/MM/g, tokenMap['MM'] ?? '');
    result = result.replace(/dd/g, tokenMap['dd'] ?? '');
    result = result.replace(/HH/g, tokenMap['HH'] ?? '');
    result = result.replace(/mm/g, tokenMap['mm'] ?? '');
    result = result.replace(/a/g, tokenMap['a'] ?? '');

    return result;
  } catch {
    // Fallback to regular formatting
    return d.toLocaleString();
  }
}

/**
 * Get timezone display name (e.g., "Eastern Time")
 */
export function getTimezoneDisplayName(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long',
    });

    const parts = formatter.formatToParts(new Date());
    const tzName = parts.find((part) => part.type === 'timeZoneName');

    return tzName?.value ?? timezone;
  } catch {
    return timezone;
  }
}

/**
 * Get short timezone name (e.g., "EST", "PST")
 */
export function getTimezoneShortName(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });

    const parts = formatter.formatToParts(date);
    const tzName = parts.find((part) => part.type === 'timeZoneName');

    return tzName?.value ?? '';
  } catch {
    return '';
  }
}

/**
 * Create a timestamp from date/time strings interpreted as local time in a specific timezone
 * This converts "wall clock time" in the given timezone to a UTC timestamp
 *
 * The challenge: JavaScript Date constructor interprets date strings as local time.
 * We need to interpret them as being in the target timezone and convert to UTC.
 */
export function createTimestampInTimezone(
  dateStr: string, // "YYYY-MM-DD"
  timeStr: string, // "HH:mm"
  timezone: string
): number {
  // Parse input components
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Create an ISO string that represents this time (will be interpreted as local by Date)
  const localDateTimeStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  const localDate = new Date(localDateTimeStr);

  // Now we need to adjust for timezone difference
  // Get the offset between the system timezone and the target timezone
  const systemOffset = localDate.getTimezoneOffset() * 60 * 1000; // System timezone offset in ms
  const targetOffset = getTimezoneOffsetMs(timezone, localDate); // Target timezone offset in ms
  const offsetDiff = targetOffset - systemOffset;

  // Adjust the timestamp: if target timezone is ahead (e.g., UTC+5 vs UTC-5 means +10),
  // we subtract the difference (because Date already applied system offset)
  return localDate.getTime() - offsetDiff;
}

/**
 * Parse a timestamp to get date/time strings as they appear in a specific timezone
 */
export function parseTimestampInTimezone(
  timestamp: number,
  timezone: string
): { date: string; time: string } {
  const date = new Date(timestamp);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '';

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}
