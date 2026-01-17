/**
 * DateContextMenu - Reusable context menu for calendar date cells and time slots
 * Used across all calendar views for consistent right-click menu behavior on empty dates/times
 */

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

export interface DateContextMenuProps {
  onAddEvent?: ((timestamp: number) => void) | undefined;
  onShowAllEvents?: ((timestamp: number) => void) | undefined;
  timestamp: number;
  eventCount?: number | undefined;
}

export function DateContextMenu({
  onAddEvent,
  onShowAllEvents,
  timestamp,
  eventCount,
}: DateContextMenuProps): JSX.Element {
  return (
    <ContextMenuContent>
      {onAddEvent && (
        <ContextMenuItem
          onClick={() => {
            onAddEvent(timestamp);
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
      {onShowAllEvents && eventCount !== undefined && eventCount > 0 && (
        <>
          {onAddEvent && <ContextMenuSeparator />}
          <ContextMenuItem
            onClick={() => {
              onShowAllEvents(timestamp);
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
            View all events ({eventCount})
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  );
}
