import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useTaskStore } from './task.store';

import type { Task, TaskList } from '../types/Task.types';

const createTaskList = (overrides: Partial<TaskList> = {}): TaskList => ({
  id: 'list-1',
  familyId: 'family-1',
  name: 'Work',
  description: undefined,
  color: 'blue',
  icon: undefined,
  ownerId: 'user-1',
  ownerName: undefined,
  visibility: 'family',
  defaultPermission: 'view',
  sharedWith: [],
  defaultAssigneeId: undefined,
  autoSort: undefined,
  sortBy: undefined,
  sortOrder: undefined,
  totalTasks: 0,
  completedTasks: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  taskListId: 'list-1',
  title: 'Test Task',
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
  ...overrides,
});

describe('task.store', () => {
  beforeEach(() => {
    const { reset } = useTaskStore.getState();
    act(() => {
      reset();
    });
  });

  describe('initial state', () => {
    it('should have empty taskLists array initially', () => {
      const state = useTaskStore.getState();
      expect(state.taskLists).toEqual([]);
    });

    it('should have empty tasks array initially', () => {
      const state = useTaskStore.getState();
      expect(state.tasks).toEqual([]);
    });

    it('should have list view initially', () => {
      const state = useTaskStore.getState();
      expect(state.currentView).toBe('list');
    });

    it('should have null selectedListId initially', () => {
      const state = useTaskStore.getState();
      expect(state.selectedListId).toBeNull();
    });

    it('should have empty selectedListIds initially', () => {
      const state = useTaskStore.getState();
      expect(state.selectedListIds).toEqual([]);
    });
  });

  describe('setters', () => {
    it('should set task lists', () => {
      const taskLists: TaskList[] = [createTaskList()];

      const { setTaskLists } = useTaskStore.getState();
      act(() => {
        setTaskLists(taskLists);
      });

      expect(useTaskStore.getState().taskLists).toEqual(taskLists);
    });

    it('should auto-select all lists when setting task lists and none selected', () => {
      const taskLists: TaskList[] = [
        createTaskList({ id: 'list-1', name: 'Work', color: 'blue' }),
        createTaskList({ id: 'list-2', name: 'Personal', color: 'green' }),
      ];

      const { setTaskLists } = useTaskStore.getState();
      act(() => {
        setTaskLists(taskLists);
      });

      expect(useTaskStore.getState().selectedListIds).toEqual(['list-1', 'list-2']);
    });

    it('should not auto-select when lists already selected', () => {
      const taskLists: TaskList[] = [createTaskList({ id: 'list-1', name: 'Work', color: 'blue' })];

      const { setSelectedListIds, setTaskLists } = useTaskStore.getState();
      act(() => {
        setSelectedListIds(['existing-list']);
        setTaskLists(taskLists);
      });

      expect(useTaskStore.getState().selectedListIds).toEqual(['existing-list']);
    });

    it('should set tasks', () => {
      const tasks: Task[] = [createTask()];

      const { setTasks } = useTaskStore.getState();
      act(() => {
        setTasks(tasks);
      });

      expect(useTaskStore.getState().tasks).toEqual(tasks);
    });

    it('should toggle list visibility', () => {
      const { setSelectedListIds, toggleListVisibility } = useTaskStore.getState();
      act(() => {
        setSelectedListIds(['list-1']);
        toggleListVisibility('list-2');
      });

      expect(useTaskStore.getState().selectedListIds).toEqual(['list-1', 'list-2']);
    });

    it('should remove list from visibility when toggling off', () => {
      const { setSelectedListIds, toggleListVisibility } = useTaskStore.getState();
      act(() => {
        setSelectedListIds(['list-1', 'list-2']);
        toggleListVisibility('list-1');
      });

      expect(useTaskStore.getState().selectedListIds).toEqual(['list-2']);
    });
  });

  describe('filter actions', () => {
    it('should set filter', () => {
      const { setFilter } = useTaskStore.getState();
      act(() => {
        setFilter({ statuses: ['todo', 'in_progress'] });
      });

      const state = useTaskStore.getState();
      expect(state.filter.statuses).toEqual(['todo', 'in_progress']);
    });

    it('should merge filter updates', () => {
      const { setFilter } = useTaskStore.getState();
      act(() => {
        setFilter({ statuses: ['todo'] });
        setFilter({ priorities: ['high'] });
      });

      const state = useTaskStore.getState();
      expect(state.filter.statuses).toEqual(['todo']);
      expect(state.filter.priorities).toEqual(['high']);
    });

    it('should reset filter', () => {
      const { setFilter, resetFilter } = useTaskStore.getState();
      act(() => {
        setFilter({ statuses: ['todo'], priorities: ['high'] });
        resetFilter();
      });

      const state = useTaskStore.getState();
      expect(state.filter.statuses).toBeUndefined();
      expect(state.filter.priorities).toBeUndefined();
    });
  });

  describe('editor actions', () => {
    it('should open editor with task', () => {
      const task: Task = createTask();

      const { openEditor } = useTaskStore.getState();
      act(() => {
        openEditor(task);
      });

      const state = useTaskStore.getState();
      expect(state.isEditorOpen).toBe(true);
      expect(state.editingTask).toEqual(task);
    });

    it('should open editor with default list id', () => {
      const { openEditor } = useTaskStore.getState();
      act(() => {
        openEditor(null, 'list-1');
      });

      const state = useTaskStore.getState();
      expect(state.isEditorOpen).toBe(true);
      expect(state.defaultListId).toBe('list-1');
    });

    it('should close editor', () => {
      const { openEditor, closeEditor } = useTaskStore.getState();
      act(() => {
        openEditor();
        closeEditor();
      });

      const state = useTaskStore.getState();
      expect(state.isEditorOpen).toBe(false);
      expect(state.editingTask).toBeNull();
      expect(state.defaultListId).toBeNull();
    });
  });

  describe('computed helpers', () => {
    it('should get list by id', () => {
      const taskList: TaskList = createTaskList({ id: 'list-1', name: 'Work', color: 'blue' });

      const { setTaskLists, getListById } = useTaskStore.getState();
      act(() => {
        setTaskLists([taskList]);
      });

      const foundList = getListById('list-1');
      expect(foundList).toEqual(taskList);
    });

    it('should get task by id', () => {
      const task: Task = createTask();

      const { setTasks, getTaskById } = useTaskStore.getState();
      act(() => {
        setTasks([task]);
      });

      const foundTask = getTaskById('task-1');
      expect(foundTask).toEqual(task);
    });

    it('should get visible lists', () => {
      const taskLists: TaskList[] = [
        createTaskList({ id: 'list-1', name: 'Work', color: 'blue' }),
        createTaskList({ id: 'list-2', name: 'Personal', color: 'green' }),
      ];

      const { setTaskLists, setSelectedListIds, getVisibleLists } = useTaskStore.getState();
      act(() => {
        setTaskLists(taskLists);
        setSelectedListIds(['list-1']);
      });

      const visibleLists = getVisibleLists();
      expect(visibleLists).toHaveLength(1);
      expect(visibleLists[0]?.id).toBe('list-1');
    });

    it('should get filtered tasks', () => {
      const tasks: Task[] = [
        createTask({ id: 'task-1', title: 'Todo Task', status: 'todo' }),
        createTask({ id: 'task-2', title: 'Done Task', status: 'done', priority: 'high' }),
      ];

      const { setTasks, setSelectedListIds, setFilter, getFilteredTasks } = useTaskStore.getState();
      act(() => {
        setTasks(tasks);
        setSelectedListIds(['list-1']);
        setFilter({ statuses: ['todo'] });
      });

      const filteredTasks = getFilteredTasks();
      expect(filteredTasks).toHaveLength(1);
      expect(filteredTasks[0]?.id).toBe('task-1');
    });

    it('should get tasks for list', () => {
      const tasks: Task[] = [
        createTask({ id: 'task-1', taskListId: 'list-1', title: 'Task 1' }),
        createTask({ id: 'task-2', taskListId: 'list-2', title: 'Task 2' }),
      ];

      const { setTasks, setSelectedListIds, getTasksForList } = useTaskStore.getState();
      act(() => {
        setTasks(tasks);
        setSelectedListIds(['list-1', 'list-2']);
      });

      const listTasks = getTasksForList('list-1');
      expect(listTasks).toHaveLength(1);
      expect(listTasks[0]?.id).toBe('task-1');
    });

    it('should get tasks by status', () => {
      const tasks: Task[] = [
        createTask({ id: 'task-1', title: 'Todo Task', status: 'todo' }),
        createTask({ id: 'task-2', title: 'Done Task', status: 'done' }),
      ];

      const { setTasks, setSelectedListIds, getTasksByStatus } = useTaskStore.getState();
      act(() => {
        setTasks(tasks);
        setSelectedListIds(['list-1']);
      });

      const todoTasks = getTasksByStatus('todo');
      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0]?.id).toBe('task-1');
    });

    it('should get my tasks', () => {
      const tasks: Task[] = [
        createTask({ id: 'task-1', title: 'My Task', assigneeIds: ['user-1'] }),
        createTask({ id: 'task-2', title: 'Other Task', assigneeIds: ['user-2'] }),
      ];

      const { setTasks, setSelectedListIds, getMyTasks } = useTaskStore.getState();
      act(() => {
        setTasks(tasks);
        setSelectedListIds(['list-1']);
      });

      const myTasks = getMyTasks('user-1');
      expect(myTasks).toHaveLength(1);
      expect(myTasks[0]?.id).toBe('task-1');
    });

    it('should get overdue tasks', () => {
      const yesterday = Date.now() - 86400000;
      const tasks: Task[] = [
        createTask({ id: 'task-1', title: 'Overdue Task', dueDate: yesterday }),
        createTask({ id: 'task-2', title: 'Future Task', dueDate: Date.now() + 86400000 }),
      ];

      const { setTasks, setSelectedListIds, getOverdueTasks } = useTaskStore.getState();
      act(() => {
        setTasks(tasks);
        setSelectedListIds(['list-1']);
      });

      const overdueTasks = getOverdueTasks();
      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0]?.id).toBe('task-1');
    });

    it('should get tasks due today', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const tasks: Task[] = [
        createTask({ id: 'task-1', title: 'Today Task', dueDate: todayStart.getTime() }),
        createTask({ id: 'task-2', title: 'Tomorrow Task', dueDate: todayEnd.getTime() + 1000 }),
      ];

      const { setTasks, setSelectedListIds, getTasksDueToday } = useTaskStore.getState();
      act(() => {
        setTasks(tasks);
        setSelectedListIds(['list-1']);
      });

      const todayTasks = getTasksDueToday();
      expect(todayTasks).toHaveLength(1);
      expect(todayTasks[0]?.id).toBe('task-1');
    });
  });

  describe('sorting', () => {
    it('should set sort by field', () => {
      const { setSortBy } = useTaskStore.getState();
      act(() => {
        setSortBy('priority');
      });

      expect(useTaskStore.getState().sortBy).toBe('priority');
    });

    it('should set sort order', () => {
      const { setSortOrder } = useTaskStore.getState();
      act(() => {
        setSortOrder('desc');
      });

      expect(useTaskStore.getState().sortOrder).toBe('desc');
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const taskList: TaskList = createTaskList({ id: 'list-1', name: 'Work', color: 'blue' });

      const { setTaskLists, setCurrentView, setError, openEditor, reset } = useTaskStore.getState();
      act(() => {
        setTaskLists([taskList]);
        setCurrentView('board');
        setError('Error');
        openEditor();
        reset();
      });

      const state = useTaskStore.getState();
      expect(state.taskLists).toEqual([]);
      expect(state.currentView).toBe('list');
      expect(state.error).toBeNull();
      expect(state.isEditorOpen).toBe(false);
    });
  });
});
