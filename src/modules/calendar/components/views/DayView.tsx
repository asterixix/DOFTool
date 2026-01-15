/**
 * DayView - Single day with time slots
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import { format, isToday, startOfDay, endOfDay } from 'date-fns';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

import { CALENDAR_COLORS, type ExpandedEvent, type Calendar } from '../../types/Calendar.types';
import { getDayTimeSlots, getEventPosition } from '../../utils/dateHelpers';
import { EventHovercard } from '../EventHovercard';
import { EventTriggerButton } from '../EventTriggerButton';

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

interface DayViewProps {
  currentDate: number;
  events: ExpandedEvent[];
  calendars: Calendar[];
  selectedCalendarIds?: string[];
  onEventClick: (event: ExpandedEvent) => void;
  onTimeSlotClick: (timestamp: number) => void;
  onTimeRangeSelect?: (start: number, end: number) => void;
  onEditEvent?: (event: ExpandedEvent) => void;
  onDeleteEvent?: (event: ExpandedEvent) => void;
  onAddEvent?: (timestamp: number) => void;
}

const HOUR_HEIGHT = 60;

export function DayView({
  currentDate,
  events,
  calendars,
  selectedCalendarIds,
  onEventClick,
  onTimeSlotClick,
  onTimeRangeSelect,
  onEditEvent,
  onDeleteEvent,
  onAddEvent,
}: DayViewProps): JSX.Element {
  const day = useMemo(() => new Date(currentDate), [currentDate]);
  const isTodayDate = isToday(day);
  const timeSlots: TimeSlot[] = (
    getDayTimeSlots as (interval: number, startHour: number, endHour: number) => TimeSlot[]
  )(60, 0, 24);

  // Time range selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const timeGridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate timestamp from Y position, snapping to 15-minute intervals
  const getTimestampFromY = useCallback(
    (y: number): number => {
      if (!timeGridRef.current || !scrollContainerRef.current) {
        return 0;
      }

      const scrollTop = scrollContainerRef.current.scrollTop;
      const rect = timeGridRef.current.getBoundingClientRect();

      // Clamp Y to the vertical bounds of the time grid
      const clampedY = Math.max(rect.top, Math.min(rect.bottom, y));

      // Calculate relative Y position accounting for scroll
      const relativeY = clampedY - rect.top + scrollTop;

      // Calculate total minutes from top of day (0 = midnight)
      const totalMinutes = (relativeY / HOUR_HEIGHT) * 60;

      // Snap to 15-minute intervals
      const minutesPerBlock = 15;
      const snappedMinutes = Math.round(totalMinutes / minutesPerBlock) * minutesPerBlock;

      // Clamp to valid time range (0 to 23:45 = 1439 minutes in a day, last valid block is 23:45)
      const maxMinutes = 23 * 60 + 45; // 23:45 is the last valid 15-min slot
      const clampedMinutes = Math.max(0, Math.min(maxMinutes, snappedMinutes));

      // Convert back to hours and minutes
      const hours = Math.floor(clampedMinutes / 60);
      const minutes = clampedMinutes % 60;

      // Create timestamp
      const timestamp = new Date(day);
      timestamp.setHours(hours, minutes, 0, 0);

      return timestamp.getTime();
    },
    [day]
  );

  // Handle global mouse events for dragging outside the container
  useEffect(() => {
    if (!isSelecting) {
      return;
    }

    const handleGlobalMouseMove = (e: MouseEvent): void => {
      if (!timeGridRef.current || !scrollContainerRef.current) {
        return;
      }
      const timestamp = getTimestampFromY(e.clientY);
      setSelectionEnd(timestamp);
    };

    const handleGlobalMouseUp = (): void => {
      if (selectionStart === null || selectionEnd === null) {
        setIsSelecting(false);
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
    selectionStart,
    selectionEnd,
    getTimestampFromY,
    onTimeRangeSelect,
    onTimeSlotClick,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.button !== 0) {
      return; // Only left mouse button
    }
    if ((e.target as HTMLElement).closest('[data-event]')) {
      return; // Don't select if clicking on event
    }

    const timestamp = getTimestampFromY(e.clientY);
    setIsSelecting(true);
    setSelectionStart(timestamp);
    setSelectionEnd(timestamp);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!isSelecting || selectionStart === null) {
      return;
    }
    const timestamp = getTimestampFromY(e.clientY);
    setSelectionEnd(timestamp);
  };

  // Get all-day events
  const allDayEvents = useMemo(
    (): ExpandedEvent[] =>
      events.filter((event: ExpandedEvent) => {
        // Filter by selected calendars - if selectedCalendarIds is provided (even if empty), use it
        if (selectedCalendarIds !== undefined) {
          if (!selectedCalendarIds.includes(event.calendarId)) {
            return false;
          }
        }
        if (!event.allDay) {
          return false;
        }
        const dayStart = startOfDay(day).getTime();
        const dayEnd = endOfDay(day).getTime();
        const eventStart = startOfDay(new Date(event.start)).getTime();
        const eventEnd = endOfDay(new Date(event.end)).getTime();
        return eventStart <= dayEnd && eventEnd >= dayStart;
      }),
    [events, selectedCalendarIds, day]
  );

  // Get timed events
  const timedEvents = useMemo(
    (): ExpandedEvent[] =>
      events.filter((event: ExpandedEvent) => {
        // Filter by selected calendars - if selectedCalendarIds is provided (even if empty), use it
        if (selectedCalendarIds !== undefined) {
          if (!selectedCalendarIds.includes(event.calendarId)) {
            return false;
          }
        }
        if (event.allDay) {
          return false;
        }
        const dayStart = startOfDay(day).getTime();
        const dayEnd = endOfDay(day).getTime();
        return event.start < dayEnd && event.end > dayStart;
      }),
    [events, selectedCalendarIds, day]
  );

  const getCalendarById = (id: string): Calendar | undefined => {
    return calendars.find((c) => c.id === id);
  };

  // Calculate current time indicator position
  const now = new Date();
  const currentTimePosition = isToday(day)
    ? ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT
    : null;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="flex shrink-0 items-center border-b bg-muted/30 p-4">
        <div className="text-center">
          <span className="text-xs font-medium text-muted-foreground">{format(day, 'EEEE')}</span>
          <div
            className={cn(
              'mt-1 flex h-12 w-12 items-center justify-center rounded-full text-2xl',
              isTodayDate && 'bg-primary font-bold text-primary-foreground'
            )}
          >
            {format(day, 'd')}
          </div>
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="shrink-0 border-b p-2">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">All day</div>
          <div className="space-y-1">
            {allDayEvents.map((event) => {
              const color = event.color ?? getCalendarById(event.calendarId)?.color ?? 'blue';
              const colorClasses = CALENDAR_COLORS[color] ?? CALENDAR_COLORS.blue;
              const calendar = getCalendarById(event.calendarId);

              return (
                <EventHovercard key={event.id} calendar={calendar} event={event}>
                  <EventTriggerButton
                    className={cn(
                      'w-full rounded px-2 py-1 text-left text-sm',
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
        </div>
      )}

      {/* Time grid - scrollable */}
      <div ref={scrollContainerRef} className="touch-scroll flex min-h-0 flex-1 overflow-auto">
        {/* Time labels */}
        <div className="relative w-20 shrink-0 border-r">
          {timeSlots.map((slot, index) => (
            <div key={index} className="relative" style={{ height: HOUR_HEIGHT }}>
              {slot.minute === 0 && (
                <span className="absolute -top-2 right-3 text-xs text-muted-foreground">
                  {slot.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day column */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              ref={timeGridRef}
              aria-label="Time grid for event creation and selection"
              className="relative flex-1"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onTimeSlotClick) {
                    const now = new Date();
                    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
                    onTimeSlotClick(now.getTime());
                  }
                }
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            >
              {/* Hour lines */}
              {timeSlots.map((slot, index) => (
                <button
                  key={index}
                  aria-label={`Create event at ${slot.hour}:${slot.minute.toString().padStart(2, '0')}`}
                  className="w-full border-b border-dashed hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ height: HOUR_HEIGHT }}
                  type="button"
                  onClick={() => {
                    const timestamp = new Date(day);
                    timestamp.setHours(slot.hour, slot.minute, 0, 0);
                    onTimeSlotClick(timestamp.getTime());
                  }}
                />
              ))}

              {/* Current time indicator */}
              {currentTimePosition !== null && (
                <div
                  className="absolute left-0 right-0 z-10 flex items-center"
                  style={{ top: currentTimePosition }}
                >
                  <div className="-ml-1.5 h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-0.5 flex-1 bg-red-500" />
                </div>
              )}

              {/* Selection overlay */}
              {isSelecting && selectionStart !== null && selectionEnd !== null && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-20 rounded-sm border border-primary bg-primary/20"
                  style={{
                    top: `${((Math.min(selectionStart, selectionEnd) - startOfDay(day).getTime()) / (1000 * 60 * 60)) * HOUR_HEIGHT}px`,
                    height: `${(Math.abs(selectionEnd - selectionStart) / (1000 * 60 * 60)) * HOUR_HEIGHT}px`,
                    minHeight: '4px', // Minimum visible height
                  }}
                />
              )}

              {/* Events */}
              {timedEvents.map((event) => {
                const { top, height } = getEventPosition(event, day, HOUR_HEIGHT);
                const color = event.color ?? getCalendarById(event.calendarId)?.color ?? 'blue';
                const colorClasses = CALENDAR_COLORS[color] ?? CALENDAR_COLORS.blue;
                const calendar = getCalendarById(event.calendarId);

                return (
                  <ContextMenu key={event.id}>
                    <ContextMenuTrigger asChild>
                      <EventHovercard calendar={calendar} event={event}>
                        <EventTriggerButton
                          data-event
                          className={cn(
                            'absolute left-2 right-2 z-30 overflow-hidden rounded-lg border-l-4 px-3 py-1 text-left shadow-sm',
                            'bg-white dark:bg-zinc-800',
                            colorClasses.border
                          )}
                          style={{
                            top: `${top}px`,
                            height: `${Math.max(height, 24)}px`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          <div className={cn('truncate font-medium', colorClasses.text)}>
                            {event.title}
                          </div>
                          {height > 40 && (
                            <div className="truncate text-xs text-muted-foreground">
                              {format(new Date(event.start), 'h:mm a')} -{' '}
                              {format(new Date(event.end), 'h:mm a')}
                            </div>
                          )}
                          {height > 60 && event.location && (
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              📍 {event.location}
                            </div>
                          )}
                        </EventTriggerButton>
                      </EventHovercard>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => {
                          if (onEditEvent) {
                            onEditEvent(event);
                          } else {
                            onEventClick(event);
                          }
                        }}
                      >
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </ContextMenuItem>
                      {onDeleteEvent && (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
                                onDeleteEvent(event);
                              }
                            }}
                          >
                            <svg
                              className="mr-2 h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                            Delete
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {onAddEvent && (
              <ContextMenuItem
                onClick={() => {
                  if (selectionStart !== null) {
                    onAddEvent(selectionStart);
                  } else {
                    const now = new Date();
                    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
                    onAddEvent(now.getTime());
                  }
                }}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Add event
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </div>
  );
}
