/**
 * CalendarHeader - Navigation and view controls
 */

import { useState } from 'react';

import {
  format,
  getYear,
  getMonth,
  setMonth,
  setYear,
  startOfYear,
  eachMonthOfInterval,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { trackModuleAction } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

import { getViewTitle } from '../utils/dateHelpers';

import type { CalendarView } from '../types/Calendar.types';

interface CalendarHeaderProps {
  currentDate: number;
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onNavigateToday: () => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNewEvent: () => void;
  onDateSelect?: (date: number) => void;
  isLoading?: boolean;
}

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'agenda', label: 'Agenda' },
];

export function CalendarHeader({
  currentDate,
  currentView,
  onViewChange,
  onNavigateToday,
  onNavigatePrev,
  onNavigateNext,
  onNewEvent,
  onDateSelect,
  isLoading,
}: CalendarHeaderProps): JSX.Element {
  const title = getViewTitle(currentDate, currentView);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const currentDateObj = new Date(currentDate);
  const currentYear = getYear(currentDateObj);
  const currentMonth = getMonth(currentDateObj);

  // Generate month options
  const months = eachMonthOfInterval({
    start: startOfYear(currentDateObj),
    end: new Date(currentYear, 11, 31),
  });

  // Generate year options (10 years before and after current)
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const handleMonthSelect = (month: number): void => {
    const newDate = setMonth(currentDateObj, month);
    onDateSelect?.(newDate.getTime());
    setMonthPickerOpen(false);
  };

  const handleYearSelect = (year: number): void => {
    const newDate = setYear(currentDateObj, year);
    onDateSelect?.(newDate.getTime());
    setYearPickerOpen(false);
  };

  // Extract month and year from title for clickable parts
  const getTitleParts = ():
    | { month: string; year: string; full: string; canPick: true }
    | { month?: undefined; year?: undefined; full: string; canPick: false } => {
    if (currentView === 'month' || currentView === 'week' || currentView === 'agenda') {
      // Format: "January 2026"
      const parts = title.split(' ');
      const monthPart = parts[0];
      const yearPart = parts[1];
      if (parts.length === 2 && monthPart && yearPart) {
        return { month: monthPart, year: yearPart, full: title, canPick: true };
      }
    }
    if (currentView === 'day') {
      // Format: "Tuesday, January 20, 2026" or "EEEE, MMMM d, yyyy"
      // We can extract month and year directly from currentDateObj
      return {
        month: format(currentDateObj, 'MMMM'),
        year: format(currentDateObj, 'yyyy'),
        full: title,
        canPick: true,
      };
    }
    return { full: title, canPick: false };
  };

  const titleParts = getTitleParts();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onNavigateToday}>
          Today
        </Button>
        <div className="flex items-center">
          <Button className="h-8 w-8" size="icon" variant="ghost" onClick={onNavigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button className="h-8 w-8" size="icon" variant="ghost" onClick={onNavigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {titleParts.canPick && titleParts.month && titleParts.year ? (
          <div className="flex items-center gap-1">
            {currentView === 'day' && (
              <span className="text-lg font-semibold sm:text-xl">
                {format(currentDateObj, 'EEEE, ')}
              </span>
            )}
            <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  className="cursor-pointer text-lg font-semibold hover:underline sm:text-xl"
                  type="button"
                >
                  {titleParts.month}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="grid grid-cols-3 gap-1">
                  {months.map((month, index) => (
                    <Button
                      key={index}
                      className={cn(
                        'h-8 text-xs',
                        index === currentMonth && 'bg-primary text-primary-foreground'
                      )}
                      size="sm"
                      variant={index === currentMonth ? 'default' : 'ghost'}
                      onClick={() => handleMonthSelect(index)}
                    >
                      {format(month, 'MMM')}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {currentView === 'day' && (
              <span className="text-lg font-semibold sm:text-xl">
                {' '}
                {format(currentDateObj, 'd, ')}
              </span>
            )}
            <Popover open={yearPickerOpen} onOpenChange={setYearPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  className="cursor-pointer text-lg font-semibold hover:underline sm:text-xl"
                  type="button"
                >
                  {titleParts.year}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto">
                  {years.map((year) => (
                    <Button
                      key={year}
                      className={cn(
                        'h-8 text-xs',
                        year === currentYear && 'bg-primary text-primary-foreground'
                      )}
                      size="sm"
                      variant={year === currentYear ? 'default' : 'ghost'}
                      onClick={() => handleYearSelect(year)}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <h2 className="text-lg font-semibold sm:text-xl">{titleParts.full}</h2>
        )}
        {isLoading && (
          <Badge className="text-xs" variant="secondary">
            Loading...
          </Badge>
        )}
      </div>

      {/* Right: View switcher and actions */}
      <div className="flex items-center gap-2">
        {/* View switcher */}
        <div className="flex rounded-md border bg-muted/30 p-0.5">
          {VIEW_OPTIONS.map((option) => (
            <Button
              key={option.value}
              className="h-7 px-3 text-xs"
              size="sm"
              variant={currentView === option.value ? 'secondary' : 'ghost'}
              onClick={() => {
                trackModuleAction('calendar', 'view_changed', { view: option.value });
                onViewChange(option.value);
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* New event button */}
        <Button className="gap-1" size="sm" onClick={onNewEvent}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Event</span>
        </Button>
      </div>
    </div>
  );
}
