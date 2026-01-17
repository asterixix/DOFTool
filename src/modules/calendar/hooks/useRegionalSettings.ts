/**
 * useRegionalSettings - Hook to get regional settings for calendar formatting
 */

import {
  formatDateWithSettings,
  formatDateTimeWithSettings,
  formatTimeWithSettings,
  weekStartDayToNumber,
} from '@/shared/utils/dateFormatting';
import { useSettingsStore } from '@/stores/settings.store';

export function useRegionalSettings(): {
  dateFormat: string;
  timeFormat: string;
  weekStartDay: 0 | 1;
  timezone: string;
  formatDate: (date: Date | number) => string;
  formatTime: (date: Date | number) => string;
  formatDateTime: (date: Date | number) => string;
} {
  const regional = useSettingsStore((state) => state.regional);

  const formatDate = (date: Date | number): string => {
    return formatDateWithSettings(date, regional.dateFormat);
  };

  const formatTime = (date: Date | number): string => {
    return formatTimeWithSettings(date, regional.timeFormat);
  };

  const formatDateTime = (date: Date | number): string => {
    return formatDateTimeWithSettings(date, regional.dateFormat, regional.timeFormat);
  };

  return {
    dateFormat: regional.dateFormat,
    timeFormat: regional.timeFormat,
    weekStartDay: weekStartDayToNumber(regional.weekStartDay),
    timezone: regional.timezone,
    formatDate,
    formatTime,
    formatDateTime,
  };
}
