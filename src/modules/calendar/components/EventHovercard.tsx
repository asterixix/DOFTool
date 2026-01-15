/**
 * EventHovercard - Displays event details in a hover card
 */

import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Repeat } from 'lucide-react';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hovercard';
import { cn } from '@/lib/utils';

import {
  CALENDAR_COLORS,
  EVENT_CATEGORY_ICONS,
  type ExpandedEvent,
  type Calendar as CalendarType,
} from '../types/Calendar.types';

interface EventHovercardProps {
  event: ExpandedEvent;
  calendar: CalendarType | undefined;
  children: React.ReactElement;
}

export function EventHovercard({ event, calendar, children }: EventHovercardProps): JSX.Element {
  const color = event.color ?? calendar?.color ?? 'blue';
  const colorClasses = CALENDAR_COLORS[color] ?? CALENDAR_COLORS.blue;
  const categoryIcon = event.category ? EVENT_CATEGORY_ICONS[event.category] : '📅';

  return (
    <HoverCard closeDelay={150} openDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', colorClasses.bg)} />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold leading-none">{event.title}</h4>
              {calendar && <p className="mt-1 text-xs text-muted-foreground">{calendar.name}</p>}
            </div>
            {event.category && (
              <span aria-label={event.category} className="shrink-0 text-lg">
                {categoryIcon}
              </span>
            )}
          </div>

          {/* Time */}
          <div className="flex items-start gap-2 text-xs">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              {event.allDay ? (
                <span className="text-foreground">All day</span>
              ) : (
                <div className="space-y-0.5">
                  <div className="text-foreground">
                    {format(new Date(event.start), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-muted-foreground">
                    {format(new Date(event.start), 'h:mm a')} -{' '}
                    {format(new Date(event.end), 'h:mm a')}
                  </div>
                  {format(new Date(event.start), 'EEE, MMM d') !==
                    format(new Date(event.end), 'EEE, MMM d') && (
                    <div className="text-muted-foreground">
                      Ends: {format(new Date(event.end), 'EEEE, MMMM d, yyyy')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-2 text-xs">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-foreground">{event.location}</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="line-clamp-3 text-xs text-muted-foreground">{event.description}</div>
          )}

          {/* Recurrence indicator */}
          {event.isRecurrenceInstance && (
            <div className="flex items-center gap-2 border-t pt-1 text-xs text-muted-foreground">
              <Repeat className="h-3.5 w-3.5 shrink-0" />
              <span>Recurring event</span>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-start gap-2 border-t pt-1 text-xs">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <div className="font-medium text-foreground">Attendees:</div>
                <div className="text-muted-foreground">
                  {event.attendees.map((attendee) => attendee.name).join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
