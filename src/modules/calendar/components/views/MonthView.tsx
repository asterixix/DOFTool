/**
 * MonthView - Month calendar grid display
 */

import { format, isSameMonth, isSameDay, isToday, startOfDay, endOfDay } from 'date-fns';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

import { CALENDAR_COLORS } from '../../types/Calendar.types';
import { getMonthViewWeeks } from '../../utils/dateHelpers';
import { EventHovercard } from '../EventHovercard';
import { EventTriggerButton } from '../EventTriggerButton';

import type { ExpandedEvent, Calendar } from '../../types/Calendar.types';

interface MonthViewProps {
  currentDate: number;
  selectedDate: number | null;
  events: ExpandedEvent[];
  calendars: Calendar[];
  selectedCalendarIds?: string[];
  onDateClick: (date: number) => void;
  onAddEvent?: (date: number) => void;
  onEventClick: (event: ExpandedEvent) => void;
  onEditEvent?: (event: ExpandedEvent) => void;
  onDeleteEvent?: (event: ExpandedEvent) => void;
  onShowAllEvents?: (date: number) => void;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({
  currentDate,
  selectedDate,
  events,
  calendars,
  selectedCalendarIds,
  onDateClick,
  onAddEvent,
  onEventClick,
  onEditEvent,
  onDeleteEvent,
  onShowAllEvents,
  weekStartsOn = 0,
}: MonthViewProps): JSX.Element {
  const weeks: Date[][] = getMonthViewWeeks(currentDate, weekStartsOn);
  const currentMonth = new Date(currentDate);

  // Reorder weekday labels based on weekStartsOn
  const orderedWeekdays = [
    ...WEEKDAY_LABELS.slice(weekStartsOn),
    ...WEEKDAY_LABELS.slice(0, weekStartsOn),
  ];

  // Get events for a specific date
  const getEventsForDate = (date: Date): ExpandedEvent[] => {
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
        const eventStart = startOfDay(new Date(event.start)).getTime();
        const eventEnd = endOfDay(new Date(event.end)).getTime();
        return eventStart <= dayEnd && eventEnd >= dayStart;
      }
      return event.start < dayEnd && event.end > dayStart;
    });
  };

  const getCalendarById = (id: string): Calendar | undefined => {
    return calendars.find((c) => c.id === id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/40 bg-card">
      {/* Weekday headers */}
      <div className="grid shrink-0 grid-cols-7 border-b border-border/40 bg-muted/20">
        {orderedWeekdays.map((day, index) => (
          <div
            key={index}
            className="px-2 py-3 text-center text-sm font-semibold uppercase tracking-wide text-foreground/70"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="inline sm:hidden">{day.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="touch-scroll flex min-h-0 flex-1 flex-col overflow-auto bg-background">
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="grid min-h-[120px] flex-1 grid-cols-7 border-b border-border/30 last:border-b-0"
          >
            {week.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, new Date(selectedDate));
              const isTodayDate = isToday(day);
              const dayEvents = getEventsForDate(day);
              const maxEventsToShow = 2; // Reduced from 3 for better mobile UX
              const hasMoreEvents = dayEvents.length > maxEventsToShow;

              return (
                <ContextMenu key={dayIndex}>
                  <ContextMenuTrigger asChild>
                    <div
                      aria-label={`Select date ${day.toLocaleDateString()}`}
                      className={cn(
                        'group relative h-full w-full cursor-pointer border-r border-border/30 p-2 text-left transition-all duration-150 last:border-r-0 focus:outline-none focus:ring-2 focus:ring-primary/50',
                        !isCurrentMonth && 'bg-muted/10 text-muted-foreground',
                        isSelected && 'bg-primary/10 ring-1 ring-primary/30',
                        'hover:bg-muted/20'
                      )}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onDateClick(day.getTime());
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          onDateClick(day.getTime());
                        }
                      }}
                    >
                      {/* Date number */}
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all',
                            !isCurrentMonth && 'text-muted-foreground/50',
                            isTodayDate &&
                              'bg-primary font-bold text-primary-foreground ring-2 ring-primary/20',
                            isSelected &&
                              !isTodayDate &&
                              'bg-primary/15 font-semibold text-primary',
                            isCurrentMonth && !isTodayDate && !isSelected && 'text-foreground'
                          )}
                        >
                          {format(day, 'd')}
                        </span>

                        {/* Quick add button (shown on hover) */}
                        {onAddEvent && (
                          <button
                            aria-label={`Quick add event on ${day.toLocaleDateString()}`}
                            className="hidden h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all hover:bg-primary/20 group-hover:opacity-100 sm:inline-flex"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddEvent(day.getTime());
                            }}
                          >
                            <svg
                              aria-hidden="true"
                              className="mx-auto h-4 w-4"
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
                          </button>
                        )}
                      </div>

                      {/* Events */}
                      <div className="relative mt-2 space-y-1">
                        {dayEvents.slice(0, maxEventsToShow).map((event) => {
                          const calendar = getCalendarById(event.calendarId);
                          const color = event.color ?? calendar?.color ?? 'blue';
                          const colorClasses = CALENDAR_COLORS[color] ?? CALENDAR_COLORS.blue;
                          return (
                            <ContextMenu key={event.id}>
                              <ContextMenuTrigger asChild>
                                <EventHovercard calendar={calendar} event={event}>
                                  <EventTriggerButton
                                    className={cn(
                                      'w-full break-words rounded-md px-2 py-1.5 text-left text-xs font-medium shadow-sm transition-all hover:ring-2 hover:ring-offset-1 hover:ring-offset-background',
                                      colorClasses.bg,
                                      colorClasses.text,
                                      colorClasses.border,
                                      'border'
                                    )}
                                    onClick={() => {
                                      onEventClick(event);
                                    }}
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      {!event.allDay && (
                                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-90">
                                          {format(new Date(event.start), 'h:mm a')}
                                        </span>
                                      )}
                                      <span className="break-words leading-tight">
                                        {event.title}
                                      </span>
                                    </div>
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
                                        if (
                                          confirm(
                                            `Are you sure you want to delete "${event.title}"?`
                                          )
                                        ) {
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

                        {/* More events indicator */}
                        {hasMoreEvents && (
                          <button
                            aria-label={`Show ${dayEvents.length - maxEventsToShow} more events on ${day.toLocaleDateString()}`}
                            className="w-full rounded-md px-2 py-1 text-left text-xs font-medium text-primary/80 transition-all hover:bg-primary/10 hover:text-primary"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onShowAllEvents) {
                                onShowAllEvents(day.getTime());
                              } else {
                                onDateClick(day.getTime());
                              }
                            }}
                          >
                            +{dayEvents.length - maxEventsToShow} more
                          </button>
                        )}
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {onAddEvent && (
                      <ContextMenuItem
                        onClick={() => {
                          onAddEvent(day.getTime());
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
                    {hasMoreEvents && onShowAllEvents && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => {
                            onShowAllEvents(day.getTime());
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
                            <path d="M4 6h16" />
                            <path d="M4 12h16" />
                            <path d="M4 18h16" />
                          </svg>
                          View all events ({dayEvents.length})
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
