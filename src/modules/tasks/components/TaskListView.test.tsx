/**
 * TaskListView - Unit tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TaskListView } from './TaskListView';

import type { Task, TaskList, TaskSortField } from '../types/Task.types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Mock TaskItem component
vi.mock('./TaskItem', () => ({
  TaskItem: ({ task }: { task: Task }) => (
    <div data-testid={`task-item-${task.id}`}>{task.title}</div>
  ),
}));

// Mock EmptyState component
vi.mock('@/shared/components', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

describe('TaskListView', () => {
  const mockOnTaskClick = vi.fn();
  const mockOnTaskComplete = vi.fn();
  const mockOnTaskDelete = vi.fn().mockResolvedValue(undefined);
  const mockOnSortChange = vi.fn();
  const mockOnSearchChange = vi.fn();
  const mockOnCreateTask = vi.fn();

  const defaultSort: { field: TaskSortField; order: 'asc' | 'desc' } = {
    field: 'position',
    order: 'asc',
  };

  const mockTaskLists: TaskList[] = [
    {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Personal Tasks',
      description: undefined,
      color: 'blue',
      icon: undefined,
      ownerId: 'user-1',
      ownerName: 'John',
      visibility: 'private',
      defaultPermission: 'view',
      sharedWith: [],
      defaultAssigneeId: undefined,
      autoSort: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      totalTasks: 2,
      completedTasks: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const createTask = (id: string, title: string): Task => ({
    id,
    taskListId: 'list-1',
    title,
    description: undefined,
    status: 'todo',
    priority: 'medium',
    assigneeIds: [],
    assignedBy: undefined,
    dueDate: undefined,
    dueTime: undefined,
    startDate: undefined,
    completedAt: undefined,
    completedBy: undefined,
    labels: [],
    tags: [],
    subtasks: [],
    checklist: [],
    dependsOn: [],
    blocks: [],
    estimatedMinutes: undefined,
    actualMinutes: undefined,
    recurrence: undefined,
    location: undefined,
    attachments: [],
    comments: [],
    position: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const mockTasks: Task[] = [
    createTask('task-1', 'First Task'),
    createTask('task-2', 'Second Task'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tasks', () => {
    render(
      <TaskListView
        searchQuery=""
        sort={defaultSort}
        taskLists={mockTaskLists}
        tasks={mockTasks}
        onCreateTask={mockOnCreateTask}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
        onTaskClick={mockOnTaskClick}
        onTaskComplete={mockOnTaskComplete}
        onTaskDelete={mockOnTaskDelete}
      />
    );

    expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument();
  });

  it('should render empty state when no tasks', () => {
    render(
      <TaskListView
        searchQuery=""
        sort={defaultSort}
        taskLists={mockTaskLists}
        tasks={[]}
        onCreateTask={mockOnCreateTask}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
        onTaskClick={mockOnTaskClick}
        onTaskComplete={mockOnTaskComplete}
        onTaskDelete={mockOnTaskDelete}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(
      <TaskListView
        searchQuery=""
        sort={defaultSort}
        taskLists={mockTaskLists}
        tasks={mockTasks}
        onCreateTask={mockOnCreateTask}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
        onTaskClick={mockOnTaskClick}
        onTaskComplete={mockOnTaskComplete}
        onTaskDelete={mockOnTaskDelete}
      />
    );

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('should render all task items', () => {
    render(
      <TaskListView
        searchQuery=""
        sort={defaultSort}
        taskLists={mockTaskLists}
        tasks={mockTasks}
        onCreateTask={mockOnCreateTask}
        onSearchChange={mockOnSearchChange}
        onSortChange={mockOnSortChange}
        onTaskClick={mockOnTaskClick}
        onTaskComplete={mockOnTaskComplete}
        onTaskDelete={mockOnTaskDelete}
      />
    );

    const taskItems = screen.getAllByTestId(/task-item-/);
    expect(taskItems).toHaveLength(2);
  });
});
