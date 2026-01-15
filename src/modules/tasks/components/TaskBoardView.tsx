/**
 * TaskBoardView - Kanban board view for tasks
 */

import { useState } from 'react';

import { LayoutGrid } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/shared/components';

import { TaskItem } from './TaskItem';

import type { Task, TaskList, TaskStatus } from '../types/Task.types';

interface TaskBoardViewProps {
  tasks: Task[];
  taskLists: TaskList[];
  searchQuery: string;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (task: Task, completed: boolean) => void;
  onTaskDelete: (taskId: string) => Promise<void>;
  onTaskMove: (taskId: string, targetStatus: TaskStatus, position?: number) => Promise<void>;
  onSearchChange: (query: string) => void;
  onCreateTask: () => void;
}

const STATUS_COLUMNS: Array<{
  status: TaskStatus;
  label: string;
  bgColor: string;
  textColor: string;
}> = [
  { status: 'todo', label: 'To Do', bgColor: 'bg-muted', textColor: 'text-foreground' },
  {
    status: 'in_progress',
    label: 'In Progress',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    status: 'blocked',
    label: 'Blocked',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-600 dark:text-red-400',
  },
  {
    status: 'done',
    label: 'Done',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-600 dark:text-green-400',
  },
];

export function TaskBoardView({
  tasks,
  taskLists,
  searchQuery,
  onTaskClick,
  onTaskComplete,
  onTaskDelete,
  onTaskMove,
  onSearchChange,
  onCreateTask,
}: TaskBoardViewProps): JSX.Element {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null);

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    await onTaskDelete(taskId);
  };
  const getListById = (listId: string): TaskList | undefined => {
    return taskLists.find((list) => list.id === listId);
  };

  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDrop = async (status: TaskStatus): Promise<void> => {
    if (!draggingTaskId) {
      return;
    }
    const dropTasks = getTasksByStatus(status);
    await onTaskMove(draggingTaskId, status, dropTasks.length);
    setDraggingTaskId(null);
    setActiveColumn(null);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b p-3 sm:p-4">
        <div className="flex-1">
          <Input
            className="w-full"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Board */}
      <div className="touch-scroll flex flex-1 gap-3 overflow-x-auto p-3 sm:gap-4 sm:p-4">
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              description={
                searchQuery
                  ? 'Try adjusting your search or filters.'
                  : 'Create your first task to get started.'
              }
              icon={LayoutGrid}
              title="No tasks found"
              {...(!searchQuery && { actionLabel: 'Create Task', onAction: onCreateTask })}
            />
          </div>
        ) : (
          STATUS_COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.status);
            return (
              <div
                key={column.status}
                className="flex min-w-[240px] flex-col sm:min-w-[280px]"
                onDragLeave={() => {
                  if (activeColumn === column.status) {
                    setActiveColumn(null);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setActiveColumn(column.status);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleDrop(column.status);
                }}
              >
                {/* Column Header */}
                <div className={`mb-3 rounded-lg ${column.bgColor} px-3 py-2`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-semibold ${column.textColor}`}>{column.label}</h3>
                    <span className={`text-xs font-medium ${column.textColor} opacity-70`}>
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Tasks */}
                <div
                  aria-label={`${column.label} column`}
                  className={cn(
                    'flex-1 space-y-2 overflow-y-auto rounded-lg bg-muted/30 p-2 transition-colors',
                    activeColumn === column.status && 'ring-2 ring-primary/50'
                  )}
                  data-task-container="board"
                >
                  {columnTasks.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No tasks in this column
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        draggable
                        list={getListById(task.taskListId)}
                        task={task}
                        variant="compact"
                        onClick={() => onTaskClick(task)}
                        onComplete={(completed) => onTaskComplete(task, completed)}
                        onDelete={() => {
                          void handleDeleteTask(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggingTaskId(null);
                          setActiveColumn(null);
                        }}
                        onDragStart={(dragTask) => {
                          setDraggingTaskId(dragTask.id);
                          setActiveColumn(column.status);
                        }}
                        onEdit={() => onTaskClick(task)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
