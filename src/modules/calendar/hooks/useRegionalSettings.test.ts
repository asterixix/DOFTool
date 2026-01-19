import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useSettingsStore } from '@/stores/settings.store';

import { useRegionalSettings } from './useRegionalSettings';

// Mock settings store
vi.mock('@/stores/settings.store', () => ({
  useSettingsStore: vi.fn(),
}));

// Mock dateFormatting utilities
vi.mock('@/shared/utils/dateFormatting', () => ({
  formatDateWithSettings: vi.fn((_date: Date | number, _format: string) => {
    const d = typeof _date === 'number' ? new Date(_date) : _date;
    return d.toLocaleDateString();
  }),
  formatTimeWithSettings: vi.fn((_date: Date | number, _format: string) => {
    const d = typeof _date === 'number' ? new Date(_date) : _date;
    return d.toLocaleTimeString();
  }),
  formatDateTimeWithSettings: vi.fn(
    (_date: Date | number, _dateFormat: string, _timeFormat: string) => {
      const d = typeof _date === 'number' ? new Date(_date) : _date;
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    }
  ),
  weekStartDayToNumber: vi.fn((day: string) => {
    return day === 'sunday' ? 0 : 1;
  }),
}));

describe('useRegionalSettings', () => {
  const mockUseSettingsStore = useSettingsStore as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return regional settings from store', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      weekStartDay: 'sunday',
      timezone: 'America/New_York',
    });

    const { result } = renderHook(() => useRegionalSettings());

    expect(result.current.dateFormat).toBe('MM/DD/YYYY');
    expect(result.current.timeFormat).toBe('12h');
    expect(result.current.weekStartDay).toBe(0);
    expect(result.current.timezone).toBe('America/New_York');
  });

  it('should format date using settings', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      weekStartDay: 'monday',
      timezone: 'Europe/London',
    });

    const { result } = renderHook(() => useRegionalSettings());
    const testDate = new Date('2024-01-15T10:30:00Z');

    const formatted = result.current.formatDate(testDate);

    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  it('should format time using settings', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      weekStartDay: 'sunday',
      timezone: 'America/New_York',
    });

    const { result } = renderHook(() => useRegionalSettings());
    const testDate = new Date('2024-01-15T10:30:00Z');

    const formatted = result.current.formatTime(testDate);

    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  it('should format date and time using settings', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      weekStartDay: 'monday',
      timezone: 'UTC',
    });

    const { result } = renderHook(() => useRegionalSettings());
    const testDate = new Date('2024-01-15T10:30:00Z');

    const formatted = result.current.formatDateTime(testDate);

    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('2024');
  });

  it('should handle numeric date input', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      weekStartDay: 'sunday',
      timezone: 'America/New_York',
    });

    const { result } = renderHook(() => useRegionalSettings());
    const timestamp = Date.now();

    const formatted = result.current.formatDate(timestamp);

    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  it('should convert weekStartDay sunday to 0', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      weekStartDay: 'sunday',
      timezone: 'America/New_York',
    });

    const { result } = renderHook(() => useRegionalSettings());

    expect(result.current.weekStartDay).toBe(0);
  });

  it('should convert weekStartDay monday to 1', () => {
    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      weekStartDay: 'monday',
      timezone: 'America/New_York',
    });

    const { result } = renderHook(() => useRegionalSettings());

    expect(result.current.weekStartDay).toBe(1);
  });

  it('should update when settings change', () => {
    const { result, rerender } = renderHook(() => useRegionalSettings());

    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      weekStartDay: 'sunday',
      timezone: 'America/New_York',
    });

    expect(result.current.dateFormat).toBe('MM/DD/YYYY');

    mockUseSettingsStore.mockReturnValue({
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      weekStartDay: 'monday',
      timezone: 'Europe/London',
    });

    rerender();

    expect(result.current.dateFormat).toBe('DD/MM/YYYY');
    expect(result.current.timeFormat).toBe('24h');
    expect(result.current.weekStartDay).toBe(1);
    expect(result.current.timezone).toBe('Europe/London');
  });
});
