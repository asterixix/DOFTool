/**
 * Tasks Module Types
 */

// ============================================================================
// Base Types
// ============================================================================

export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Task List Types
// ============================================================================

export interface TaskList extends BaseEntity {
  familyId: string;
  name: string;
  description: string | undefined;
  color: TaskListColor;
  icon: string | undefined;

  // Ownership
  ownerId: string;
  ownerName: string | undefined;

  // Visibility & Sharing
  visibility: TaskListVisibility;
  defaultPermission: TaskPermission;
  sharedWith: TaskListShare[];

  // Settings
  defaultAssigneeId: string | undefined;
  autoSort: boolean | undefined;
  sortBy: TaskSortField | undefined;
  sortOrder: 'asc' | 'desc' | undefined;

  // Statistics
  totalTasks: number;
  completedTasks: number;
}

export type TaskListVisibility = 'private' | 'family' | 'public';

export type TaskPermission = 'none' | 'view' | 'edit' | 'admin';

export interface TaskListShare {
  memberId: string;
  memberName: string | undefined;
  permission: TaskPermission;
  sharedAt: number;
  sharedBy: string;
}

// Task list colors - matches Tailwind palette
export type TaskListColor =
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose'
  | 'slate'
  | 'gray'
  | 'zinc'
  | 'neutral'
  | 'stone';

export const TASK_LIST_COLORS: Record<TaskListColor, { bg: string; text: string; border: string }> =
  {
    red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    lime: { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-300' },
    green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
    sky: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    fuchsia: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-300' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    zinc: { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-300' },
    neutral: { bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-300' },
    stone: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' },
  };

// ============================================================================
// Task Types
// ============================================================================

export interface Task extends BaseEntity {
  taskListId: string;
  title: string;
  description: string | undefined;

  // Status & Priority
  status: TaskStatus;
  priority: TaskPriority;

  // Assignment
  assigneeIds: string[]; // Multiple assignees supported
  assignedBy: string | undefined;

  // Dates
  dueDate: number | undefined; // Timestamp (optional time component)
  dueTime: string | undefined; // HH:mm format if time specified
  startDate: number | undefined;
  completedAt: number | undefined;
  completedBy: string | undefined;

  // Organization
  labels: TaskLabel[];
  tags: string[];

  // Subtasks & Checklist
  subtasks: Subtask[];
  checklist: ChecklistItem[];

  // Dependencies
  dependsOn: string[]; // Task IDs that must be completed first
  blocks: string[]; // Task IDs that depend on this one

  // Time Tracking
  estimatedMinutes: number | undefined;
  actualMinutes: number | undefined;

  // Recurrence
  recurrence: TaskRecurrenceRule | undefined;

  // Additional metadata
  location: string | undefined;
  attachments: TaskAttachment[];
  comments: TaskComment[];

  // Position for sorting within list
  position: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface TaskLabel {
  id: string;
  name: string;
  color: TaskListColor;
  createdAt: number;
}

export interface Subtask extends BaseEntity {
  taskId: string;
  title: string;
  completed: boolean;
  completedAt: number | undefined;
  position: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  checkedAt: number | undefined;
  position: number;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string; // Path or blob URL
  uploadedAt: number;
  uploadedBy: string;
}

export interface TaskComment extends BaseEntity {
  taskId: string;
  authorId: string;
  authorName: string | undefined;
  content: string;
  edited: boolean;
}

export interface TaskRecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every N days/weeks/months/years
  endDate: number | undefined; // Recur until this date
  count: number | undefined; // Or repeat N times
  daysOfWeek: number[]; // For weekly: [0=Sunday, 1=Monday, ...]
  dayOfMonth: number | undefined; // For monthly/yearly
  monthOfYear: number | undefined; // For yearly
}

// ============================================================================
// View & Filter Types
// ============================================================================

export type TaskView = 'list' | 'board' | 'calendar' | 'timeline' | 'my_tasks';

export type TaskSortField =
  | 'title'
  | 'status'
  | 'priority'
  | 'dueDate'
  | 'createdAt'
  | 'updatedAt'
  | 'position'
  | 'assignee';

export interface TaskFilter {
  // List filters
  listIds: string[] | undefined; // undefined = all lists

  // Status filters
  statuses: TaskStatus[] | undefined; // undefined = all statuses

  // Priority filters
  priorities: TaskPriority[] | undefined; // undefined = all priorities

  // Assignment filters
  assigneeIds: string[] | undefined; // undefined = all assignees, empty = unassigned

  // Date filters
  dueDateFilter:
    | 'all'
    | 'today'
    | 'tomorrow'
    | 'this_week'
    | 'next_week'
    | 'this_month'
    | 'overdue'
    | 'no_date'
    | 'custom';

  customDueDateStart: number | undefined;
  customDueDateEnd: number | undefined;

  // Label filters
  labelIds: string[] | undefined;

  // Search
  searchQuery: string | undefined;

  // Other filters
  hasSubtasks: boolean | undefined; // undefined = don't filter by this
  hasAttachments: boolean | undefined;
  hasComments: boolean | undefined;
}

export interface TaskSort {
  field: TaskSortField;
  order: 'asc' | 'desc';
}

// ============================================================================
// Input Types for Create/Update
// ============================================================================

export interface CreateTaskListInput {
  name: string;
  description?: string;
  color?: TaskListColor;
  icon?: string;
  visibility?: TaskListVisibility;
  defaultPermission?: TaskPermission;
}

export interface UpdateTaskListInput {
  id: string;
  name?: string;
  description?: string;
  color?: TaskListColor;
  icon?: string;
  visibility?: TaskListVisibility;
  defaultPermission?: TaskPermission;
  autoSort?: boolean;
  sortBy?: TaskSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTaskInput {
  taskListId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeIds?: string[];
  dueDate?: number;
  dueTime?: string;
  startDate?: number;
  labels?: Omit<TaskLabel, 'id' | 'createdAt'>[];
  tags?: string[];
  subtasks?: Omit<Subtask, 'id' | 'taskId' | 'createdAt' | 'updatedAt'>[];
  checklist?: Omit<ChecklistItem, 'id' | 'checkedAt'>[];
  dependsOn?: string[];
  estimatedMinutes?: number;
  recurrence?: TaskRecurrenceRule;
  location?: string;
  position?: number;
}

export interface UpdateTaskInput {
  id: string;
  taskListId?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeIds?: string[];
  dueDate?: number;
  dueTime?: string;
  startDate?: number;
  labels?: TaskLabel[];
  tags?: string[];
  subtasks?: Subtask[];
  checklist?: ChecklistItem[];
  dependsOn?: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  recurrence?: TaskRecurrenceRule;
  location?: string;
  position?: number;
}

// ============================================================================
// Board View Types
// ============================================================================

export interface TaskBoardColumn {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  limit?: number; // WIP limit for Kanban
}

// ============================================================================
// Export/Import Types
// ============================================================================

export interface TaskExportData {
  version: string;
  exportedAt: number;
  lists: TaskList[];
  tasks: Task[];
}
