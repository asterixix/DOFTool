/**
 * Task Store - Zustand state management for tasks module
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { Task, TaskList, TaskView, TaskFilter, TaskSortField } from '../types/Task.types';

interface TaskStore {
  // State
  taskLists: TaskList[];
  tasks: Task[];

  // View state
  currentView: TaskView;
  selectedListId: string | null;
  selectedTaskId: string | null;
  selectedListIds: string[]; // Which lists are visible

  // Filter & Sort state
  filter: TaskFilter;
  sortBy: TaskSortField;
  sortOrder: 'asc' | 'desc';

  // Loading states
  isLoadingLists: boolean;
  isLoadingTasks: boolean;
  isSaving: boolean;

  // Error state
  error: string | null;

  // Editor state
  isEditorOpen: boolean;
  editingTask: Task | null;
  defaultListId: string | null; // Pre-fill list when creating new task

  // Dialog state
  isShareDialogOpen: boolean;
  sharingList: TaskList | null;
  isImportExportDialogOpen: boolean;
  importExportList: TaskList | null;

  // Actions - State setters
  setTaskLists: (lists: TaskList[]) => void;
  setTasks: (tasks: Task[]) => void;
  setCurrentView: (view: TaskView) => void;
  setSelectedListId: (listId: string | null) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  setSelectedListIds: (listIds: string[]) => void;
  toggleListVisibility: (listId: string) => void;
  setFilter: (filter: Partial<TaskFilter>) => void;
  resetFilter: () => void;
  setSortBy: (field: TaskSortField) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setLoadingLists: (loading: boolean) => void;
  setLoadingTasks: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  // Editor actions
  openEditor: (task?: Task | null, defaultListId?: string | null) => void;
  closeEditor: () => void;

  // Dialog actions
  openShareDialog: (list: TaskList | null) => void;
  closeShareDialog: () => void;
  openImportExportDialog: (list: TaskList | null) => void;
  closeImportExportDialog: () => void;

  // Computed helpers
  getListById: (id: string) => TaskList | undefined;
  getTaskById: (id: string) => Task | undefined;
  getVisibleLists: () => TaskList[];
  getFilteredTasks: () => Task[];
  getTasksForList: (listId: string) => Task[];
  getTasksByStatus: (status: Task['status']) => Task[];
  getMyTasks: (memberId: string) => Task[];
  getOverdueTasks: () => Task[];
  getTasksDueToday: () => Task[];

  // Reset
  reset: () => void;
}

const defaultFilter: TaskFilter = {
  listIds: undefined,
  statuses: undefined,
  priorities: undefined,
  assigneeIds: undefined,
  dueDateFilter: 'all',
  customDueDateStart: undefined,
  customDueDateEnd: undefined,
  labelIds: undefined,
  searchQuery: undefined,
  hasSubtasks: undefined,
  hasAttachments: undefined,
  hasComments: undefined,
};

const initialState = {
  taskLists: [],
  tasks: [],
  currentView: 'list' as TaskView,
  selectedListId: null,
  selectedTaskId: null,
  selectedListIds: [],
  filter: defaultFilter,
  sortBy: 'position' as TaskSortField,
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
};

// Helper to get start of day
const startOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Helper to get end of day
const endOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

// Helper to check if date is today
const isToday = (timestamp: number): boolean => {
  const today = startOfDay(Date.now());
  const date = startOfDay(timestamp);
  return today === date;
};

// Helper to check if date is overdue
const isOverdue = (timestamp: number): boolean => {
  const now = Date.now();
  return timestamp < now && !isToday(timestamp);
};

export const useTaskStore = create<TaskStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // State setters
    setTaskLists: (taskLists) => {
      set({ taskLists });
      // Auto-select all lists if none selected
      const { selectedListIds } = get();
      if (selectedListIds.length === 0 && taskLists.length > 0) {
        set({ selectedListIds: taskLists.map((l) => l.id) });
      }
    },
    setTasks: (tasks) => set({ tasks }),
    setCurrentView: (currentView) => set({ currentView }),
    setSelectedListId: (selectedListId) => set({ selectedListId }),
    setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
    setSelectedListIds: (selectedListIds) => set({ selectedListIds }),
    toggleListVisibility: (listId) => {
      const { selectedListIds } = get();
      if (selectedListIds.includes(listId)) {
        set({ selectedListIds: selectedListIds.filter((id) => id !== listId) });
      } else {
        set({ selectedListIds: [...selectedListIds, listId] });
      }
    },
    setFilter: (filterUpdate) => {
      const { filter } = get();
      set({ filter: { ...filter, ...filterUpdate } });
    },
    resetFilter: () => set({ filter: defaultFilter }),
    setSortBy: (sortBy) => set({ sortBy }),
    setSortOrder: (sortOrder) => set({ sortOrder }),
    setLoadingLists: (isLoadingLists) => set({ isLoadingLists }),
    setLoadingTasks: (isLoadingTasks) => set({ isLoadingTasks }),
    setSaving: (isSaving) => set({ isSaving }),
    setError: (error) => set({ error }),

    // Editor actions
    openEditor: (task = null, defaultListId = null) =>
      set({
        isEditorOpen: true,
        editingTask: task,
        defaultListId,
      }),
    closeEditor: () =>
      set({
        isEditorOpen: false,
        editingTask: null,
        defaultListId: null,
      }),

    // Dialog actions
    openShareDialog: (list) =>
      set({
        isShareDialogOpen: true,
        sharingList: list,
      }),
    closeShareDialog: () =>
      set({
        isShareDialogOpen: false,
        sharingList: null,
      }),
    openImportExportDialog: (list) =>
      set({
        isImportExportDialogOpen: true,
        importExportList: list,
      }),
    closeImportExportDialog: () =>
      set({
        isImportExportDialogOpen: false,
        importExportList: null,
      }),

    // Computed helpers
    getListById: (id) => get().taskLists.find((l) => l.id === id),
    getTaskById: (id) => get().tasks.find((t) => t.id === id),
    getVisibleLists: () => {
      const { taskLists, selectedListIds } = get();
      return taskLists.filter((l) => selectedListIds.includes(l.id));
    },
    getFilteredTasks: () => {
      const { tasks, filter, selectedListIds, sortBy, sortOrder } = get();
      let filtered = [...tasks];

      // Filter by selected lists (if filter.listIds is not set, use selectedListIds)
      const listIds = filter.listIds ?? selectedListIds;
      if (listIds.length > 0) {
        filtered = filtered.filter((t) => listIds.includes(t.taskListId));
      }

      // Filter by status
      if (filter.statuses && filter.statuses.length > 0) {
        filtered = filtered.filter((t) => filter.statuses?.includes(t.status) ?? false);
      }

      // Filter by priority
      if (filter.priorities && filter.priorities.length > 0) {
        filtered = filtered.filter((t) => filter.priorities?.includes(t.priority) ?? false);
      }

      // Filter by assignee
      if (filter.assigneeIds !== undefined) {
        if (filter.assigneeIds.length === 0) {
          // Empty array means unassigned
          filtered = filtered.filter((t) => t.assigneeIds.length === 0);
        } else {
          filtered = filtered.filter((t) =>
            t.assigneeIds.some((id) => filter.assigneeIds?.includes(id) ?? false)
          );
        }
      }

      // Filter by due date
      if (filter.dueDateFilter && filter.dueDateFilter !== 'all') {
        const now = Date.now();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
        const tomorrowEnd = todayEnd + 24 * 60 * 60 * 1000;

        filtered = filtered.filter((t) => {
          if (!t.dueDate) {
            return filter.dueDateFilter === 'no_date';
          }

          const dueDate = t.dueDate;

          switch (filter.dueDateFilter) {
            case 'today':
              return dueDate >= todayStart && dueDate <= todayEnd;
            case 'tomorrow':
              return dueDate >= tomorrowStart && dueDate <= tomorrowEnd;
            case 'this_week': {
              const weekEnd = todayEnd + (7 - new Date(now).getDay()) * 24 * 60 * 60 * 1000;
              return dueDate >= todayStart && dueDate <= weekEnd;
            }
            case 'next_week': {
              const weekEnd = todayEnd + (7 - new Date(now).getDay()) * 24 * 60 * 60 * 1000;
              const nextWeekEnd = weekEnd + 7 * 24 * 60 * 60 * 1000;
              return dueDate > weekEnd && dueDate <= nextWeekEnd;
            }
            case 'this_month': {
              const monthStart = new Date(now);
              monthStart.setDate(1);
              monthStart.setHours(0, 0, 0, 0);
              const monthEnd = new Date(monthStart);
              monthEnd.setMonth(monthEnd.getMonth() + 1);
              monthEnd.setDate(0);
              monthEnd.setHours(23, 59, 59, 999);
              return dueDate >= monthStart.getTime() && dueDate <= monthEnd.getTime();
            }
            case 'overdue':
              return isOverdue(dueDate);
            case 'custom':
              if (filter.customDueDateStart && filter.customDueDateEnd) {
                return dueDate >= filter.customDueDateStart && dueDate <= filter.customDueDateEnd;
              }
              return true;
            default:
              return true;
          }
        });
      }

      // Filter by labels
      if (filter.labelIds && filter.labelIds.length > 0) {
        filtered = filtered.filter((t) =>
          t.labels.some((label) => filter.labelIds?.includes(label.id) ?? false)
        );
      }

      // Filter by search query
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            (t.description ?? '').toLowerCase().includes(query) ||
            t.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      // Filter by subtasks
      if (filter.hasSubtasks !== undefined) {
        filtered = filtered.filter((t) =>
          filter.hasSubtasks ? t.subtasks.length > 0 : t.subtasks.length === 0
        );
      }

      // Filter by attachments
      if (filter.hasAttachments !== undefined) {
        filtered = filtered.filter((t) =>
          filter.hasAttachments ? t.attachments.length > 0 : t.attachments.length === 0
        );
      }

      // Filter by comments
      if (filter.hasComments !== undefined) {
        filtered = filtered.filter((t) =>
          filter.hasComments ? t.comments.length > 0 : t.comments.length === 0
        );
      }

      // Sort
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'status': {
            const statusOrder: Task['status'][] = [
              'todo',
              'in_progress',
              'blocked',
              'done',
              'cancelled',
            ];
            comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
            break;
          }
          case 'priority': {
            const priorityOrder: Task['priority'][] = ['urgent', 'high', 'medium', 'low', 'none'];
            comparison = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
            break;
          }
          case 'dueDate':
            if (!a.dueDate && !b.dueDate) {
              comparison = 0;
            } else if (!a.dueDate) {
              comparison = 1;
            } else if (!b.dueDate) {
              comparison = -1;
            } else {
              comparison = a.dueDate - b.dueDate;
            }
            break;
          case 'createdAt':
            comparison = a.createdAt - b.createdAt;
            break;
          case 'updatedAt':
            comparison = a.updatedAt - b.updatedAt;
            break;
          case 'position':
            comparison = a.position - b.position;
            break;
          case 'assignee':
            // Sort by first assignee name (would need member data)
            comparison = (a.assigneeIds[0] ?? '').localeCompare(b.assigneeIds[0] ?? '');
            break;
          default:
            comparison = a.position - b.position;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });

      return filtered;
    },
    getTasksForList: (listId) => {
      const { getFilteredTasks } = get();
      return getFilteredTasks().filter((t) => t.taskListId === listId);
    },
    getTasksByStatus: (status) => {
      const { getFilteredTasks } = get();
      return getFilteredTasks().filter((t) => t.status === status);
    },
    getMyTasks: (memberId) => {
      const { getFilteredTasks } = get();
      return getFilteredTasks().filter((t) => t.assigneeIds.includes(memberId));
    },
    getOverdueTasks: () => {
      const { getFilteredTasks } = get();
      return getFilteredTasks().filter((t) => t.dueDate && isOverdue(t.dueDate));
    },
    getTasksDueToday: () => {
      const { getFilteredTasks } = get();
      const now = Date.now();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      return getFilteredTasks().filter(
        (t) => t.dueDate && t.dueDate >= todayStart && t.dueDate <= todayEnd
      );
    },

    // Reset
    reset: () => set(initialState),
  }))
);

// Selector hooks for optimized re-renders
export const selectTaskLists = (state: TaskStore): TaskList[] => state.taskLists;
export const selectTasks = (state: TaskStore): Task[] => state.tasks;
export const selectCurrentView = (state: TaskStore): TaskView => state.currentView;
export const selectSelectedListId = (state: TaskStore): string | null => state.selectedListId;
export const selectSelectedTaskId = (state: TaskStore): string | null => state.selectedTaskId;
export const selectIsLoadingLists = (state: TaskStore): boolean => state.isLoadingLists;
export const selectIsLoadingTasks = (state: TaskStore): boolean => state.isLoadingTasks;
export const selectIsSaving = (state: TaskStore): boolean => state.isSaving;
export const selectError = (state: TaskStore): string | null => state.error;
export const selectIsEditorOpen = (state: TaskStore): boolean => state.isEditorOpen;
export const selectEditingTask = (state: TaskStore): Task | null => state.editingTask;
export const selectIsShareDialogOpen = (state: TaskStore): boolean => state.isShareDialogOpen;
export const selectSharingList = (state: TaskStore): TaskList | null => state.sharingList;
export const selectIsImportExportDialogOpen = (state: TaskStore): boolean =>
  state.isImportExportDialogOpen;
export const selectImportExportList = (state: TaskStore): TaskList | null => state.importExportList;
