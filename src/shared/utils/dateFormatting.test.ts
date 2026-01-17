import { describe, it, expect } from 'vitest';

import {
  getDateFormatString,
  formatDateWithSettings,
  formatTimeWithSettings,
  formatDateTimeWithSettings,
  weekStartDayToNumber,
} from './dateFormatting';

describe('dateFormatting', () => {
  describe('getDateFormatString', () => {
    it('should return MM/dd/yyyy for MM/DD/YYYY', () => {
      expect(getDateFormatString('MM/DD/YYYY')).toBe('MM/dd/yyyy');
    });

    it('should return dd/MM/yyyy for DD/MM/YYYY', () => {
      expect(getDateFormatString('DD/MM/YYYY')).toBe('dd/MM/yyyy');
    });

    it('should return yyyy-MM-dd for YYYY-MM-DD', () => {
      expect(getDateFormatString('YYYY-MM-DD')).toBe('yyyy-MM-dd');
    });

    it('should return default format for unknown format', () => {
      expect(getDateFormatString('unknown' as never)).toBe('MM/dd/yyyy');
    });
  });

  describe('formatDateWithSettings', () => {
    const testDate = new Date('2024-01-15');

    it('should format with MM/DD/YYYY', () => {
      const result = formatDateWithSettings(testDate, 'MM/DD/YYYY');
      expect(result).toBe('01/15/2024');
    });

    it('should format with DD/MM/YYYY', () => {
      const result = formatDateWithSettings(testDate, 'DD/MM/YYYY');
      expect(result).toBe('15/01/2024');
    });

    it('should format with YYYY-MM-DD', () => {
      const result = formatDateWithSettings(testDate, 'YYYY-MM-DD');
      expect(result).toBe('2024-01-15');
    });

    it('should handle timestamp input', () => {
      const result = formatDateWithSettings(testDate.getTime(), 'YYYY-MM-DD');
      expect(result).toBe('2024-01-15');
    });
  });

  describe('formatTimeWithSettings', () => {
    it('should format with 24h', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatTimeWithSettings(date, '24h');
      expect(result).toBe('14:30');
    });

    it('should format with 12h', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatTimeWithSettings(date, '12h');
      expect(result).toMatch(/2:30 PM/i);
    });

    it('should format morning time with 12h', () => {
      const date = new Date('2024-01-15T09:30:00');
      const result = formatTimeWithSettings(date, '12h');
      expect(result).toMatch(/9:30 AM/i);
    });

    it('should handle timestamp input', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatTimeWithSettings(date.getTime(), '24h');
      expect(result).toBe('14:30');
    });
  });

  describe('formatDateTimeWithSettings', () => {
    it('should combine date and time', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTimeWithSettings(date, 'YYYY-MM-DD', '24h');
      expect(result).toBe('2024-01-15 14:30');
    });

    it('should format with US style', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTimeWithSettings(date, 'MM/DD/YYYY', '12h');
      expect(result).toMatch(/01\/15\/2024 2:30 PM/i);
    });

    it('should format with EU style', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTimeWithSettings(date, 'DD/MM/YYYY', '24h');
      expect(result).toBe('15/01/2024 14:30');
    });
  });

  describe('weekStartDayToNumber', () => {
    it('should return 0 for sunday', () => {
      expect(weekStartDayToNumber('sunday')).toBe(0);
    });

    it('should return 1 for monday', () => {
      expect(weekStartDayToNumber('monday')).toBe(1);
    });
  });
});
