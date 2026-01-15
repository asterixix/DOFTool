/**
 * TaskListView - List view for tasks with sorting and filtering
 */

import { CheckSquare } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/shared/components';

import { TaskItem } from './TaskItem';

import type { Task, TaskList, TaskSortField } from '../types/Task.types';

interface TaskListViewProps {
  tasks: Task[];
  taskLists: TaskList[];
  sort: { field: TaskSortField; order: 'asc' | 'desc' } | undefined;
  searchQuery: string;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (task: Task, completed: boolean) => void;
  onTaskDelete: (taskId: string) => Promise<void>;
  onSortChange: (sort: { field: TaskSortField; order: 'asc' | 'desc' }) => void;
  onSearchChange: (query: string) => void;
  onCreateTask: () => void;
}

export function TaskListView({
  tasks,
  taskLists,
  sort,
  searchQuery,
  onTaskClick,
  onTaskComplete,
  onTaskDelete,
  onSortChange,
  onSearchChange,
  onCreateTask,
}: TaskListViewProps): JSX.Element {
  const handleDeleteTask = async (taskId: string): Promise<void> => {
    await onTaskDelete(taskId);
  };
  const getListById = (listId: string): TaskList | undefined => {
    return taskLists.find((list) => list.id === listId);
  };

  const handleSortChange = (value: string): void => {
    const parts = value.split(':');
    if (parts.length === 2) {
      const field = parts[0] as TaskSortField;
      const order = parts[1];
      if (order === 'asc' || order === 'desc') {
        onSortChange({ field, order });
      }
    }
  };

  // Extract sort fields with safe defaults
  const sortField: TaskSortField = sort?.field ?? 'position';
  const sortOrder: 'asc' | 'desc' = sort?.order ?? 'asc';

  const sortedTasks = [...tasks].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'title': {
        comparison = a.title.localeCompare(b.title);
        break;
      }
      case 'dueDate': {
        comparison = (a.dueDate ?? 0) - (b.dueDate ?? 0);
        break;
      }
      case 'priority': {
        const priorityOrder: Record<string, number> = {
          urgent: 5,
          high: 4,
          medium: 3,
          low: 2,
          none: 1,
        };
        comparison = (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0);
        break;
      }
      case 'status': {
        comparison = a.status.localeCompare(b.status);
        break;
      }
      case 'createdAt': {
        comparison = a.createdAt - b.createdAt;
        break;
      }
      case 'updatedAt': {
        comparison = a.updatedAt - b.updatedAt;
        break;
      }
      case 'position': {
        comparison = a.position - b.position;
        break;
      }
      default: {
        comparison = a.position - b.position;
      }
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border/40 bg-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border/40 bg-muted/20 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <Input
            className="w-full"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Select value={`${sortField}:${sortOrder}`} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="position:asc">Position</SelectItem>
            <SelectItem value="title:asc">Title (A-Z)</SelectItem>
            <SelectItem value="title:desc">Title (Z-A)</SelectItem>
            <SelectItem value="dueDate:asc">Due Date (Earliest)</SelectItem>
            <SelectItem value="dueDate:desc">Due Date (Latest)</SelectItem>
            <SelectItem value="priority:desc">Priority (High to Low)</SelectItem>
            <SelectItem value="priority:asc">Priority (Low to High)</SelectItem>
            <SelectItem value="status:asc">Status</SelectItem>
            <SelectItem value="createdAt:desc">Created (Newest)</SelectItem>
            <SelectItem value="createdAt:asc">Created (Oldest)</SelectItem>
            <SelectItem value="updatedAt:desc">Updated (Recent)</SelectItem>
            <SelectItem value="updatedAt:asc">Updated (Oldest)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      <div className="touch-scroll flex-1 overflow-auto p-3 sm:p-4" data-task-container="list">
        {tasks.length === 0 ? (
          <EmptyState
            description={
              searchQuery
                ? 'Try adjusting your search or filters.'
                : 'Create your first task to get started.'
            }
            icon={CheckSquare}
            title="No tasks found"
            {...(!searchQuery && { actionLabel: 'Create Task', onAction: onCreateTask })}
          />
        ) : (
          // List view (simple or grouped by status if needed)
          <div className="space-y-2">
            {sortedTasks.map((task) => {
              const list = getListById(task.taskListId);
              return (
                <TaskItem
                  key={task.id}
                  list={list}
                  task={task}
                  variant="compact"
                  onClick={() => onTaskClick(task)}
                  onComplete={(completed) => onTaskComplete(task, completed)}
                  onDelete={() => {
                    void handleDeleteTask(task.id);
                  }}
                  onEdit={() => onTaskClick(task)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
