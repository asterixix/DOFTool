/**
 * TaskBoardView - Unit tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TaskBoardView } from './TaskBoardView';

import type { Task, TaskList, TaskStatus } from '../types/Task.types';

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
    <div data-status={task.status} data-testid={`task-item-${task.id}`}>
      {task.title}
    </div>
  ),
}));

// Mock EmptyState component
vi.mock('@/shared/components', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('TaskBoardView', () => {
  const mockOnTaskClick = vi.fn();
  const mockOnTaskComplete = vi.fn();
  const mockOnTaskDelete = vi.fn().mockResolvedValue(undefined);
  const mockOnTaskMove = vi.fn().mockResolvedValue(undefined);
  const mockOnSearchChange = vi.fn();
  const mockOnCreateTask = vi.fn();

  const mockTaskLists: TaskList[] = [
    {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Work Tasks',
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
      totalTasks: 3,
      completedTasks: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const createTask = (id: string, title: string, status: TaskStatus): Task => ({
    id,
    taskListId: 'list-1',
    title,
    description: undefined,
    status,
    priority: 'medium',
    assigneeIds: [],
    assignedBy: undefined,
    dueDate: undefined,
    dueTime: undefined,
    startDate: undefined,
    completedAt: status === 'done' ? Date.now() : undefined,
    completedBy: status === 'done' ? 'user-1' : undefined,
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
    createTask('task-1', 'Todo Task', 'todo'),
    createTask('task-2', 'In Progress Task', 'in_progress'),
    createTask('task-3', 'Done Task', 'done'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the board columns', () => {
    render(
      <TaskBoardView
        searchQuery=""
        taskLists={mockTaskLists}
        tasks={mockTasks}
        onCreateTask={mockOnCreateTask}
        onSearchChange={mockOnSearchChange}
        onTaskClick={mockOnTaskClick}
        onTaskComplete={mockOnTaskComplete}
        onTaskDelete={mockOnTaskDelete}
        onTaskMove={mockOnTaskMove}
      />
    );

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('should render tasks', () => {
    render(
      <TaskBoardView
        searchQuery=""
        taskLists={mockTaskLists}
        tasks={mockTasks}
        onCreateTask={mockOnCreateTask}
        onSearchChange={mockOnSearchChange}
        onTaskClick={mockOnTaskClick}
        onTaskComplete={mockOnTaskComplete}
        onTaskDelete={mockOnTaskDelete}
        onTaskMove={mockOnTaskMove}
      />
    );

    expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument();
    expect(screen.getByTestId('task-item-task-3')).toBeInTheDocument();
  });

  it('should render all task items', () => {
    render(
      <TaskBoardView
        searchQuery=""
        taskLists={mockTaskLists}
        tasks={mockTasks}
        onCreateTask={mockOnCreateTask}
        onSearchChange={mockOnSearchChange}
        onTaskClick={mockOnTaskClick}
        onTaskComplete={mockOnTaskComplete}
        onTaskDelete={mockOnTaskDelete}
        onTaskMove={mockOnTaskMove}
      />
    );

    const taskItems = screen.getAllByTestId(/task-item-/);
    expect(taskItems).toHaveLength(3);
  });

  it('should handle empty tasks array', () => {
    render(
      <TaskBoardView
        searchQuery=""
        taskLists={mockTaskLists}
        tasks={[]}
        onCreateTask={mockOnCreateTask}
        onSearchChange={mockOnSearchChange}
        onTaskClick={mockOnTaskClick}
        onTaskComplete={mockOnTaskComplete}
        onTaskDelete={mockOnTaskDelete}
        onTaskMove={mockOnTaskMove}
      />
    );

    // Should show empty state or columns - just verify it renders without error
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(
      <TaskBoardView
        searchQuery=""
        taskLists={mockTaskLists}
        tasks={mockTasks}
        onCreateTask={mockOnCreateTask}
        onSearchChange={mockOnSearchChange}
        onTaskClick={mockOnTaskClick}
        onTaskComplete={mockOnTaskComplete}
        onTaskDelete={mockOnTaskDelete}
        onTaskMove={mockOnTaskMove}
      />
    );

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});
