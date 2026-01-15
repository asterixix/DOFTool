/**
 * MessageList Component
 * Virtual scrolling list of email messages
 */

import { useRef, useCallback, useMemo } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { CheckCircle2, Circle, Inbox, Mail, MailOpen, Paperclip, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EmptyState, LoadingSpinner } from '@/shared/components';

import type { EmailMessage, EmailThread } from '../types/Email.types';

interface MessageListProps {
  messages: EmailMessage[];
  threads?: EmailThread[];
  selectedMessageId: string | null;
  selectedThreadId: string | null;
  showThreads: boolean;
  onMessageSelect: (messageId: string) => void;
  onThreadSelect: (threadId: string) => void;
  onToggleStar: (messageId: string, starred: boolean) => void;
  onToggleRead: (messageId: string, read: boolean) => void;
  onSelectionChange: (messageIds: string[]) => void;
  selectedIds: string[];
  isLoading: boolean;
  onMoveToFolder?: (messageIds: string[], targetFolder: string) => void;
  folders?: Array<{ path: string; name: string }>;
}

function formatMessageDate(timestamp: number): string {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return format(date, 'h:mm a');
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  if (isThisYear(date)) {
    return format(date, 'MMM d');
  }

  return format(date, 'MM/dd/yy');
}

function MessageRow({
  message,
  isSelected,
  isChecked,
  onSelect,
  onToggleStar,
  onToggleRead,
  onCheckChange,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  message: EmailMessage;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleStar: (starred: boolean) => void;
  onToggleRead: (read: boolean) => void;
  onCheckChange: (checked: boolean) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}): JSX.Element {
  const handleStarClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onToggleStar(!message.starred);
  };

  const handleReadClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onToggleRead(!message.read);
  };

  const handleSelect = (): void => {
    onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    }
  };

  const handleCheckboxKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
    }
  };

  return (
    <div
      draggable
      aria-selected={isSelected}
      className={cn(
        'flex cursor-pointer items-center gap-3 border-b px-4 py-3 transition-colors',
        'hover:bg-accent/30',
        isSelected && 'bg-accent',
        !message.read && 'bg-blue-50/50 dark:bg-blue-950/20',
        isDragging && 'opacity-50'
      )}
      role="option"
      tabIndex={0}
      onClick={handleSelect}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      onKeyDown={handleKeyDown}
    >
      {/* Checkbox */}
      <div
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleCheckboxKeyDown}
      >
        <input
          checked={isChecked}
          className="h-4 w-4 rounded border-gray-300"
          type="checkbox"
          onChange={(e) => onCheckChange(e.target.checked)}
        />
      </div>

      {/* Star */}
      <button className="rounded p-1 hover:bg-accent" onClick={handleStarClick}>
        <Star
          className={cn(
            'h-4 w-4',
            message.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          )}
        />
      </button>

      {/* Read/Unread indicator */}
      <button
        className="rounded p-1 hover:bg-accent"
        title={message.read ? 'Mark as unread' : 'Mark as read'}
        onClick={handleReadClick}
      >
        {message.read ? (
          <MailOpen className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Mail className="h-4 w-4 text-blue-600" />
        )}
      </button>

      {/* Sender */}
      <div className={cn('w-48 truncate', !message.read && 'font-semibold')}>
        {message.from.name ?? message.from.address}
      </div>

      {/* Subject & Snippet */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('truncate', !message.read && 'font-semibold')}>
            {message.subject || '(no subject)'}
          </span>
          {message.attachments.length > 0 && (
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{message.snippet}</p>
      </div>

      {/* Date */}
      <div className={cn('whitespace-nowrap text-sm', !message.read && 'font-semibold')}>
        {formatMessageDate(message.date)}
      </div>
    </div>
  );
}

function ThreadRow({
  thread,
  isSelected,
  isChecked,
  onSelect,
  onCheckChange,
}: {
  thread: EmailThread;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onCheckChange: (checked: boolean) => void;
}): JSX.Element {
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  const handleSelect = (): void => {
    onSelect();
  };

  const handleCheckboxKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
    }
  };

  return (
    <div
      aria-selected={isSelected}
      className={cn(
        'flex cursor-pointer items-center gap-3 border-b px-4 py-3 transition-colors',
        'hover:bg-accent/30',
        isSelected && 'bg-accent',
        thread.unreadCount > 0 && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
      role="option"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {/* Checkbox */}
      <div
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleCheckboxKeyDown}
      >
        <input
          checked={isChecked}
          className="h-4 w-4 rounded border-gray-300"
          type="checkbox"
          onChange={(e) => onCheckChange(e.target.checked)}
        />
      </div>

      {/* Star */}
      <div className="p-1">
        <Star
          className={cn(
            'h-4 w-4',
            thread.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          )}
        />
      </div>

      {/* Unread indicator */}
      <div className="w-6">
        {thread.unreadCount > 0 ? (
          <Circle className="h-3 w-3 fill-blue-600 text-blue-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Message count */}
      <div className="w-8 text-sm text-muted-foreground">
        {thread.messageCount > 1 && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{thread.messageCount}</span>
        )}
      </div>

      {/* Subject & Snippet */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('truncate', thread.unreadCount > 0 && 'font-semibold')}>
            {thread.subject || '(no subject)'}
          </span>
          {thread.hasAttachments && (
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{thread.snippet}</p>
      </div>

      {/* Participant count */}
      {thread.participantCount > 2 && (
        <div className="text-xs text-muted-foreground">{thread.participantCount} people</div>
      )}

      {/* Date */}
      <div className={cn('whitespace-nowrap text-sm', thread.unreadCount > 0 && 'font-semibold')}>
        {formatMessageDate(thread.latestDate)}
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  threads,
  selectedMessageId,
  selectedThreadId,
  showThreads,
  onMessageSelect,
  onThreadSelect,
  onToggleStar,
  onToggleRead,
  onSelectionChange,
  selectedIds,
  isLoading,
}: MessageListProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    if (showThreads && threads) {
      return threads;
    }
    return messages;
  }, [showThreads, threads, messages]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const handleCheckChange = useCallback(
    (id: string, checked: boolean) => {
      if (checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter((i) => i !== id));
      }
    },
    [selectedIds, onSelectionChange]
  );

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Loading messages..." />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <EmptyState
          description="Messages in this folder will appear here."
          icon={Inbox}
          title="No messages"
        />
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];

          // Guard against undefined item
          if (!item) {
            return null;
          }

          if (showThreads && 'messageCount' in item) {
            const thread = item;
            return (
              <div
                key={thread.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ThreadRow
                  isChecked={selectedIds.includes(thread.id)}
                  isSelected={selectedThreadId === thread.id}
                  thread={thread}
                  onCheckChange={(checked) => handleCheckChange(thread.id, checked)}
                  onSelect={() => onThreadSelect(thread.id)}
                />
              </div>
            );
          }

          const message = item as EmailMessage;
          return (
            <div
              key={message.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageRow
                isChecked={selectedIds.includes(message.id)}
                isDragging={false}
                isSelected={selectedMessageId === message.id}
                message={message}
                onCheckChange={(checked) => handleCheckChange(message.id, checked)}
                onDragEnd={() => {}}
                onDragStart={() => {}}
                onSelect={() => onMessageSelect(message.id)}
                onToggleRead={(read) => onToggleRead(message.id, read)}
                onToggleStar={(starred) => onToggleStar(message.id, starred)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
