/**
 * EventCard - Compact event display for calendar views
 */

import { forwardRef } from 'react';

import { format } from 'date-fns';

import { cn } from '@/lib/utils';

import { CALENDAR_COLORS, type ExpandedEvent, type Calendar } from '../types/Calendar.types';

interface EventCardProps {
  event: ExpandedEvent;
  calendar: Calendar | undefined;
  variant?: 'compact' | 'default' | 'detailed';
  onClick?: () => void;
  className?: string;
}

export const EventCard = forwardRef<HTMLButtonElement, EventCardProps>(
  ({ event, calendar, variant = 'default', onClick, className }, ref) => {
    const color = event.color ?? calendar?.color ?? 'blue';
    const colorClasses = CALENDAR_COLORS[color] ?? CALENDAR_COLORS.blue;

    if (variant === 'compact') {
      return (
        <button
          ref={ref}
          className={cn(
            'w-full truncate rounded px-1 py-0.5 text-left text-xs transition-opacity hover:opacity-80',
            colorClasses.bg,
            colorClasses.text,
            className
          )}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          {!event.allDay && (
            <span className="font-medium">{format(new Date(event.start), 'h:mm')}</span>
          )}{' '}
          {event.title}
        </button>
      );
    }

    if (variant === 'detailed') {
      return (
        <button
          ref={ref}
          className={cn(
            'w-full rounded-lg border p-3 text-left transition-shadow hover:shadow-md',
            colorClasses.border,
            className
          )}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="flex items-start gap-3">
            <div className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', colorClasses.bg)} />
            <div className="min-w-0 flex-1 overflow-hidden">
              <h4 className="break-words font-medium">{event.title}</h4>
              <p className="text-sm text-muted-foreground">
                {event.allDay ? (
                  'All day'
                ) : (
                  <>
                    {format(new Date(event.start), 'h:mm a')} -{' '}
                    {format(new Date(event.end), 'h:mm a')}
                  </>
                )}
              </p>
              {event.location && (
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  📍 {event.location}
                </p>
              )}
              {event.description && (
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {event.description}
                </p>
              )}
              {event.isRecurrenceInstance && (
                <p className="mt-1 text-xs text-muted-foreground">🔄 Recurring event</p>
              )}
            </div>
          </div>
        </button>
      );
    }

    // Default variant
    return (
      <button
        ref={ref}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50',
          colorClasses.border,
          'border-l-2',
          className
        )}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{event.title}</span>
            {event.isRecurrenceInstance && <span className="text-xs">🔄</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            {event.allDay ? (
              'All day'
            ) : (
              <>
                {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
              </>
            )}
          </p>
        </div>
      </button>
    );
  }
);
EventCard.displayName = 'EventCard';
