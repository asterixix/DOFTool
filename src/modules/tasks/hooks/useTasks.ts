/**
 * useTasks Hook - Main hook for task operations
 */

/* eslint-disable @typescript-eslint/no-base-to-string -- API response mapping with fallbacks */

import { useCallback, useEffect, useRef } from 'react';

import { getTasksAPI } from '@/shared/utils/electronAPI';

import { useTaskStore } from '../stores/task.store';

import type {
  Task,
  TaskList,
  TaskView,
  CreateTaskListInput,
  UpdateTaskListInput,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  TaskSortField,
  TaskListColor,
  TaskListShare,
} from '../types/Task.types';

interface UseTasksReturn {
  // State
  taskLists: TaskList[];
  tasks: Task[];
  currentView: TaskView;
  selectedListId: string | null;
  selectedTaskId: string | null;
  selectedListIds: string[];
  filter: TaskFilter;
  sortBy: TaskSortField;
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

  // Computed
  visibleLists: TaskList[];
  filteredTasks: Task[];

  // List actions
  loadTaskLists: () => Promise<void>;
  createTaskList: (input: CreateTaskListInput) => Promise<TaskList | null>;
  updateTaskList: (input: UpdateTaskListInput) => Promise<TaskList | null>;
  deleteTaskList: (listId: string) => Promise<boolean>;
  toggleListVisibility: (listId: string) => void;

  // Task actions
  loadTasks: (listId?: string) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task | null>;
  updateTask: (input: UpdateTaskInput) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  completeTask: (taskId: string, completed: boolean) => Promise<void>;
  moveTask: (
    taskId: string,
    targetListId: string,
    targetStatus: Task['status'],
    position?: number
  ) => Promise<void>;

  // View actions
  setView: (view: TaskView) => void;
  setSelectedListId: (listId: string | null) => void;
  setSelectedTaskId: (taskId: string | null) => void;

  // Filter & Sort actions
  setFilter: (filter: Partial<TaskFilter>) => void;
  resetFilter: () => void;
  setSortBy: (field: TaskSortField) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Editor actions
  openTaskEditor: (task?: Task | null, defaultListId?: string | null) => void;
  closeTaskEditor: () => void;

  // Dialog actions
  openShareDialog: (list: TaskList | null) => void;
  closeShareDialog: () => void;
  openImportExportDialog: (list: TaskList | null) => void;
  closeImportExportDialog: () => void;

  // Helpers
  getListById: (id: string) => TaskList | undefined;
  getTaskById: (id: string) => Task | undefined;
  getTasksForList: (listId: string) => Task[];
  getTasksByStatus: (status: Task['status']) => Task[];
  getMyTasks: (memberId: string) => Task[];
  getOverdueTasks: () => Task[];
  getTasksDueToday: () => Task[];
  clearError: () => void;

  // Import/Export
  importTasks: (listId: string, file: File) => Promise<{ imported: number; errors: string[] }>;
  exportTasks: (listId: string) => Promise<string>;

  // Sharing
  shareTaskList: (
    listId: string,
    memberId: string,
    permission: TaskList['defaultPermission']
  ) => Promise<TaskListShare | null>;
  updateTaskListShare: (
    listId: string,
    memberId: string,
    permission: TaskList['defaultPermission']
  ) => Promise<TaskListShare | null>;
  unshareTaskList: (listId: string, memberId: string) => Promise<boolean>;
  getTaskListShares: (listId: string) => Promise<TaskListShare[]>;
}

export function useTasks(): UseTasksReturn {
  // Store selectors
  const taskLists = useTaskStore((state) => state.taskLists);
  const tasks = useTaskStore((state) => state.tasks);
  const currentView = useTaskStore((state) => state.currentView);
  const selectedListId = useTaskStore((state) => state.selectedListId);
  const selectedTaskId = useTaskStore((state) => state.selectedTaskId);
  const selectedListIds = useTaskStore((state) => state.selectedListIds);
  const filter = useTaskStore((state) => state.filter);
  const sortBy = useTaskStore((state) => state.sortBy);
  const sortOrder = useTaskStore((state) => state.sortOrder);
  const isLoadingLists = useTaskStore((state) => state.isLoadingLists);
  const isLoadingTasks = useTaskStore((state) => state.isLoadingTasks);
  const isSaving = useTaskStore((state) => state.isSaving);
  const error = useTaskStore((state) => state.error);
  const isEditorOpen = useTaskStore((state) => state.isEditorOpen);
  const editingTask = useTaskStore((state) => state.editingTask);
  const defaultListId = useTaskStore((state) => state.defaultListId);
  const isShareDialogOpen = useTaskStore((state) => state.isShareDialogOpen);
  const sharingList = useTaskStore((state) => state.sharingList);
  const isImportExportDialogOpen = useTaskStore((state) => state.isImportExportDialogOpen);
  const importExportList = useTaskStore((state) => state.importExportList);

  // Store actions
  const setTaskLists = useTaskStore((state) => state.setTaskLists);
  const setTasks = useTaskStore((state) => state.setTasks);
  const setCurrentView = useTaskStore((state) => state.setCurrentView);
  const storeSetSelectedListId = useTaskStore((state) => state.setSelectedListId);
  const storeSetSelectedTaskId = useTaskStore((state) => state.setSelectedTaskId);
  const storeSetSelectedListIds = useTaskStore((state) => state.setSelectedListIds);
  const storeToggleListVisibility = useTaskStore((state) => state.toggleListVisibility);
  const storeSetFilter = useTaskStore((state) => state.setFilter);
  const resetFilter = useTaskStore((state) => state.resetFilter);
  const storeSetSortBy = useTaskStore((state) => state.setSortBy);
  const storeSetSortOrder = useTaskStore((state) => state.setSortOrder);
  const setLoadingLists = useTaskStore((state) => state.setLoadingLists);
  const setLoadingTasks = useTaskStore((state) => state.setLoadingTasks);
  const setSaving = useTaskStore((state) => state.setSaving);
  const setError = useTaskStore((state) => state.setError);
  const openEditor = useTaskStore((state) => state.openEditor);
  const closeEditor = useTaskStore((state) => state.closeEditor);
  const openShareDialog = useTaskStore((state) => state.openShareDialog);
  const closeShareDialog = useTaskStore((state) => state.closeShareDialog);
  const openImportExportDialog = useTaskStore((state) => state.openImportExportDialog);
  const closeImportExportDialog = useTaskStore((state) => state.closeImportExportDialog);
  const getListById = useTaskStore((state) => state.getListById);
  const getTaskById = useTaskStore((state) => state.getTaskById);
  const getVisibleLists = useTaskStore((state) => state.getVisibleLists);
  const getFilteredTasks = useTaskStore((state) => state.getFilteredTasks);
  const getTasksForList = useTaskStore((state) => state.getTasksForList);
  const getTasksByStatus = useTaskStore((state) => state.getTasksByStatus);
  const getMyTasks = useTaskStore((state) => state.getMyTasks);
  const getOverdueTasks = useTaskStore((state) => state.getOverdueTasks);
  const getTasksDueToday = useTaskStore((state) => state.getTasksDueToday);

  const hasLoadedRef = useRef(false);

  // Load task lists
  const loadTaskLists = useCallback(async () => {
    try {
      setLoadingLists(true);
      setError(null);

      const tasksAPI = getTasksAPI();
      const result = await tasksAPI.getLists();

      // Ensure result is an array
      if (!Array.isArray(result)) {
        console.warn('tasks.getLists() returned non-array result:', result);
        setTaskLists([]);
        return;
      }

      // Map API response to TaskList type
      // TODO: Update when IPC returns proper types
      const lists: TaskList[] = result.map((list: unknown) => {
        const l = list as Record<string, unknown>;
        return {
          id: String(l['id'] ?? ''),
          familyId: String(l['familyId'] ?? ''),
          name: String(l['name'] ?? ''),
          description: l['description'] ? String(l['description']) : undefined,
          color: (l['color'] as TaskListColor) ?? 'blue',
          icon: l['icon'] ? String(l['icon']) : undefined,
          ownerId: String(l['ownerId'] ?? ''),
          ownerName: l['ownerName'] ? String(l['ownerName']) : undefined,
          visibility: (l['visibility'] as TaskList['visibility']) ?? 'family',
          defaultPermission: (l['defaultPermission'] as TaskList['defaultPermission']) ?? 'view',
          sharedWith: (l['sharedWith'] as unknown[]).map((s: unknown) => {
            const share = s as Record<string, unknown>;
            return {
              memberId: String(share['memberId'] ?? ''),
              memberName: share['memberName'] ? String(share['memberName']) : undefined,
              permission: (share['permission'] as TaskList['defaultPermission']) ?? 'view',
              sharedAt: Number(share['sharedAt'] ?? 0),
              sharedBy: String(share['sharedBy'] ?? ''),
            };
          }),
          defaultAssigneeId: l['defaultAssigneeId'] ? String(l['defaultAssigneeId']) : undefined,
          autoSort: l['autoSort'] ? Boolean(l['autoSort']) : undefined,
          sortBy: l['sortBy'] ? (l['sortBy'] as TaskSortField) : undefined,
          sortOrder: l['sortOrder'] ? (l['sortOrder'] as 'asc' | 'desc') : undefined,
          totalTasks: Number(l['totalTasks'] ?? 0),
          completedTasks: Number(l['completedTasks'] ?? 0),
          createdAt: Number(l['createdAt'] ?? Date.now()),
          updatedAt: Number(l['updatedAt'] ?? Date.now()),
        };
      });

      setTaskLists(lists);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load task lists';
      setError(message);
      console.error('Failed to load task lists:', err);
    } finally {
      setLoadingLists(false);
    }
  }, [setLoadingLists, setError, setTaskLists]);

  // Load tasks for selected lists
  const loadTasks = useCallback(
    async (listId?: string) => {
      try {
        setLoadingTasks(true);
        setError(null);

        // If listId provided, load tasks for that list
        // Otherwise, load tasks for all selected lists
        const listIds = listId ? [listId] : selectedListIds;

        if (listIds.length === 0) {
          setTasks([]);
          return;
        }

        // Load tasks for each list and combine
        const allTasks: Task[] = [];
        for (const lid of listIds) {
          const tasksAPI = getTasksAPI();
          const result = await tasksAPI.getTasks(lid);
          // Map API response to Task type
          // TODO: Update when IPC returns proper types
          const listTasks: Task[] = (result).map((task: unknown) => {
            const t = task as Record<string, unknown>;
            return {
              id: String(t['id'] ?? ''),
              taskListId: String(t['taskListId'] ?? ''),
              title: String(t['title'] ?? ''),
              description: t['description'] ? String(t['description']) : undefined,
              status: (t['status'] as Task['status']) ?? 'todo',
              priority: (t['priority'] as Task['priority']) ?? 'medium',
              assigneeIds: (t['assigneeIds'] as string[]) ?? [],
              assignedBy: t['assignedBy'] ? String(t['assignedBy']) : undefined,
              dueDate: t['dueDate'] ? Number(t['dueDate']) : undefined,
              dueTime: t['dueTime'] ? String(t['dueTime']) : undefined,
              startDate: t['startDate'] ? Number(t['startDate']) : undefined,
              completedAt: t['completedAt'] ? Number(t['completedAt']) : undefined,
              completedBy: t['completedBy'] ? String(t['completedBy']) : undefined,
              labels: (t['labels'] as unknown[]).map((label: unknown) => {
                const l = label as Record<string, unknown>;
                return {
                  id: String(l['id'] ?? ''),
                  name: String(l['name'] ?? ''),
                  color: (l['color'] as TaskListColor) ?? 'blue',
                  createdAt: Number(l['createdAt'] ?? Date.now()),
                };
              }),
              tags: (t['tags'] as string[]) ?? [],
              subtasks: (t['subtasks'] as unknown[]).map((subtask: unknown) => {
                const s = subtask as Record<string, unknown>;
                return {
                  id: String(s['id'] ?? ''),
                  taskId: String(s['taskId'] ?? ''),
                  title: String(s['title'] ?? ''),
                  completed: Boolean(s['completed'] ?? false),
                  completedAt: s['completedAt'] ? Number(s['completedAt']) : undefined,
                  position: Number(s['position'] ?? 0),
                  createdAt: Number(s['createdAt'] ?? Date.now()),
                  updatedAt: Number(s['updatedAt'] ?? Date.now()),
                };
              }),
              checklist: (t['checklist'] as unknown[]).map((item: unknown) => {
                const i = item as Record<string, unknown>;
                return {
                  id: String(i['id'] ?? ''),
                  text: String(i['text'] ?? ''),
                  checked: Boolean(i['checked'] ?? false),
                  checkedAt: i['checkedAt'] ? Number(i['checkedAt']) : undefined,
                  position: Number(i['position'] ?? 0),
                };
              }),
              dependsOn: (t['dependsOn'] as string[]) ?? [],
              blocks: (t['blocks'] as string[]) ?? [],
              estimatedMinutes: t['estimatedMinutes'] ? Number(t['estimatedMinutes']) : undefined,
              actualMinutes: t['actualMinutes'] ? Number(t['actualMinutes']) : undefined,
              location: t['location'] ? String(t['location']) : undefined,
              recurrence: t['recurrence']
                ? {
                    frequency:
                      ((t['recurrence'] as Record<string, unknown>)['frequency'] as
                        | 'daily'
                        | 'weekly'
                        | 'monthly'
                        | 'yearly') ?? 'daily',
                    interval: Number((t['recurrence'] as Record<string, unknown>)['interval'] ?? 1),
                    endDate: (t['recurrence'] as Record<string, unknown>)['endDate']
                      ? Number((t['recurrence'] as Record<string, unknown>)['endDate'])
                      : undefined,
                    count: (t['recurrence'] as Record<string, unknown>)['count']
                      ? Number((t['recurrence'] as Record<string, unknown>)['count'])
                      : undefined,
                    daysOfWeek:
                      ((t['recurrence'] as Record<string, unknown>)['daysOfWeek'] as number[]) ??
                      [],
                    dayOfMonth: (t['recurrence'] as Record<string, unknown>)['dayOfMonth']
                      ? Number((t['recurrence'] as Record<string, unknown>)['dayOfMonth'])
                      : undefined,
                    monthOfYear: (t['recurrence'] as Record<string, unknown>)['monthOfYear']
                      ? Number((t['recurrence'] as Record<string, unknown>)['monthOfYear'])
                      : undefined,
                  }
                : undefined,
              attachments: (t['attachments'] as unknown[]).map((attachment: unknown) => {
                const a = attachment as Record<string, unknown>;
                return {
                  id: String(a['id'] ?? ''),
                  name: String(a['name'] ?? ''),
                  url: String(a['url'] ?? ''),
                  size: Number(a['size'] ?? 0),
                  type: String(a['type'] ?? ''),
                  uploadedAt: Number(a['uploadedAt'] ?? Date.now()),
                  uploadedBy: String(a['uploadedBy'] ?? ''),
                };
              }),
              comments: (t['comments'] as unknown[]).map((comment: unknown) => {
                const c = comment as Record<string, unknown>;
                return {
                  id: String(c['id'] ?? ''),
                  taskId: String(c['taskId'] ?? ''),
                  authorId: String(c['authorId'] ?? ''),
                  authorName: c['authorName'] ? String(c['authorName']) : undefined,
                  content: c['content'] ? String(c['content']) : '',
                  edited: Boolean(c['edited'] ?? false),
                  createdAt: Number(c['createdAt'] ?? Date.now()),
                  updatedAt: Number(c['updatedAt'] ?? Date.now()),
                };
              }),
              position: Number(t['position'] ?? 0),
              createdAt: Number(t['createdAt'] ?? Date.now()),
              updatedAt: Number(t['updatedAt'] ?? Date.now()),
            };
          });
          allTasks.push(...listTasks);
        }

        setTasks(allTasks);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load tasks';
        setError(message);
        console.error('Failed to load tasks:', err);
      } finally {
        setLoadingTasks(false);
      }
    },
    [selectedListIds, setLoadingTasks, setError, setTasks]
  );

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (!hasLoadedRef.current) {
      void loadTaskLists();
      hasLoadedRef.current = true;
    }
  }, [loadTaskLists]);

  useEffect(() => {
    if (selectedListIds.length > 0) {
      void loadTasks();
    }
  }, [selectedListIds, loadTasks]);

  // Create task list
  const createTaskList = useCallback(
    async (input: CreateTaskListInput): Promise<TaskList | null> => {
      try {
        setSaving(true);
        setError(null);

        const tasksAPI = getTasksAPI();
        const result = await tasksAPI.createList(input);

        // Map result to TaskList type
        // TODO: Update when IPC returns proper types
        const newList = result as Record<string, unknown>;
        const list: TaskList = {
          id: String(newList['id'] ?? ''),
          familyId: String(newList['familyId'] ?? ''),
          name: String(newList['name'] ?? ''),
          description: newList['description'] ? String(newList['description']) : undefined,
          color: (newList['color'] as TaskList['color']) ?? 'blue',
          icon: newList['icon'] ? String(newList['icon']) : undefined,
          ownerId: String(newList['ownerId'] ?? ''),
          ownerName: newList['ownerName'] ? String(newList['ownerName']) : undefined,
          visibility: (newList['visibility'] as TaskList['visibility']) ?? 'family',
          defaultPermission:
            (newList['defaultPermission'] as TaskList['defaultPermission']) ?? 'view',
          sharedWith: [],
          defaultAssigneeId: undefined,
          autoSort: undefined,
          sortBy: undefined,
          sortOrder: undefined,
          totalTasks: 0,
          completedTasks: 0,
          createdAt: Number(newList['createdAt'] ?? Date.now()),
          updatedAt: Number(newList['updatedAt'] ?? Date.now()),
        };

        await loadTaskLists();
        return list;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create task list';
        setError(message);
        console.error('Failed to create task list:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadTaskLists]
  );

  // Update task list
  const updateTaskList = useCallback(
    async (input: UpdateTaskListInput): Promise<TaskList | null> => {
      try {
        setSaving(true);
        setError(null);

        // TODO: Implement updateList IPC handler
        // const tasksAPI = getTasksAPI();
        // await tasksAPI.updateList(input.id, input);

        await loadTaskLists();
        return getListById(input.id) ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update task list';
        setError(message);
        console.error('Failed to update task list:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadTaskLists, getListById]
  );

  // Delete task list
  const deleteTaskList = useCallback(
    async (listId: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        const tasksAPI = getTasksAPI();
        await tasksAPI.deleteList(listId);

        // If the deleted list was selected, clear selection and tasks
        if (selectedListId === listId) {
          storeSetSelectedListId(null);
        }

        // Remove from visible list filters
        const updatedSelectedListIds = selectedListIds.filter((id) => id !== listId);
        storeSetSelectedListIds(updatedSelectedListIds);

        // Refresh lists and tasks after deletion
        await loadTaskLists();
        if (updatedSelectedListIds.length === 0) {
          setTasks([]);
        } else {
          await loadTasks();
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete task list';
        setError(message);
        console.error('Failed to delete task list:', err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      setSaving,
      setError,
      loadTaskLists,
      selectedListId,
      selectedListIds,
      storeSetSelectedListId,
      storeSetSelectedListIds,
      setTasks,
      loadTasks,
    ]
  );

  // Create task
  const createTask = useCallback(
    async (input: CreateTaskInput): Promise<Task | null> => {
      try {
        setSaving(true);
        setError(null);

        const tasksAPI = getTasksAPI();
        await tasksAPI.createTask(input);

        await loadTasks(input.taskListId);
        closeEditor();

        return null; // Tasks are reloaded
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create task';
        setError(message);
        console.error('Failed to create task:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadTasks, closeEditor]
  );

  // Update task
  const updateTask = useCallback(
    async (input: UpdateTaskInput): Promise<Task | null> => {
      try {
        setSaving(true);
        setError(null);

        const { id, ...data } = input;

        const tasksAPI = getTasksAPI();
        await tasksAPI.updateTask(id, data);

        await loadTasks();
        closeEditor();

        return null; // Tasks are reloaded
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update task';
        setError(message);
        console.error('Failed to update task:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadTasks, closeEditor]
  );

  // Delete task
  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        const tasksAPI = getTasksAPI();
        await tasksAPI.deleteTask(taskId);

        await loadTasks();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete task';
        setError(message);
        console.error('Failed to delete task:', err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadTasks]
  );

  // Complete task
  const completeTask = useCallback(
    async (taskId: string, completed: boolean): Promise<void> => {
      try {
        const task = getTaskById(taskId);
        if (!task) {
          return;
        }

        await updateTask({
          id: taskId,
          status: completed ? 'done' : 'todo',
          // Remove completedAt as it's not in UpdateTaskInput type
          // completedAt: completed ? Date.now() : undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to complete task';
        setError(message);
        console.error('Failed to complete task:', err);
      }
    },
    [getTaskById, updateTask, setError]
  );

  // Move task
  const moveTask = useCallback(
    async (
      taskId: string,
      targetListId: string,
      targetStatus: Task['status'],
      position?: number
    ): Promise<void> => {
      try {
        const task = getTaskById(taskId);
        if (!task) {
          return;
        }

        const tasksInTarget = tasks.filter(
          (t) => t.taskListId === targetListId && t.status === targetStatus
        );
        const nextPosition =
          position ??
          tasksInTarget.reduce((max, t) => (t.position > max ? t.position : max), -1) + 1;

        await updateTask({
          id: taskId,
          taskListId: targetListId,
          status: targetStatus,
          position: nextPosition,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to move task';
        setError(message);
        console.error('Failed to move task:', err);
      }
    },
    [getTaskById, tasks, updateTask, setError]
  );

  // Import/Export (stubs - to be implemented)
  const importTasks = useCallback(
    async (listId: string, file: File): Promise<{ imported: number; errors: string[] }> => {
      try {
        setSaving(true);
        setError(null);

        // Read file content
        const text = await file.text();

        const tasksAPI = getTasksAPI();
        const result = await tasksAPI.import(listId, text);

        await loadTaskLists();
        await loadTasks();

        return {
          imported: result.imported ?? 0,
          errors: result.errors ?? [],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import tasks';
        setError(message);
        console.error('Failed to import tasks:', err);
        return { imported: 0, errors: [message] };
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadTaskLists, loadTasks]
  );

  const exportTasks = useCallback(
    async (listId: string): Promise<string> => {
      try {
        setSaving(true);
        setError(null);

        const tasksAPI = getTasksAPI();
        const result = await tasksAPI.export(listId);

        return result ?? '';
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to export tasks';
        setError(message);
        console.error('Failed to export tasks:', err);
        return '';
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError]
  );

  // Sharing (stubs - to be implemented)
  const shareTaskList = useCallback(
    async (
      listId: string,
      memberId: string,
      permission: TaskList['defaultPermission']
    ): Promise<TaskListShare | null> => {
      try {
        setSaving(true);
        setError(null);

        const tasksAPI = getTasksAPI();
        const result = await tasksAPI.shareList(listId, memberId, permission);

        // Reload task lists to reflect updated sharing info
        await loadTaskLists();

        return result as TaskListShare;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to share task list';
        setError(message);
        console.error('Failed to share task list:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadTaskLists]
  );

  const updateTaskListShare = useCallback(
    async (
      listId: string,
      memberId: string,
      permission: TaskList['defaultPermission']
    ): Promise<TaskListShare | null> => {
      try {
        setSaving(true);
        setError(null);

        const tasksAPI = getTasksAPI();
        const result = await tasksAPI.updateListShare(listId, memberId, permission);

        // Reload task lists to reflect updated sharing info
        await loadTaskLists();

        return result as TaskListShare;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update share';
        setError(message);
        console.error('Failed to update share:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadTaskLists]
  );

  const unshareTaskList = useCallback(
    async (listId: string, memberId: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        const tasksAPI = getTasksAPI();
        await tasksAPI.unshareList(listId, memberId);

        // Reload task lists to reflect updated sharing info
        await loadTaskLists();

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to unshare task list';
        setError(message);
        console.error('Failed to unshare task list:', err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadTaskLists]
  );

  const getTaskListShares = useCallback(
    async (listId: string): Promise<TaskListShare[]> => {
      try {
        const tasksAPI = getTasksAPI();
        const result = await tasksAPI.getListShares(listId);
        return result as TaskListShare[];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get shares';
        setError(message);
        console.error('Failed to get shares:', err);
        return [];
      }
    },
    [setError]
  );

  return {
    // State
    taskLists,
    tasks,
    currentView,
    selectedListId,
    selectedTaskId,
    selectedListIds,
    filter,
    sortBy,
    sortOrder,
    isLoadingLists,
    isLoadingTasks,
    isSaving,
    error,
    isEditorOpen,
    editingTask,
    defaultListId,
    isShareDialogOpen,
    sharingList,
    isImportExportDialogOpen,
    importExportList,

    // Computed
    visibleLists: getVisibleLists(),
    filteredTasks: getFilteredTasks(),

    // List actions
    loadTaskLists,
    createTaskList,
    updateTaskList,
    deleteTaskList,
    toggleListVisibility: storeToggleListVisibility,

    // Task actions
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    moveTask,

    // View actions
    setView: setCurrentView,
    setSelectedListId: storeSetSelectedListId,
    setSelectedTaskId: storeSetSelectedTaskId,

    // Filter & Sort actions
    setFilter: storeSetFilter,
    resetFilter,
    setSortBy: storeSetSortBy,
    setSortOrder: storeSetSortOrder,

    // Editor actions
    openTaskEditor: openEditor,
    closeTaskEditor: closeEditor,

    // Dialog actions
    openShareDialog,
    closeShareDialog,
    openImportExportDialog,
    closeImportExportDialog,

    // Helpers
    getListById,
    getTaskById,
    getTasksForList,
    getTasksByStatus,
    getMyTasks,
    getOverdueTasks,
    getTasksDueToday,
    clearError: () => setError(null),

    // Import/Export
    importTasks,
    exportTasks,

    // Sharing
    shareTaskList,
    updateTaskListShare,
    unshareTaskList,
    getTaskListShares,
  };
}
