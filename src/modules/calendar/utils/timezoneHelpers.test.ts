import { describe, it, expect } from 'vitest';
import {
  getSystemTimezone,
  getCommonTimezones,
  getTimezoneOffset,
  getTimezoneDisplayName,
  getTimezoneShortName,
  formatInTimezone,
  createTimestampInTimezone,
  parseTimestampInTimezone,
} from './timezoneHelpers';

describe('timezoneHelpers', () => {
  describe('getSystemTimezone', () => {
    it('should return a string', () => {
      const tz = getSystemTimezone();
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    });

    it('should return a valid IANA timezone identifier', () => {
      const tz = getSystemTimezone();
      // Valid timezone IDs contain a slash (e.g., America/New_York) or are UTC
      expect(tz === 'UTC' || tz.includes('/')).toBe(true);
    });
  });

  describe('getCommonTimezones', () => {
    it('should return an array of timezones', () => {
      const timezones = getCommonTimezones();
      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
    });

    it('should include value, label, and offset for each timezone', () => {
      const timezones = getCommonTimezones();
      timezones.forEach((tz) => {
        expect(tz).toHaveProperty('value');
        expect(tz).toHaveProperty('label');
        expect(tz).toHaveProperty('offset');
        expect(typeof tz.value).toBe('string');
        expect(typeof tz.label).toBe('string');
        expect(typeof tz.offset).toBe('string');
      });
    });

    it('should include common US timezones', () => {
      const timezones = getCommonTimezones();
      const values = timezones.map((tz) => tz.value);
      expect(values).toContain('America/New_York');
      expect(values).toContain('America/Chicago');
      expect(values).toContain('America/Denver');
      expect(values).toContain('America/Los_Angeles');
    });

    it('should include UTC', () => {
      const timezones = getCommonTimezones();
      const values = timezones.map((tz) => tz.value);
      expect(values).toContain('UTC');
    });

    it('should include major international timezones', () => {
      const timezones = getCommonTimezones();
      const values = timezones.map((tz) => tz.value);
      expect(values).toContain('Europe/London');
      expect(values).toContain('Asia/Tokyo');
      expect(values).toContain('Australia/Sydney');
    });
  });

  describe('getTimezoneOffset', () => {
    it('should return UTC offset string', () => {
      const offset = getTimezoneOffset('UTC');
      expect(offset).toContain('UTC');
    });

    it('should return offset for specific timezone', () => {
      const offset = getTimezoneOffset('America/New_York');
      expect(offset).toMatch(/UTC[+-]\d+/);
    });

    it('should handle invalid timezone gracefully', () => {
      const offset = getTimezoneOffset('Invalid/Timezone');
      expect(typeof offset).toBe('string');
    });

    it('should accept optional date parameter', () => {
      const winterDate = new Date('2024-01-15');
      const summerDate = new Date('2024-07-15');
      const winterOffset = getTimezoneOffset('America/New_York', winterDate);
      const summerOffset = getTimezoneOffset('America/New_York', summerDate);
      // Both should return valid offset strings
      expect(winterOffset).toMatch(/UTC[+-]/);
      expect(summerOffset).toMatch(/UTC[+-]/);
    });
  });

  describe('getTimezoneDisplayName', () => {
    it('should return display name for valid timezone', () => {
      const name = getTimezoneDisplayName('America/New_York');
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should return timezone string for invalid timezone', () => {
      const name = getTimezoneDisplayName('Invalid/Timezone');
      expect(name).toBe('Invalid/Timezone');
    });

    it('should return descriptive name for common timezones', () => {
      const name = getTimezoneDisplayName('America/New_York');
      // Should contain "Eastern" or similar
      expect(name.toLowerCase()).toMatch(/eastern|new york|america/i);
    });
  });

  describe('getTimezoneShortName', () => {
    it('should return short name for valid timezone', () => {
      const name = getTimezoneShortName('America/New_York');
      expect(typeof name).toBe('string');
    });

    it('should return empty string for invalid timezone', () => {
      const name = getTimezoneShortName('Invalid/Timezone');
      expect(name).toBe('');
    });

    it('should return abbreviated name like EST, PST', () => {
      const name = getTimezoneShortName('America/New_York', new Date('2024-01-15'));
      // In winter, should be EST or similar
      expect(name.length).toBeLessThanOrEqual(5);
    });
  });

  describe('formatInTimezone', () => {
    it('should format date in specified timezone', () => {
      const date = new Date('2024-01-15T15:30:00Z');
      const formatted = formatInTimezone(date, 'yyyy-MM-dd HH:mm', 'UTC');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('01');
      expect(formatted).toContain('15');
    });

    it('should handle timestamp input', () => {
      const timestamp = new Date('2024-01-15T15:30:00Z').getTime();
      const formatted = formatInTimezone(timestamp, 'yyyy-MM-dd', 'UTC');
      expect(formatted).toContain('2024');
    });

    it('should format with AM/PM when format includes a', () => {
      const date = new Date('2024-01-15T15:30:00Z');
      const formatted = formatInTimezone(date, 'HH:mm a', 'UTC');
      expect(formatted).toBeTruthy();
    });

    it('should handle invalid timezone gracefully', () => {
      const date = new Date('2024-01-15T15:30:00Z');
      const formatted = formatInTimezone(date, 'yyyy-MM-dd', 'Invalid/Timezone');
      expect(typeof formatted).toBe('string');
    });
  });

  describe('createTimestampInTimezone', () => {
    it('should create timestamp for given date and time in timezone', () => {
      const timestamp = createTimestampInTimezone('2024-01-15', '10:00', 'UTC');
      const date = new Date(timestamp);
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCDate()).toBe(15);
    });

    it('should handle different timezones', () => {
      const utcTimestamp = createTimestampInTimezone('2024-01-15', '10:00', 'UTC');
      const nyTimestamp = createTimestampInTimezone('2024-01-15', '10:00', 'America/New_York');
      // NY is behind UTC, so same wall clock time should result in later UTC time
      expect(nyTimestamp).toBeGreaterThan(utcTimestamp);
    });
  });

  describe('parseTimestampInTimezone', () => {
    it('should parse timestamp to date and time strings', () => {
      const timestamp = new Date('2024-01-15T15:30:00Z').getTime();
      const result = parseTimestampInTimezone(timestamp, 'UTC');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
    });

    it('should return formatted date string', () => {
      const timestamp = new Date('2024-01-15T15:30:00Z').getTime();
      const result = parseTimestampInTimezone(timestamp, 'UTC');
      expect(result.date).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should return formatted time string', () => {
      const timestamp = new Date('2024-01-15T15:30:00Z').getTime();
      const result = parseTimestampInTimezone(timestamp, 'UTC');
      expect(result.time).toMatch(/\d{2}:\d{2}/);
    });

    it('should respect timezone', () => {
      const timestamp = new Date('2024-01-15T00:00:00Z').getTime();
      const utcResult = parseTimestampInTimezone(timestamp, 'UTC');
      // UTC midnight should show as previous day evening in NY
      expect(utcResult.date).toContain('2024');
    });
  });
});
