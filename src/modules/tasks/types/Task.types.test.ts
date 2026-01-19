/**
 * Task.types - Unit tests
 * Tests for task type definitions and constants
 */

import { describe, it, expect } from 'vitest';

import { TASK_LIST_COLORS } from './Task.types';

import type {
  BaseEntity,
  Task,
  TaskList,
  TaskListColor,
  TaskListVisibility,
  TaskPermission,
  TaskStatus,
  TaskPriority,
  TaskView,
  TaskSortField,
  TaskFilter,
  CreateTaskInput,
  UpdateTaskInput,
  CreateTaskListInput,
  UpdateTaskListInput,
} from './Task.types';

describe('Task.types', () => {
  describe('TASK_LIST_COLORS', () => {
    it('should contain all expected color keys', () => {
      const expectedColors: TaskListColor[] = [
        'red',
        'orange',
        'amber',
        'yellow',
        'lime',
        'green',
        'emerald',
        'teal',
        'cyan',
        'sky',
        'blue',
        'indigo',
        'violet',
        'purple',
        'fuchsia',
        'pink',
        'rose',
        'slate',
        'gray',
        'zinc',
        'neutral',
        'stone',
      ];

      expect(Object.keys(TASK_LIST_COLORS)).toEqual(expectedColors);
    });

    it('should have bg, text, and border properties for each color', () => {
      for (const [colorName, classes] of Object.entries(TASK_LIST_COLORS)) {
        expect(classes).toHaveProperty('bg');
        expect(classes).toHaveProperty('text');
        expect(classes).toHaveProperty('border');

        expect(classes.bg).toMatch(new RegExp(`^bg-${colorName}-\\d+$`));
        expect(classes.text).toMatch(new RegExp(`^text-${colorName}-\\d+$`));
        expect(classes.border).toMatch(new RegExp(`^border-${colorName}-\\d+$`));
      }
    });

    it('should use consistent shade levels', () => {
      for (const classes of Object.values(TASK_LIST_COLORS)) {
        expect(classes.bg).toContain('-100');
        expect(classes.text).toContain('-700');
        expect(classes.border).toContain('-300');
      }
    });
  });

  describe('type definitions compile correctly', () => {
    it('should allow creating valid BaseEntity', () => {
      const entity: BaseEntity = {
        id: 'test-id',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(entity.id).toBe('test-id');
      expect(typeof entity.createdAt).toBe('number');
      expect(typeof entity.updatedAt).toBe('number');
    });

    it('should allow creating valid TaskList', () => {
      const taskList: TaskList = {
        id: 'list-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        familyId: 'family-1',
        name: 'Shopping',
        description: undefined,
        color: 'blue',
        icon: undefined,
        ownerId: 'user-1',
        ownerName: 'John',
        visibility: 'family',
        defaultPermission: 'edit',
        sharedWith: [],
        defaultAssigneeId: undefined,
        autoSort: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        totalTasks: 5,
        completedTasks: 2,
      };

      expect(taskList.name).toBe('Shopping');
      expect(taskList.color).toBe('blue');
    });

    it('should allow creating valid Task', () => {
      const task: Task = {
        id: 'task-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        taskListId: 'list-1',
        title: 'Buy groceries',
        description: undefined,
        status: 'todo',
        priority: 'medium',
        assigneeIds: ['user-1'],
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
      };

      expect(task.title).toBe('Buy groceries');
      expect(task.status).toBe('todo');
    });

    it('should enforce valid TaskListVisibility values', () => {
      const visibilities: TaskListVisibility[] = ['private', 'family', 'public'];
      expect(visibilities).toHaveLength(3);
    });

    it('should enforce valid TaskPermission values', () => {
      const permissions: TaskPermission[] = ['none', 'view', 'edit', 'admin'];
      expect(permissions).toHaveLength(4);
    });

    it('should enforce valid TaskStatus values', () => {
      const statuses: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'];
      expect(statuses).toHaveLength(5);
    });

    it('should enforce valid TaskPriority values', () => {
      const priorities: TaskPriority[] = ['none', 'low', 'medium', 'high', 'urgent'];
      expect(priorities).toHaveLength(5);
    });

    it('should enforce valid TaskView values', () => {
      const views: TaskView[] = ['list', 'board', 'calendar', 'timeline', 'my_tasks'];
      expect(views).toHaveLength(5);
    });

    it('should enforce valid TaskSortField values', () => {
      const sortFields: TaskSortField[] = [
        'title',
        'status',
        'priority',
        'dueDate',
        'createdAt',
        'updatedAt',
        'position',
        'assignee',
      ];
      expect(sortFields).toHaveLength(8);
    });

    it('should allow creating valid TaskFilter', () => {
      const filter: TaskFilter = {
        listIds: undefined,
        statuses: ['todo', 'in_progress'],
        priorities: ['high', 'urgent'],
        assigneeIds: undefined,
        dueDateFilter: 'this_week',
        customDueDateStart: undefined,
        customDueDateEnd: undefined,
        labelIds: undefined,
        searchQuery: 'groceries',
        hasSubtasks: undefined,
        hasAttachments: undefined,
        hasComments: undefined,
      };

      expect(filter.dueDateFilter).toBe('this_week');
      expect(filter.statuses).toContain('todo');
    });

    it('should allow creating valid CreateTaskInput', () => {
      const input: CreateTaskInput = {
        taskListId: 'list-1',
        title: 'New Task',
        priority: 'high',
      };

      expect(input.title).toBe('New Task');
      expect(input.taskListId).toBe('list-1');
    });

    it('should allow creating valid UpdateTaskInput', () => {
      const input: UpdateTaskInput = {
        id: 'task-1',
        status: 'done',
        priority: 'low',
      };

      expect(input.id).toBe('task-1');
      expect(input.status).toBe('done');
    });

    it('should allow creating valid CreateTaskListInput', () => {
      const input: CreateTaskListInput = {
        name: 'New List',
        color: 'green',
        visibility: 'family',
      };

      expect(input.name).toBe('New List');
    });

    it('should allow creating valid UpdateTaskListInput', () => {
      const input: UpdateTaskListInput = {
        id: 'list-1',
        name: 'Updated List',
        autoSort: true,
        sortBy: 'priority',
        sortOrder: 'desc',
      };

      expect(input.id).toBe('list-1');
      expect(input.sortBy).toBe('priority');
    });
  });
});
