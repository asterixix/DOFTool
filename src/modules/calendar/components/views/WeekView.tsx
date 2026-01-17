/**
 * WeekView - Week calendar with time slots
 */

import { useState, useRef, useEffect, useCallback } from 'react';

import { format, startOfWeek, addDays, isSameDay, isToday, startOfDay, endOfDay } from 'date-fns';

import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

import { CALENDAR_COLORS, type ExpandedEvent, type Calendar } from '../../types/Calendar.types';
import { getDayTimeSlots, getEventPosition } from '../../utils/dateHelpers';
import { DateContextMenu } from '../DateContextMenu';
import { EventContextMenu } from '../EventContextMenu';
import { EventHovercard } from '../EventHovercard';
import { EventTriggerButton } from '../EventTriggerButton';

interface WeekViewProps {
  currentDate: number;
  selectedDate: number | null;
  events: ExpandedEvent[];
  calendars: Calendar[];
  selectedCalendarIds?: string[];
  onDateClick: (date: number) => void;
  onEventClick: (event: ExpandedEvent) => void;
  onTimeRangeSelect?: (start: number, end: number) => void;
  onTimeSlotClick?: (timestamp: number) => void;
  onEditEvent?: (event: ExpandedEvent) => void;
  onDeleteEvent?: (event: ExpandedEvent) => void;
  onAddEvent?: (timestamp: number) => void;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

const HOUR_HEIGHT = 60; // pixels

export function WeekView({
  currentDate,
  selectedDate,
  events,
  calendars,
  selectedCalendarIds,
  onDateClick,
  onEventClick,
  onTimeRangeSelect,
  onTimeSlotClick,
  onEditEvent,
  onDeleteEvent,
  onAddEvent,
  weekStartsOn = 0,
}: WeekViewProps): JSX.Element {
  const weekStart = startOfWeek(new Date(currentDate), { weekStartsOn });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const timeSlots = getDayTimeSlots(60, 0, 24); // Hourly slots

  // Time range selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const dayColumnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate timestamp from Y position for a specific day column, snapping to 15-minute intervals
  const getTimestampFromY = useCallback(
    (y: number, dayIndex: number): number => {
      if (!scrollContainerRef.current || dayIndex < 0 || dayIndex >= days.length) {
        return 0;
      }

      const selectedDay = days[dayIndex];
      if (!selectedDay) {
        return 0;
      }

      const dayColumnRef = dayColumnRefs.current[dayIndex];

      if (!dayColumnRef) {
        return 0;
      }

      const scrollTop = scrollContainerRef.current.scrollTop;
      const rect = dayColumnRef.getBoundingClientRect();

      // Clamp Y to the vertical bounds of the day column (but allow horizontal movement outside)
      const clampedY = Math.max(rect.top, Math.min(rect.bottom, y));

      // Calculate relative Y position accounting for scroll
      const relativeY = clampedY - rect.top + scrollTop;

      // Calculate total minutes from top of day (0 = midnight)
      const totalMinutes = (relativeY / HOUR_HEIGHT) * 60;

      // Snap to 15-minute intervals
      const minutesPerBlock = 15;
      const snappedMinutes = Math.round(totalMinutes / minutesPerBlock) * minutesPerBlock;

      // Clamp to valid time range (0 to 23:45 = 1439 minutes)
      const maxMinutes = 23 * 60 + 45;
      const clampedMinutes = Math.max(0, Math.min(maxMinutes, snappedMinutes));

      // Convert back to hours and minutes
      const hours = Math.floor(clampedMinutes / 60);
      const minutes = clampedMinutes % 60;

      // Create timestamp for the specific day
      const timestamp = new Date(selectedDay);
      timestamp.setHours(hours, minutes, 0, 0);

      return timestamp.getTime();
    },
    [days]
  );

  // Handle global mouse events for dragging outside the container
  useEffect(() => {
    if (!isSelecting || selectedDayIndex === null) {
      return;
    }

    const handleGlobalMouseMove = (e: MouseEvent): void => {
      if (selectedDayIndex === null) {
        return;
      }
      const timestamp = getTimestampFromY(e.clientY, selectedDayIndex);
      setSelectionEnd(timestamp);
    };

    const handleGlobalMouseUp = (): void => {
      if (selectionStart === null || selectionEnd === null) {
        setIsSelecting(false);
        setSelectedDayIndex(null);
        setSelectionStart(null);
        setSelectionEnd(null);
        return;
      }

      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);

      // Minimum 15 minute selection
      if (end - start >= 15 * 60 * 1000) {
        if (onTimeRangeSelect) {
          onTimeRangeSelect(start, end);
        } else if (onTimeSlotClick) {
          onTimeSlotClick(start);
        }
      }

      setIsSelecting(false);
      setSelectedDayIndex(null);
      setSelectionStart(null);
      setSelectionEnd(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [
    isSelecting,
    selectedDayIndex,
    selectionStart,
    selectionEnd,
    days,
    getTimestampFromY,
    onTimeRangeSelect,
    onTimeSlotClick,
  ]);

  // Get all-day events
  const getAllDayEvents = (date: Date): ExpandedEvent[] => {
    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    return events.filter((event) => {
      // Filter by selected calendars - if selectedCalendarIds is provided (even if empty), use it
      if (selectedCalendarIds !== undefined) {
        if (!selectedCalendarIds.includes(event.calendarId)) {
          return false;
        }
      }
      if (!event.allDay) {
        return false;
      }
      const eventStart = startOfDay(new Date(event.start)).getTime();
      const eventEnd = endOfDay(new Date(event.end)).getTime();
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  // Get timed events for a day
  const getTimedEvents = (date: Date): ExpandedEvent[] => {
    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    return events.filter((event) => {
      // Filter by selected calendars - if selectedCalendarIds is provided (even if empty), use it
      if (selectedCalendarIds !== undefined) {
        if (!selectedCalendarIds.includes(event.calendarId)) {
          return false;
        }
      }
      if (event.allDay) {
        return false;
      }
      return event.start < dayEnd && event.end > dayStart;
    });
  };

  const getCalendarById = (id: string): Calendar | undefined => {
    return calendars.find((c) => c.id === id);
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden rounded-lg border">
      {/* Header with day names */}
      <div className="flex shrink-0 border-b bg-muted/30">
        {/* Time gutter spacer */}
        <div className="w-16 shrink-0 border-r" />

        {/* Day headers */}
        <div className="grid flex-1 grid-cols-7">
          {days.map((day, index) => {
            const isTodayDate = isToday(day);
            const isSelected = selectedDate && isSameDay(day, new Date(selectedDate));

            return (
              <div
                key={index}
                className={cn(
                  'flex flex-col items-center border-r py-2 last:border-r-0',
                  isSelected && 'bg-primary/5'
                )}
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {format(day, 'EEE')}
                </span>
                <span
                  className={cn(
                    'mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm',
                    isTodayDate && 'bg-primary font-medium text-primary-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* All-day events row */}
      <div className="flex shrink-0 border-b">
        <div className="flex w-16 shrink-0 items-center justify-end border-r px-2 text-xs text-muted-foreground">
          All day
        </div>
        <div className="grid flex-1 grid-cols-7">
          {days.map((day, index) => {
            const allDayEvents = getAllDayEvents(day);

            return (
              <div key={index} className="min-h-[40px] border-r p-1 last:border-r-0">
                {allDayEvents.map((event) => {
                  const color = event.color ?? getCalendarById(event.calendarId)?.color ?? 'blue';
                  const colorClasses = CALENDAR_COLORS[color] ?? CALENDAR_COLORS.blue;
                  const calendar = getCalendarById(event.calendarId);

                  return (
                    <EventHovercard key={event.id} calendar={calendar} event={event}>
                      <EventTriggerButton
                        className={cn(
                          'mb-0.5 w-full truncate rounded px-1 py-0.5 text-left text-xs',
                          colorClasses.bg,
                          colorClasses.text
                        )}
                        onClick={() => onEventClick(event)}
                      >
                        {event.title}
                      </EventTriggerButton>
                    </EventHovercard>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time grid - scrollable */}
      <div ref={scrollContainerRef} className="touch-scroll flex min-h-0 flex-1 overflow-auto">
        {/* Time labels */}
        <div className="relative w-16 shrink-0 border-r bg-background">
          {timeSlots.map((slot, index) => (
            <div key={index} className="relative" style={{ height: HOUR_HEIGHT }}>
              {slot.minute === 0 && (
                <span className="absolute -top-2 right-2 text-xs text-muted-foreground">
                  {slot.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Days columns */}
        <div className="grid flex-1 grid-cols-7">
          {days.map((day, dayIndex) => {
            const timedEvents = getTimedEvents(day);
            const isSelected = selectedDate && isSameDay(day, new Date(selectedDate));
            const isThisDaySelected = selectedDayIndex === dayIndex;

            const handleDayMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
              if (e.button !== 0) {
                return; // Only left mouse button
              }
              if ((e.target as HTMLElement).closest('[data-event]')) {
                return; // Don't select if clicking on event
              }

              const timestamp = getTimestampFromY(e.clientY, dayIndex);
              setIsSelecting(true);
              setSelectedDayIndex(dayIndex);
              setSelectionStart(timestamp);
              setSelectionEnd(timestamp);
              e.preventDefault();
              e.stopPropagation();
            };

            const handleDayMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
              if (!isSelecting || selectedDayIndex !== dayIndex || selectionStart === null) {
                return;
              }
              const timestamp = getTimestampFromY(e.clientY, dayIndex);
              setSelectionEnd(timestamp);
            };

            return (
              <ContextMenu key={dayIndex}>
                <ContextMenuTrigger asChild>
                  <div
                    ref={(el) => {
                      dayColumnRefs.current[dayIndex] = el;
                    }}
                    aria-label={`Date ${day.toLocaleDateString()}`}
                    className={cn(
                      'relative w-full cursor-pointer border-r transition-colors last:border-r-0 hover:bg-muted/20',
                      isSelected && 'bg-primary/5',
                      'focus-within:ring-2 focus-within:ring-primary'
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      // Only trigger if not selecting
                      if (!isSelecting) {
                        onDateClick(day.getTime());
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onDateClick(day.getTime());
                      }
                    }}
                    onMouseDown={handleDayMouseDown}
                    onMouseMove={handleDayMouseMove}
                  >
                    {/* Hour lines */}
                    {timeSlots.map((_, index) => (
                      <div
                        key={index}
                        className="border-b border-dashed"
                        style={{ height: HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Selection overlay */}
                    {isThisDaySelected &&
                      isSelecting &&
                      selectionStart !== null &&
                      selectionEnd !== null && (
                        <div
                          className="pointer-events-none absolute left-0 right-0 z-20 rounded-sm border border-primary bg-primary/20"
                          style={{
                            top: `${((Math.min(selectionStart, selectionEnd) - startOfDay(day).getTime()) / (1000 * 60 * 60)) * HOUR_HEIGHT}px`,
                            height: `${(Math.abs(selectionEnd - selectionStart) / (1000 * 60 * 60)) * HOUR_HEIGHT}px`,
                            minHeight: '4px',
                          }}
                        />
                      )}

                    {/* Events */}
                    {timedEvents.map((event) => {
                      const { top, height } = getEventPosition(event, day, HOUR_HEIGHT);
                      const color =
                        event.color ?? getCalendarById(event.calendarId)?.color ?? 'blue';
                      const colorClasses = CALENDAR_COLORS[color] ?? CALENDAR_COLORS.blue;
                      const calendar = getCalendarById(event.calendarId);

                      return (
                        <ContextMenu key={event.id}>
                          <ContextMenuTrigger asChild>
                            <EventHovercard calendar={calendar} event={event}>
                              <EventTriggerButton
                                data-event
                                className={cn(
                                  'absolute left-1 right-1 z-30 overflow-hidden rounded border px-1 py-0.5 text-left text-xs',
                                  colorClasses.bg,
                                  colorClasses.text,
                                  colorClasses.border
                                )}
                                style={{
                                  top: `${top}px`,
                                  height: `${Math.max(height, 20)}px`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick(event);
                                }}
                              >
                                <div className="truncate font-medium">{event.title}</div>
                                {height > 30 && (
                                  <div className="truncate opacity-75">
                                    {format(new Date(event.start), 'h:mm a')}
                                  </div>
                                )}
                              </EventTriggerButton>
                            </EventHovercard>
                          </ContextMenuTrigger>
                          <EventContextMenu
                            event={event}
                            onDeleteEvent={onDeleteEvent}
                            onEditEvent={onEditEvent}
                            onEventClick={onEventClick}
                          />
                        </ContextMenu>
                      );
                    })}
                  </div>
                </ContextMenuTrigger>
                <DateContextMenu
                  timestamp={(() => {
                    const defaultTime = new Date(day);
                    defaultTime.setHours(9, 0, 0, 0);
                    return defaultTime.getTime();
                  })()}
                  onAddEvent={onAddEvent}
                />
              </ContextMenu>
            );
          })}
        </div>
      </div>
    </div>
  );
}
