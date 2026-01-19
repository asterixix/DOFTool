import { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getTasksAPI } from '@/shared/utils/electronAPI';

import { useTasks } from './useTasks';
import { useTaskStore } from '../stores/task.store';

import type { Task, TaskList } from '../types/Task.types';

// Mock dependencies
vi.mock('@/shared/utils/electronAPI', () => ({
  getTasksAPI: vi.fn(),
}));

vi.mock('../stores/task.store', () => ({
  useTaskStore: vi.fn(),
}));

describe('useTasks', () => {
  const mockGetTasksAPI = getTasksAPI as ReturnType<typeof vi.fn>;
  const mockUseTaskStore = useTaskStore as unknown as ReturnType<typeof vi.fn>;
  const mockTasksAPI = {
    getLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    shareList: vi.fn(),
    updateListShare: vi.fn(),
    unshareList: vi.fn(),
    getListShares: vi.fn(),
    import: vi.fn(),
    export: vi.fn(),
  };

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

  interface MockTaskStore {
    taskLists: TaskList[];
    tasks: Task[];
    currentView: 'list' | 'board' | 'calendar' | 'timeline' | 'my_tasks';
    selectedListId: string | null;
    selectedTaskId: string | null;
    selectedListIds: string[];
    filter: Record<string, unknown>;
    sortBy:
      | 'position'
      | 'title'
      | 'status'
      | 'priority'
      | 'dueDate'
      | 'createdAt'
      | 'updatedAt'
      | 'assignee';
    sortOrder: 'asc' | 'desc';
    isLoadingLists: boolean;
    isLoadingTasks: boolean;
    isSaving: boolean;
    error: string | null;
    isEditorOpen: boolean;
    editingTask: Task | null;
    defaultListId: string | null;
    isShareDialogOpen: boolean;
    sharingList: TaskList | null;
    isImportExportDialogOpen: boolean;
    importExportList: TaskList | null;
    setTaskLists: ReturnType<typeof vi.fn>;
    setTasks: ReturnType<typeof vi.fn>;
    setCurrentView: ReturnType<typeof vi.fn>;
    setSelectedListId: ReturnType<typeof vi.fn>;
    setSelectedTaskId: ReturnType<typeof vi.fn>;
    setSelectedListIds: ReturnType<typeof vi.fn>;
    toggleListVisibility: ReturnType<typeof vi.fn>;
    setFilter: ReturnType<typeof vi.fn>;
    resetFilter: ReturnType<typeof vi.fn>;
    setSortBy: ReturnType<typeof vi.fn>;
    setSortOrder: ReturnType<typeof vi.fn>;
    setLoadingLists: ReturnType<typeof vi.fn>;
    setLoadingTasks: ReturnType<typeof vi.fn>;
    setSaving: ReturnType<typeof vi.fn>;
    setError: ReturnType<typeof vi.fn>;
    openEditor: ReturnType<typeof vi.fn>;
    closeEditor: ReturnType<typeof vi.fn>;
    openShareDialog: ReturnType<typeof vi.fn>;
    closeShareDialog: ReturnType<typeof vi.fn>;
    openImportExportDialog: ReturnType<typeof vi.fn>;
    closeImportExportDialog: ReturnType<typeof vi.fn>;
    getListById: ReturnType<typeof vi.fn>;
    getTaskById: ReturnType<typeof vi.fn>;
    getVisibleLists: ReturnType<typeof vi.fn>;
    getFilteredTasks: ReturnType<typeof vi.fn>;
    getTasksForList: ReturnType<typeof vi.fn>;
    getTasksByStatus: ReturnType<typeof vi.fn>;
    getMyTasks: ReturnType<typeof vi.fn>;
    getOverdueTasks: ReturnType<typeof vi.fn>;
    getTasksDueToday: ReturnType<typeof vi.fn>;
  }

  const mockStore: MockTaskStore = {
    taskLists: [],
    tasks: [],
    currentView: 'list' as const,
    selectedListId: null,
    selectedTaskId: null,
    selectedListIds: [],
    filter: {},
    sortBy: 'position' as const,
    sortOrder: 'asc' as const,
    isLoadingLists: false,
    isLoadingTasks: false,
    isSaving: false,
    error: null,
    isEditorOpen: false,
    editingTask: null,
    defaultListId: null,
    isShareDialogOpen: false,
    sharingList: null,
    isImportExportDialogOpen: false,
    importExportList: null,
    setTaskLists: vi.fn(),
    setTasks: vi.fn(),
    setCurrentView: vi.fn(),
    setSelectedListId: vi.fn(),
    setSelectedTaskId: vi.fn(),
    setSelectedListIds: vi.fn(),
    toggleListVisibility: vi.fn(),
    setFilter: vi.fn(),
    resetFilter: vi.fn(),
    setSortBy: vi.fn(),
    setSortOrder: vi.fn(),
    setLoadingLists: vi.fn(),
    setLoadingTasks: vi.fn(),
    setSaving: vi.fn(),
    setError: vi.fn(),
    openEditor: vi.fn(),
    closeEditor: vi.fn(),
    openShareDialog: vi.fn(),
    closeShareDialog: vi.fn(),
    openImportExportDialog: vi.fn(),
    closeImportExportDialog: vi.fn(),
    getListById: vi.fn(() => undefined),
    getTaskById: vi.fn(() => undefined),
    getVisibleLists: vi.fn(() => []),
    getFilteredTasks: vi.fn(() => []),
    getTasksForList: vi.fn(() => []),
    getTasksByStatus: vi.fn(() => []),
    getMyTasks: vi.fn(() => []),
    getOverdueTasks: vi.fn(() => []),
    getTasksDueToday: vi.fn(() => []),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTasksAPI.mockReturnValue(mockTasksAPI);
    mockUseTaskStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useTasks());

    expect(result.current.taskLists).toEqual([]);
    expect(result.current.tasks).toEqual([]);
    expect(result.current.currentView).toBe('list');
    expect(result.current.isLoadingLists).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load task lists on mount', async () => {
    mockTasksAPI.getLists.mockResolvedValue([]);

    renderHook(() => useTasks());

    await waitFor(() => {
      expect(mockTasksAPI.getLists).toHaveBeenCalled();
    });
  });

  it('should load task lists', async () => {
    const mockLists = [createTaskList({ id: 'list-1', name: 'Work', color: 'blue' })];

    mockTasksAPI.getLists.mockResolvedValue(mockLists);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.loadTaskLists();
    });

    expect(mockTasksAPI.getLists).toHaveBeenCalled();
    expect(mockStore.setLoadingLists).toHaveBeenCalledWith(true);
    expect(mockStore.setTaskLists).toHaveBeenCalled();
    expect(mockStore.setLoadingLists).toHaveBeenCalledWith(false);
  });

  it('should handle load task lists errors', async () => {
    mockTasksAPI.getLists.mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.loadTaskLists();
    });

    // The hook uses err.message directly, so it shows the original error message
    expect(mockStore.setError).toHaveBeenCalledWith('Failed to load');
    expect(mockStore.setLoadingLists).toHaveBeenCalledWith(false);
  });

  it('should load tasks for selected lists', async () => {
    mockStore.selectedListIds = ['list-1'];
    mockTasksAPI.getTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.loadTasks();
    });

    expect(mockTasksAPI.getTasks).toHaveBeenCalledWith('list-1');
    expect(mockStore.setLoadingTasks).toHaveBeenCalledWith(true);
    expect(mockStore.setTasks).toHaveBeenCalled();
    expect(mockStore.setLoadingTasks).toHaveBeenCalledWith(false);
  });

  it('should load tasks for specific list', async () => {
    mockTasksAPI.getTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.loadTasks('list-1');
    });

    expect(mockTasksAPI.getTasks).toHaveBeenCalledWith('list-1');
  });

  it('should return empty tasks when no lists selected', async () => {
    mockStore.selectedListIds = [];

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.loadTasks();
    });

    expect(mockTasksAPI.getTasks).not.toHaveBeenCalled();
    expect(mockStore.setTasks).toHaveBeenCalledWith([]);
  });

  it('should create task list', async () => {
    const input = {
      name: 'New List',
      color: 'blue' as const,
    };

    const mockResult = createTaskList({ id: 'list-1', name: 'New List', color: 'blue' });

    mockTasksAPI.createList.mockResolvedValue(mockResult);
    mockTasksAPI.getLists.mockResolvedValue([mockResult]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      const createdList = await result.current.createTaskList(input);
      expect(createdList).toBeDefined();
    });

    expect(mockTasksAPI.createList).toHaveBeenCalledWith(input);
    expect(mockStore.setSaving).toHaveBeenCalledWith(true);
    expect(mockTasksAPI.getLists).toHaveBeenCalled(); // Reloads lists
    expect(mockStore.setSaving).toHaveBeenCalledWith(false);
  });

  it('should update task list', async () => {
    const input = {
      id: 'list-1',
      name: 'Updated List',
    };

    mockStore.getListById.mockReturnValue({
      id: 'list-1',
      name: 'Updated List',
    });
    mockTasksAPI.getLists.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      const updatedList = await result.current.updateTaskList(input);
      expect(updatedList).toBeDefined();
    });

    expect(mockTasksAPI.getLists).toHaveBeenCalled(); // Reloads lists
    expect(mockStore.setSaving).toHaveBeenCalledWith(false);
  });

  it('should delete task list', async () => {
    mockStore.selectedListId = 'list-1';
    mockStore.selectedListIds = ['list-1'];
    mockTasksAPI.deleteList.mockResolvedValue(undefined);
    mockTasksAPI.getLists.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      const success = await result.current.deleteTaskList('list-1');
      expect(success).toBe(true);
    });

    expect(mockTasksAPI.deleteList).toHaveBeenCalledWith('list-1');
    expect(mockStore.setSelectedListId).toHaveBeenCalledWith(null);
    expect(mockTasksAPI.getLists).toHaveBeenCalled(); // Reloads lists
  });

  it('should create task', async () => {
    const input = {
      taskListId: 'list-1',
      title: 'New Task',
      status: 'todo' as const,
      priority: 'medium' as const,
    };

    mockTasksAPI.createTask.mockResolvedValue(undefined);
    mockTasksAPI.getTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      const createdTask = await result.current.createTask(input);
      expect(createdTask).toBeNull(); // Tasks are reloaded
    });

    expect(mockTasksAPI.createTask).toHaveBeenCalledWith(input);
    expect(mockTasksAPI.getTasks).toHaveBeenCalledWith('list-1');
    expect(mockStore.closeEditor).toHaveBeenCalled();
  });

  it('should update task', async () => {
    const input = {
      id: 'task-1',
      title: 'Updated Task',
    };

    mockTasksAPI.updateTask.mockResolvedValue(undefined);
    mockTasksAPI.getTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      const updatedTask = await result.current.updateTask(input);
      expect(updatedTask).toBeNull(); // Tasks are reloaded
    });

    // The hook destructures id from input, so data passed doesn't include id
    expect(mockTasksAPI.updateTask).toHaveBeenCalledWith('task-1', { title: 'Updated Task' });
    expect(mockTasksAPI.getTasks).toHaveBeenCalled(); // Reloads tasks
    expect(mockStore.closeEditor).toHaveBeenCalled();
  });

  it('should delete task', async () => {
    mockTasksAPI.deleteTask.mockResolvedValue(undefined);
    mockTasksAPI.getTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      const success = await result.current.deleteTask('task-1');
      expect(success).toBe(true);
    });

    expect(mockTasksAPI.deleteTask).toHaveBeenCalledWith('task-1');
    expect(mockTasksAPI.getTasks).toHaveBeenCalled(); // Reloads tasks
  });

  it('should complete task', async () => {
    const task = createTask({ id: 'task-1', taskListId: 'list-1', title: 'Task', status: 'todo' });

    mockStore.getTaskById.mockReturnValue(task);
    mockTasksAPI.updateTask.mockResolvedValue(undefined);
    mockTasksAPI.getTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.completeTask('task-1', true);
    });

    expect(mockTasksAPI.updateTask).toHaveBeenCalledWith('task-1', {
      status: 'done',
    });
  });

  it('should import tasks', async () => {
    // Create a mock file with working text() method
    const mockFileContent = 'test content';
    const file = {
      text: vi.fn().mockResolvedValue(mockFileContent),
      name: 'tasks.csv',
      type: 'text/csv',
    } as unknown as File;
    const mockResult = { imported: 5, errors: [] };

    mockTasksAPI.import.mockResolvedValue(mockResult);
    mockTasksAPI.getLists.mockResolvedValue([]);
    mockTasksAPI.getTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      const result2 = await result.current.importTasks('list-1', file);
      expect(result2.imported).toBe(5);
    });

    expect(mockTasksAPI.import).toHaveBeenCalledWith('list-1', mockFileContent);
  });

  it('should export tasks', async () => {
    mockTasksAPI.export.mockResolvedValue('exported data');

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      const exported = await result.current.exportTasks('list-1');
      expect(exported).toBe('exported data');
    });

    expect(mockTasksAPI.export).toHaveBeenCalledWith('list-1');
  });

  it('should share task list', async () => {
    const mockShare = {
      listId: 'list-1',
      memberId: 'member-1',
      permission: 'view' as const,
      sharedAt: Date.now(),
      sharedBy: 'user-1',
    };

    mockTasksAPI.shareList.mockResolvedValue(mockShare);
    mockTasksAPI.getLists.mockResolvedValue([]);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      const share = await result.current.shareTaskList('list-1', 'member-1', 'view');
      expect(share).toEqual(mockShare);
    });

    expect(mockTasksAPI.shareList).toHaveBeenCalledWith('list-1', 'member-1', 'view');
    expect(mockTasksAPI.getLists).toHaveBeenCalled(); // Reloads lists
  });
});
