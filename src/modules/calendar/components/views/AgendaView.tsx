/**
 * AgendaView - List of upcoming events
 */

import { format, isToday, isTomorrow, isThisWeek, startOfDay } from 'date-fns';

import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

import { EventCard } from '../EventCard';
import { EventContextMenu } from '../EventContextMenu';

import type { ExpandedEvent, Calendar } from '../../types/Calendar.types';

interface AgendaViewProps {
  events: ExpandedEvent[];
  calendars: Calendar[];
  selectedCalendarIds?: string[];
  onEventClick: (event: ExpandedEvent) => void;
  onEditEvent?: (event: ExpandedEvent) => void;
  onDeleteEvent?: (event: ExpandedEvent) => void;
}

interface EventGroup {
  date: Date;
  label: string;
  events: ExpandedEvent[];
}

export function AgendaView({
  events,
  calendars,
  selectedCalendarIds,
  onEventClick,
  onEditEvent,
  onDeleteEvent,
}: AgendaViewProps): JSX.Element {
  // Ensure events have expected runtime types to satisfy the linter/type-checks.
  function isValidEvent(e: unknown): e is ExpandedEvent {
    if (e === null || typeof e !== 'object') {
      return false;
    }

    const obj = e as Record<string, unknown>;

    return (
      typeof obj['id'] === 'string' &&
      typeof obj['calendarId'] === 'string' &&
      typeof obj['start'] === 'number'
    );
  }

  // Filter out any malformed items first, then apply selectedCalendarIds if provided (even if empty).
  const safeEvents: ExpandedEvent[] = events.filter(isValidEvent);

  const filteredEvents: ExpandedEvent[] =
    selectedCalendarIds !== undefined
      ? // Filter by selected calendar IDs
        safeEvents.filter((event: ExpandedEvent) => selectedCalendarIds.includes(event.calendarId))
      : safeEvents;

  // Sort events by start time
  const sortedEvents: ExpandedEvent[] = filteredEvents
    .slice()
    .sort((a: ExpandedEvent, b: ExpandedEvent) => {
      // start is a number (Unix timestamp), so we can directly compare them
      return a.start - b.start;
    });

  // Group events by date
  const groupedEvents: EventGroup[] = [];
  let currentGroup: EventGroup | null = null;

  for (const event of sortedEvents) {
    const eventDate = startOfDay(new Date(event.start));
    const eventDateTime = eventDate.getTime();

    if (currentGroup?.date.getTime() !== eventDateTime) {
      currentGroup = {
        date: eventDate,
        label: getDateLabel(eventDate),
        events: [],
      };
      groupedEvents.push(currentGroup);
    }

    if (currentGroup) {
      currentGroup.events.push(event);
    }
  }

  const getCalendarById = (id: string): Calendar | undefined => {
    return calendars.find((c) => c.id === id);
  };

  if (groupedEvents.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border p-8">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground/50"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold">No upcoming events</h3>
          <p className="mt-2 text-sm text-muted-foreground">Events you create will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="touch-scroll flex min-h-0 flex-1 flex-col overflow-auto rounded-lg border">
      <div className="divide-y">
        {groupedEvents.map((group: EventGroup) => (
          <div key={group.date.getTime()} className="p-4">
            {/* Date header */}
            <div className="mb-3 flex items-center gap-3">
              <div
                className={cn(
                  'flex h-12 w-12 flex-col items-center justify-center rounded-lg',
                  isToday(group.date) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <span className="text-xs font-medium">{format(group.date, 'EEE')}</span>
                <span className="text-lg font-bold">{format(group.date, 'd')}</span>
              </div>
              <div>
                <h3 className="font-semibold">{group.label}</h3>
                <p className="text-sm text-muted-foreground">{format(group.date, 'MMMM yyyy')}</p>
              </div>
            </div>

            {/* Events list */}
            <div className="space-y-2 pl-[60px]">
              {group.events.map((event) => (
                <ContextMenu key={event.id}>
                  <ContextMenuTrigger asChild>
                    <div>
                      <EventCard
                        calendar={getCalendarById(event.calendarId)}
                        event={event}
                        variant="detailed"
                        onClick={() => onEventClick(event)}
                      />
                    </div>
                  </ContextMenuTrigger>
                  <EventContextMenu
                    event={event}
                    onDeleteEvent={onDeleteEvent}
                    onEditEvent={onEditEvent}
                    onEventClick={onEventClick}
                  />
                </ContextMenu>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getDateLabel(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }
  if (isTomorrow(date)) {
    return 'Tomorrow';
  }
  if (isThisWeek(date)) {
    return format(date, 'EEEE');
  }
  return format(date, 'EEEE, MMMM d');
}
