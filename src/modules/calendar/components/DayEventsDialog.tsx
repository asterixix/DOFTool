/**
 * DayEventsDialog - Shows all events for a specific day
 */

import { format, startOfDay, endOfDay } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { EventHovercard } from './EventHovercard';
import { EventTriggerButton } from './EventTriggerButton';
import { CALENDAR_COLORS } from '../types/Calendar.types';

import type { ExpandedEvent, Calendar } from '../types/Calendar.types';

interface DayEventsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: number;
  events: ExpandedEvent[];
  calendars: Calendar[];
  onEventClick: (event: ExpandedEvent) => void;
  onAddEvent?: (date: number) => void;
}

export function DayEventsDialog({
  isOpen,
  onClose,
  date,
  events,
  calendars,
  onEventClick,
  onAddEvent,
}: DayEventsDialogProps): JSX.Element {
  const dayStart = startOfDay(new Date(date)).getTime();
  const dayEnd = endOfDay(new Date(date)).getTime();

  // Filter events for this day
  const dayEvents = events.filter((event) => {
    if (event.allDay) {
      const eventStart = startOfDay(new Date(event.start)).getTime();
      const eventEnd = endOfDay(new Date(event.end)).getTime();
      return eventStart <= dayEnd && eventEnd >= dayStart;
    }
    return event.start < dayEnd && event.end > dayStart;
  });

  // Separate all-day and timed events
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay).sort((a, b) => a.start - b.start);

  const getCalendarById = (id: string): Calendar | undefined => {
    return calendars.find((c) => c.id === id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{format(new Date(date), 'EEEE, MMMM d, yyyy')}</DialogTitle>
          <DialogDescription>
            {dayEvents.length === 0
              ? 'No events scheduled for this day'
              : `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'} scheduled`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">All-day events</h3>
              <div className="space-y-2">
                {allDayEvents.map((event) => {
                  const calendar = getCalendarById(event.calendarId);
                  const color = event.color ?? calendar?.color ?? 'blue';
                  const colorClasses = CALENDAR_COLORS[color] ?? CALENDAR_COLORS.blue;

                  return (
                    <EventHovercard key={event.id} calendar={calendar} event={event}>
                      <EventTriggerButton
                        className={cn(
                          'w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50',
                          colorClasses.border,
                          'border-l-4'
                        )}
                        onClick={() => {
                          onEventClick(event);
                          onClose();
                        }}
                      >
                        <div className="font-medium">{event.title}</div>
                        {calendar && (
                          <div className="text-xs text-muted-foreground">{calendar.name}</div>
                        )}
                      </EventTriggerButton>
                    </EventHovercard>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timed events */}
          {timedEvents.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Timed events</h3>
              <div className="space-y-2">
                {timedEvents.map((event) => {
                  const calendar = getCalendarById(event.calendarId);
                  const color = event.color ?? calendar?.color ?? 'blue';
                  const colorClasses = CALENDAR_COLORS[color] ?? CALENDAR_COLORS.blue;

                  return (
                    <EventHovercard key={event.id} calendar={calendar} event={event}>
                      <EventTriggerButton
                        className={cn(
                          'w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50',
                          colorClasses.border,
                          'border-l-4'
                        )}
                        onClick={() => {
                          onEventClick(event);
                          onClose();
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 font-mono text-xs text-muted-foreground">
                            {format(new Date(event.start), 'h:mm a')} -{' '}
                            {format(new Date(event.end), 'h:mm a')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{event.title}</div>
                            {calendar && (
                              <div className="text-xs text-muted-foreground">{calendar.name}</div>
                            )}
                            {event.location && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                📍 {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </EventTriggerButton>
                    </EventHovercard>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {dayEvents.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No events scheduled for this day.
              {onAddEvent && (
                <Button
                  className="mt-4"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onAddEvent(date);
                    onClose();
                  }}
                >
                  Add event
                </Button>
              )}
            </div>
          )}
        </div>

        {onAddEvent && dayEvents.length > 0 && (
          <div className="flex justify-end border-t pt-4">
            <Button
              size="sm"
              onClick={() => {
                onAddEvent(date);
                onClose();
              }}
            >
              Add event
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
