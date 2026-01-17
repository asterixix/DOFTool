/**
 * EventContextMenu - Reusable context menu for calendar events
 * Used across all calendar views for consistent right-click menu behavior
 */

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

import type { ExpandedEvent } from '../types/Calendar.types';

export interface EventContextMenuProps {
  event: ExpandedEvent;
  onEditEvent?: ((event: ExpandedEvent) => void) | undefined;
  onDeleteEvent?: ((event: ExpandedEvent) => void) | undefined;
  onEventClick?: ((event: ExpandedEvent) => void) | undefined;
}

export function EventContextMenu({
  event,
  onEditEvent,
  onDeleteEvent,
  onEventClick,
}: EventContextMenuProps): JSX.Element {
  const handleEdit = (): void => {
    if (onEditEvent) {
      onEditEvent(event);
    } else if (onEventClick) {
      onEventClick(event);
    }
  };

  const handleDelete = (): void => {
    if (onDeleteEvent && confirm(`Are you sure you want to delete "${event.title}"?`)) {
      onDeleteEvent(event);
    }
  };

  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={handleEdit}>
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
            onClick={handleDelete}
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
  );
}
