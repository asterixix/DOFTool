/**
 * NotificationCenter - Dropdown notification panel
 *
 * Shows recent notifications with filtering and actions.
 */

import { useState } from 'react';

import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Bell, BellOff, Calendar, CheckSquare, Mail, Settings, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  useNotifications,
  type NotificationHistoryItem,
  type NotificationModule,
} from '@/hooks/useNotifications';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

const moduleIcons: Record<NotificationModule, LucideIcon> = {
  calendar: Calendar,
  tasks: CheckSquare,
  email: Mail,
  family: Users,
  system: Settings,
};

function NotificationItem({
  item,
  index = 0,
}: {
  item: NotificationHistoryItem;
  index?: number;
}): JSX.Element {
  const Icon = moduleIcons[item.module] || Bell;
  const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2 };

  return (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex gap-3 rounded-lg p-3 transition-colors hover:bg-accent/50',
        item.priority === 'urgent' && 'border-l-2 border-l-destructive bg-destructive/5'
      )}
      initial={{ opacity: 0, x: -10 }}
      transition={{ ...transition, delay: shouldReduceMotion ? 0 : index * 0.03 }}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          item.module === 'calendar' &&
            'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
          item.module === 'tasks' &&
            'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
          item.module === 'email' &&
            'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
          item.module === 'family' &&
            'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
          item.module === 'system' &&
            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{item.title}</p>
        {item.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{timeAgo}</p>
      </div>
    </motion.div>
  );
}

export function NotificationCenter(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const { history, preferences, unreadCount, isLoading, clearHistory, togglePaused, markAsViewed } =
    useNotifications();
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2 };

  const handleOpenChange = (open: boolean): void => {
    setIsOpen(open);
    if (open) {
      markAsViewed();
    }
  };

  const handleClear = async (): Promise<void> => {
    await clearHistory();
  };

  const handleTogglePause = async (): Promise<void> => {
    await togglePaused();
  };

  const isPaused = preferences?.paused ?? false;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          className="relative"
          size="icon"
          variant="ghost"
        >
          {isPaused ? (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && !isPaused && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            <Button
              className="h-8 w-8"
              size="icon"
              title={isPaused ? 'Resume notifications' : 'Pause notifications'}
              variant="ghost"
              onClick={handleTogglePause}
            >
              {isPaused ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
            {history.length > 0 && (
              <Button
                className="h-8 w-8 text-destructive hover:text-destructive"
                size="icon"
                title="Clear all notifications"
                variant="ghost"
                onClick={handleClear}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isPaused && (
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
            <BellOff className="h-3 w-3" />
            <span>Notifications are paused</span>
          </div>
        )}

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : history.length === 0 ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
              initial={{ opacity: 0 }}
              transition={transition}
            >
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground/75">You&apos;ll see updates here</p>
            </motion.div>
          ) : (
            <div className="divide-y">
              {history.map((item, index) => (
                <NotificationItem key={item.id} index={index} item={item} />
              ))}
            </div>
          )}
        </ScrollArea>

        {history.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                className="w-full justify-center text-xs"
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
