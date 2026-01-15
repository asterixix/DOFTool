/**
 * TaskItem - Display component for individual tasks
 */

import { cloneElement, forwardRef, useCallback, useState } from 'react';
import type React from 'react';

import { format } from 'date-fns';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hovercard';
import { cn } from '@/lib/utils';

import { TASK_LIST_COLORS, type Task, type TaskList, type TaskPriority } from '../types/Task.types';

interface TaskItemProps {
  task: Task;
  list: TaskList | undefined;
  variant?: 'compact' | 'default' | 'detailed';
  onClick?: () => void;
  onComplete?: (completed: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  enableHoverCard?: boolean;
  draggable?: boolean;
  onDragStart?: (task: Task) => void;
  onDragEnd?: () => void;
  className?: string;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  none: { label: 'None', color: 'text-muted-foreground', icon: '○' },
  low: { label: 'Low', color: 'text-blue-500', icon: '↓' },
  medium: { label: 'Medium', color: 'text-yellow-500', icon: '→' },
  high: { label: 'High', color: 'text-orange-500', icon: '↑' },
  urgent: { label: 'Urgent', color: 'text-red-500', icon: '↑↑' },
};

function isToday(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

interface ContextMenuWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactElement<React.ComponentPropsWithRef<'div'>>;
  onEdit: (() => void) | undefined;
  onDelete: (() => void) | undefined;
  onComplete: ((completed: boolean) => void) | undefined;
  task: Task;
}

const ContextMenuWrapper = forwardRef<HTMLDivElement, ContextMenuWrapperProps>(
  ({ children, onEdit, onDelete, onComplete, task, ...triggerProps }, ref) => {
    const mergedProps: React.ComponentPropsWithRef<'div'> = {
      ...(triggerProps as React.ComponentPropsWithRef<'div'>),
      ref,
    };

    const child = cloneElement(children, mergedProps);

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{child}</ContextMenuTrigger>
        <ContextMenuContent>
          {onEdit && (
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
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
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit task
            </ContextMenuItem>
          )}
          {onComplete && (
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task.status !== 'done');
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
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              {task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
                    onDelete();
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
                >
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
                </svg>
                Delete task
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

export const TaskItem = forwardRef<HTMLDivElement, TaskItemProps>(
  (
    {
      task,
      list,
      variant = 'default',
      onClick,
      onComplete,
      onEdit,
      onDelete,
      enableHoverCard = true,
      draggable = false,
      onDragStart,
      onDragEnd,
      className,
    },
    ref
  ) => {
    const [hoverOpen, setHoverOpen] = useState(false);

    const moveFocus = useCallback(
      (direction: 'prev' | 'next') => {
        const host = (ref as React.RefObject<HTMLDivElement>)?.current ?? null;
        const container = host?.closest('[data-task-container]') ?? document;
        const items = Array.from(container.querySelectorAll<HTMLElement>('[data-task-item]'));
        const currentIndex = host ? items.findIndex((el) => el === host) : -1;
        if (currentIndex === -1) {
          return;
        }
        const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        const target = items[targetIndex];
        if (target) {
          target.focus();
        }
      },
      [ref]
    );

    const color = list?.color ?? 'blue';
    const colorClasses = TASK_LIST_COLORS[color] ?? TASK_LIST_COLORS.blue;
    const priorityConfig = PRIORITY_CONFIG[task.priority];

    const isOverdue =
      task.dueDate && task.status !== 'done' && task.dueDate < Date.now() && !isToday(task.dueDate);
    const isDueToday = task.dueDate && isToday(task.dueDate) && task.status !== 'done';

    const hoverContent = (
      <div className="space-y-3 text-sm">
        <div className="font-semibold leading-tight">{task.title}</div>
        {task.description && (
          <p className="line-clamp-3 text-muted-foreground">{task.description}</p>
        )}

        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-3">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Due</span>
                <span>
                  {format(task.dueDate, 'PP')}
                  {task.dueTime ? ` ${task.dueTime}` : ''}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-medium">Status</span>
              <span>{task.status.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Priority</span>
              <span className={priorityConfig.color}>{priorityConfig.label}</span>
            </div>
            {list && (
              <div className="flex items-center gap-1">
                <span className="font-medium">List</span>
                <span>{list.name}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {task.subtasks.length > 0 && (
              <span>
                Subtasks {task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length}
              </span>
            )}
            {task.checklist.length > 0 && (
              <span>
                Checklist {task.checklist.filter((item) => item.checked).length}/
                {task.checklist.length}
              </span>
            )}
            {task.labels.length > 0 && <span>Labels {task.labels.length}</span>}
            {task.tags.length > 0 && <span>Tags {task.tags.length}</span>}
            {task.assigneeIds.length > 0 && <span>Assignees {task.assigneeIds.length}</span>}
          </div>

          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.labels.slice(0, 6).map((label) => (
                <span
                  key={label.id}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] font-medium',
                    TASK_LIST_COLORS[label.color]?.bg ?? 'bg-gray-100',
                    TASK_LIST_COLORS[label.color]?.text ?? 'text-gray-700'
                  )}
                >
                  {label.name}
                </span>
              ))}
              {task.labels.length > 6 && (
                <span className="text-[11px]">+{task.labels.length - 6}</span>
              )}
            </div>
          )}

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 text-[11px]">
              {task.tags.slice(0, 8).map((tag) => (
                <span key={tag} className="rounded bg-muted px-1.5 py-0.5">
                  #{tag}
                </span>
              ))}
              {task.tags.length > 8 && <span>+{task.tags.length - 8}</span>}
            </div>
          )}
        </div>
      </div>
    );

    const wrapWithHover = (node: JSX.Element): JSX.Element => {
      if (!enableHoverCard) {
        return node;
      }
      return (
        <HoverCard closeDelay={80} open={hoverOpen} openDelay={80} onOpenChange={setHoverOpen}>
          <HoverCardTrigger asChild>{node}</HoverCardTrigger>
          <HoverCardContent align="start" className="w-80">
            {hoverContent}
          </HoverCardContent>
        </HoverCard>
      );
    };

    // Compact variant for list views
    if (variant === 'compact') {
      const content = (
        <div
          ref={ref}
          data-task-item
          className={cn(
            'group flex items-center gap-3 rounded-lg border border-border/40 bg-card p-3 shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20 hover:ring-offset-1',
            task.status === 'done' && 'opacity-60',
            className
          )}
          draggable={draggable}
          role="button"
          tabIndex={0}
          onDragEnd={(e) => {
            e.stopPropagation();
            onDragEnd?.();
          }}
          onDragEnter={() => setHoverOpen(true)}
          onDragLeave={() => setHoverOpen(false)}
          onDragOver={() => setHoverOpen(true)}
          onDragStart={(e) => {
            e.stopPropagation();
            if (draggable) {
              onDragStart?.(task);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              onClick?.();
            } else if (e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onComplete?.(task.status !== 'done');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              moveFocus('next');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              moveFocus('prev');
            }
          }}
          onMouseEnter={() => setHoverOpen(true)}
          onMouseLeave={() => setHoverOpen(false)}
        >
          <button
            aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
            className={cn(
              'h-5 w-5 shrink-0 rounded border-2 transition-colors',
              task.status === 'done'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/30 hover:border-primary'
            )}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onComplete?.(task.status !== 'done');
            }}
          >
            {task.status === 'done' && (
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <button
            className="min-w-0 flex-1 text-left"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'truncate',
                  task.status === 'done' && 'text-muted-foreground line-through'
                )}
              >
                {task.title}
              </span>
              {task.priority !== 'none' && (
                <span className={cn('text-xs', priorityConfig.color)} title={priorityConfig.label}>
                  {priorityConfig.icon}
                </span>
              )}
              {task.subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length})
                </span>
              )}
            </div>
            {(task.dueDate !== null || task.labels.length > 0 || task.assigneeIds.length > 0) && (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {task.dueDate && (
                  <span
                    className={cn(
                      isOverdue && 'font-medium text-red-500',
                      isDueToday && 'font-medium text-orange-500'
                    )}
                  >
                    {format(new Date(task.dueDate), 'MMM d')}
                    {task.dueTime && ` ${task.dueTime}`}
                  </span>
                )}
                {task.labels.length > 0 && (
                  <span className="flex gap-1">
                    {task.labels.slice(0, 2).map((label) => (
                      <span
                        key={label.id}
                        className={cn(
                          'rounded px-1.5 py-0.5 text-xs',
                          TASK_LIST_COLORS[label.color]?.bg ?? 'bg-gray-100',
                          TASK_LIST_COLORS[label.color]?.text ?? 'text-gray-700'
                        )}
                      >
                        {label.name}
                      </span>
                    ))}
                    {task.labels.length > 2 && <span>+{task.labels.length - 2}</span>}
                  </span>
                )}
                {task.assigneeIds.length > 0 && (
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {task.assigneeIds.length}
                  </span>
                )}
              </div>
            )}
          </button>
        </div>
      );

      const wrapped = (
        <ContextMenuWrapper task={task} onComplete={onComplete} onDelete={onDelete} onEdit={onEdit}>
          {content}
        </ContextMenuWrapper>
      );

      return wrapWithHover(wrapped);
    }

    // Detailed variant for expanded views
    if (variant === 'detailed') {
      const content = (
        <div
          ref={ref}
          data-task-item
          className={cn(
            'group rounded-lg border p-4 transition-shadow hover:shadow-md',
            colorClasses.border,
            task.status === 'done' && 'opacity-60',
            className
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              onClick?.();
            } else if (e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onComplete?.(task.status !== 'done');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              moveFocus('next');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              moveFocus('prev');
            }
          }}
          onMouseEnter={() => setHoverOpen(true)}
          onMouseLeave={() => setHoverOpen(false)}
        >
          <div className="flex items-start gap-3">
            <button
              aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0 rounded border-2 transition-colors',
                task.status === 'done'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/30 hover:border-primary'
              )}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onComplete?.(task.status !== 'done');
              }}
            >
              {task.status === 'done' && (
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <button
                className="w-full text-left"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4
                      className={cn(
                        'truncate font-medium',
                        task.status === 'done' && 'text-muted-foreground line-through'
                      )}
                    >
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {task.priority !== 'none' && (
                      <span
                        className={cn('text-sm font-medium', priorityConfig.color)}
                        title={priorityConfig.label}
                      >
                        {priorityConfig.icon}
                      </span>
                    )}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        task.status === 'todo' && 'bg-gray-100 text-gray-700',
                        task.status === 'in_progress' && 'bg-blue-100 text-blue-700',
                        task.status === 'blocked' && 'bg-red-100 text-red-700',
                        task.status === 'done' && 'bg-green-100 text-green-700',
                        task.status === 'cancelled' && 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {task.dueDate && (
                    <div
                      className={cn(
                        'flex items-center gap-1',
                        isOverdue && 'font-medium text-red-500',
                        isDueToday && 'font-medium text-orange-500'
                      )}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
                        <line x1="16" x2="16" y1="2" y2="6" />
                        <line x1="8" x2="8" y1="2" y2="6" />
                        <line x1="3" x2="21" y1="10" y2="10" />
                      </svg>
                      <span>
                        {format(new Date(task.dueDate), 'MMM d, yyyy')}
                        {task.dueTime && ` at ${task.dueTime}`}
                      </span>
                    </div>
                  )}

                  {task.assigneeIds.length > 0 && (
                    <div className="flex items-center gap-1">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>
                        {task.assigneeIds.length} assignee{task.assigneeIds.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {task.subtasks.length > 0 && (
                    <div className="flex items-center gap-1">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      <span>
                        {task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length}{' '}
                        subtasks
                      </span>
                    </div>
                  )}

                  {task.checklist.length > 0 && (
                    <div className="flex items-center gap-1">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                      </svg>
                      <span>
                        {task.checklist.filter((item) => item.checked).length}/
                        {task.checklist.length} checklist
                      </span>
                    </div>
                  )}

                  {task.location && (
                    <div className="flex items-center gap-1">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="truncate">{task.location}</span>
                    </div>
                  )}
                </div>

                {task.labels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {task.labels.map((label) => (
                      <span
                        key={label.id}
                        className={cn(
                          'rounded px-2 py-0.5 text-xs font-medium',
                          TASK_LIST_COLORS[label.color]?.bg ?? 'bg-gray-100',
                          TASK_LIST_COLORS[label.color]?.text ?? 'text-gray-700'
                        )}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      );

      const wrapped = (
        <ContextMenuWrapper task={task} onComplete={onComplete} onDelete={onDelete} onEdit={onEdit}>
          {content}
        </ContextMenuWrapper>
      );

      return wrapWithHover(wrapped);
    }

    // Default variant - similar to compact but with more details
    const content = (
      <div
        ref={ref}
        data-task-item
        className={cn(
          'group flex items-center gap-3 rounded-lg border p-3 transition-shadow hover:shadow-sm',
          colorClasses.border,
          task.status === 'done' && 'opacity-60',
          className
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onClick?.();
          } else if (e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onComplete?.(task.status !== 'done');
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            moveFocus('next');
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            moveFocus('prev');
          }
        }}
        onMouseEnter={() => setHoverOpen(true)}
        onMouseLeave={() => setHoverOpen(false)}
      >
        <button
          aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
          className={cn(
            'h-5 w-5 shrink-0 rounded border-2 transition-colors',
            task.status === 'done'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30 hover:border-primary'
          )}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onComplete?.(task.status !== 'done');
          }}
        >
          {task.status === 'done' && (
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'truncate font-medium',
                task.status === 'done' && 'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </span>
            {task.priority !== 'none' && (
              <span
                className={cn('text-xs font-medium', priorityConfig.color)}
                title={priorityConfig.label}
              >
                {priorityConfig.icon}
              </span>
            )}
          </div>
          {(task.description ?? task.dueDate ?? task.labels.length > 0) && (
            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
              {task.description && <p className="line-clamp-1">{task.description}</p>}
              {task.dueDate && (
                <p
                  className={cn(
                    'text-xs',
                    isOverdue && 'font-medium text-red-500',
                    isDueToday && 'font-medium text-orange-500'
                  )}
                >
                  Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                  {task.dueTime && ` at ${task.dueTime}`}
                </p>
              )}
              {task.labels.length > 0 && (
                <div className="flex gap-1">
                  {task.labels.slice(0, 3).map((label) => (
                    <span
                      key={label.id}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs',
                        TASK_LIST_COLORS[label.color]?.bg ?? 'bg-gray-100',
                        TASK_LIST_COLORS[label.color]?.text ?? 'text-gray-700'
                      )}
                    >
                      {label.name}
                    </span>
                  ))}
                  {task.labels.length > 3 && (
                    <span className="text-xs">+{task.labels.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </button>
      </div>
    );

    const wrapped = (
      <ContextMenuWrapper task={task} onComplete={onComplete} onDelete={onDelete} onEdit={onEdit}>
        {content}
      </ContextMenuWrapper>
    );

    return wrapWithHover(wrapped);
  }
);

TaskItem.displayName = 'TaskItem';
