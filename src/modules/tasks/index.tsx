/**
 * Tasks Module - Main entry point
 */

import { useEffect, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { List, Plus } from 'lucide-react';
import { Routes, Route } from 'react-router-dom';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { trackModuleAction } from '@/hooks/useAnalytics';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useFamily } from '@/modules/family/hooks/useFamily';
import { ErrorBanner } from '@/shared/components';

import {
  TaskEditor,
  TaskListView,
  TaskBoardView,
  TaskSidebar,
  ShareDialog,
  ImportExportDialog,
  type TaskFormData,
} from './components';
import { useTasks } from './hooks/useTasks';

import type { Task, TaskListColor } from './types/Task.types';

function TasksPage(): JSX.Element {
  const [sidebarCreateListTrigger, setSidebarCreateListTrigger] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const shouldReduceMotion = useReducedMotion();

  // Helper function to validate TaskListColor
  const validateTaskListColor = (color: string): TaskListColor => {
    const validColors: TaskListColor[] = [
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
    return validColors.includes(color as TaskListColor) ? (color as TaskListColor) : 'blue';
  };

  // Family data for sharing
  const { devices } = useFamily();

  const {
    taskLists,
    tasks,
    currentView,
    selectedListIds,
    filter,
    sortBy,
    sortOrder,
    isSaving,
    error,
    isEditorOpen,
    editingTask,
    defaultListId,
    isShareDialogOpen,
    sharingList,
    isImportExportDialogOpen,
    importExportList,
    filteredTasks,
    loadTaskLists,
    createTaskList,
    deleteTaskList,
    toggleListVisibility,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    moveTask,
    setView,
    setFilter,
    setSortBy,
    setSortOrder,
    openTaskEditor,
    closeTaskEditor,
    openShareDialog,
    closeShareDialog,
    openImportExportDialog,
    closeImportExportDialog,
    getListById,
    clearError,
    shareTaskList,
    updateTaskListShare,
    unshareTaskList,
    getTaskListShares,
  } = useTasks();

  // Load data on mount
  useEffect(() => {
    void loadTaskLists();
  }, [loadTaskLists]);

  useEffect(() => {
    if (selectedListIds.length > 0) {
      void loadTasks();
    }
  }, [selectedListIds, loadTasks]);

  // Handle task click
  const handleTaskClick = (task: Task): void => {
    openTaskEditor(task);
  };

  // Handle task completion toggle
  const handleTaskComplete = async (task: Task, completed: boolean): Promise<void> => {
    trackModuleAction('tasks', 'task_completed', { completed, hasDueDate: !!task.dueDate });
    await completeTask(task.id, completed);
  };

  const handleTaskMove = async (
    taskId: string,
    targetStatus: Task['status'],
    position?: number
  ): Promise<void> => {
    const task = tasks.find((t) => t.id === taskId);
    const fallbackListId = selectedListIds[0];
    const targetListId = task?.taskListId ?? fallbackListId;

    if (!targetListId) {
      return;
    }

    await moveTask(taskId, targetListId, targetStatus, position);
  };

  // Handle creating new task list
  const handleCreateList = async (name: string, color: TaskListColor): Promise<void> => {
    trackModuleAction('tasks', 'task_list_created', { color, visibility: 'family' });
    await createTaskList({
      name,
      color,
      visibility: 'family',
    });
    // Reset trigger after successful creation
    setSidebarCreateListTrigger(false);
  };

  // Handle saving task
  const handleSaveTask = async (data: TaskFormData): Promise<void> => {
    if (data.id) {
      trackModuleAction('tasks', 'task_updated', {
        hasDueDate: !!data.dueDate,
        hasSubtasks: (data.subtasks?.length ?? 0) > 0,
        hasLabels: (data.labels?.length ?? 0) > 0,
        status: data.status,
      });
      // Update existing task
      await updateTask({
        id: data.id,
        title: data.title,
        status: data.status,
        priority: data.priority,
        assigneeIds: data.assigneeIds,
        ...(data.dueDate && { dueDate: data.dueDate }),
        ...(data.dueTime && { dueTime: data.dueTime }),
        ...(data.startDate && { startDate: data.startDate }),
        labels: data.labels.map((label) => ({
          id: crypto.randomUUID(),
          name: label.name,
          color: validateTaskListColor(label.color),
          createdAt: Date.now(),
        })),
        ...(data.tags && data.tags.length > 0 && { tags: data.tags }),
        subtasks: data.subtasks.map((subtask) => ({
          id: crypto.randomUUID(),
          taskId: data.id ?? '',
          title: subtask.title,
          completed: false,
          completedAt: undefined,
          position: subtask.position,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })),
        checklist: data.checklist.map((item) => ({
          id: crypto.randomUUID(),
          text: item.text,
          checked: false,
          checkedAt: undefined,
          position: item.position,
        })),
        ...(data.dependsOn && data.dependsOn.length > 0 && { dependsOn: data.dependsOn }),
        ...(data.estimatedMinutes && { estimatedMinutes: data.estimatedMinutes }),
        ...(data.recurrence && { recurrence: data.recurrence }),
        ...(data.location && { location: data.location }),
        ...(data.position !== undefined && { position: data.position }),
      });
    } else {
      trackModuleAction('tasks', 'task_created', {
        hasDueDate: !!data.dueDate,
        hasSubtasks: (data.subtasks?.length ?? 0) > 0,
        hasLabels: (data.labels?.length ?? 0) > 0,
        status: data.status,
      });
      // Create new task
      await createTask({
        taskListId: data.taskListId,
        title: data.title,
        ...(data.description && { description: data.description }),
        status: data.status,
        priority: data.priority,
        assigneeIds: data.assigneeIds,
        ...(data.dueDate && { dueDate: data.dueDate }),
        ...(data.dueTime && { dueTime: data.dueTime }),
        ...(data.startDate && { startDate: data.startDate }),
        labels: data.labels.map((label) => ({
          id: crypto.randomUUID(),
          name: label.name,
          color: validateTaskListColor(label.color),
          createdAt: Date.now(),
        })),
        ...(data.tags && data.tags.length > 0 && { tags: data.tags }),
        subtasks: data.subtasks.map((subtask) => ({
          id: crypto.randomUUID(),
          taskId: '',
          title: subtask.title,
          completed: false,
          completedAt: undefined,
          position: subtask.position,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })),
        checklist: data.checklist.map((item) => ({
          id: crypto.randomUUID(),
          text: item.text,
          checked: false,
          checkedAt: undefined,
          position: item.position,
        })),
        ...(data.dependsOn && data.dependsOn.length > 0 && { dependsOn: data.dependsOn }),
        ...(data.estimatedMinutes && { estimatedMinutes: data.estimatedMinutes }),
        ...(data.recurrence && { recurrence: data.recurrence }),
        ...(data.location && { location: data.location }),
        ...(data.position !== undefined && { position: data.position }),
      });
    }
  };

  // Handle deleting task
  const handleDeleteTask = async (taskId: string): Promise<void> => {
    trackModuleAction('tasks', 'task_deleted');
    await deleteTask(taskId);
    closeTaskEditor();
  };

  // Handle deleting task list
  const handleDeleteList = async (listId: string): Promise<void> => {
    await deleteTaskList(listId);
  };

  // Handle sharing task list
  const handleShareList = (listId: string): void => {
    const list = getListById(listId);
    if (list) {
      openShareDialog(list);
    }
  };

  // Handle import/export task list
  const handleImportExportList = (listId: string): void => {
    const list = getListById(listId);
    if (list) {
      openImportExportDialog(list);
    }
  };

  // Handle closing any open dialog
  const handleCloseDialog = (): void => {
    if (isEditorOpen) {
      closeTaskEditor();
    } else if (isShareDialogOpen) {
      closeShareDialog();
    } else if (isImportExportDialogOpen) {
      closeImportExportDialog();
    }
  };

  // Handle search query change
  const handleSearchChange = (query: string): void => {
    setFilter({ searchQuery: query || undefined });
  };

  // Handle sort change
  const handleSortChange = (sort: { field: typeof sortBy; order: typeof sortOrder }): void => {
    setSortBy(sort.field);
    setSortOrder(sort.order);
  };

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onViewChange: (view: string) => {
      // Handle tasks-specific view changes
      if (view === 'list' || view === 'board') {
        setView(view);
      }
    },
    onNewEvent: () => {
      openTaskEditor(null, selectedListIds[0] ?? null);
    },
    onCloseDialog: handleCloseDialog,
  });

  const viewTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2 };
  const viewVariants = {
    initial: shouldReduceMotion ? {} : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduceMotion ? {} : { opacity: 0, y: -10 },
  };

  // Render the current view
  const renderView = (): JSX.Element => {
    const tasksToDisplay = filteredTasks;

    switch (currentView) {
      case 'board':
        return (
          <TaskBoardView
            searchQuery={filter.searchQuery ?? ''}
            taskLists={taskLists}
            tasks={tasksToDisplay}
            onCreateTask={() => openTaskEditor(null, selectedListIds[0] ?? null)}
            onSearchChange={handleSearchChange}
            onTaskClick={handleTaskClick}
            onTaskComplete={handleTaskComplete}
            onTaskDelete={handleDeleteTask}
            onTaskMove={handleTaskMove}
          />
        );
      case 'list':
      default:
        return (
          <TaskListView
            searchQuery={filter.searchQuery ?? ''}
            sort={{ field: sortBy, order: sortOrder }}
            taskLists={taskLists}
            tasks={tasksToDisplay}
            onCreateTask={() => openTaskEditor(null, selectedListIds[0] ?? null)}
            onSearchChange={handleSearchChange}
            onSortChange={handleSortChange}
            onTaskClick={handleTaskClick}
            onTaskComplete={handleTaskComplete}
            onTaskDelete={handleDeleteTask}
          />
        );
    }
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex min-h-full flex-1 flex-col gap-4 p-4"
      initial={{ opacity: 0 }}
      transition={viewTransition}
    >
      {/* Error display */}
      <ErrorBanner error={error} onDismiss={clearError} />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-4">
          {/* Mobile "My Lists" button */}
          {!isDesktop && (
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                  title="My Lists"
                >
                  <List className="h-4 w-4" />
                  My Lists
                  {taskLists.length > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {taskLists.length}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent className="w-[280px] p-0" side="left">
                <TaskSidebar
                  isCreating={isSaving}
                  selectedListIds={selectedListIds}
                  taskLists={taskLists}
                  onCreateList={handleCreateList}
                  onCreateListTrigger={sidebarCreateListTrigger}
                  onDeleteList={handleDeleteList}
                  onImportExportList={handleImportExportList}
                  onShareList={handleShareList}
                  onToggleList={toggleListVisibility}
                />
              </SheetContent>
            </Sheet>
          )}

          <div className="flex gap-2">
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                currentView === 'list'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              }`}
              title="List view (L)"
              onClick={() => {
                trackModuleAction('tasks', 'view_changed', { view: 'list' });
                setView('list');
              }}
            >
              List
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                currentView === 'board'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              }`}
              title="Board view (B)"
              onClick={() => {
                trackModuleAction('tasks', 'view_changed', { view: 'board' });
                setView('board');
              }}
            >
              Board
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-border/40 bg-card px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            title="Create new list"
            onClick={() => {
              setSidebarCreateListTrigger((prev) => !prev);
            }}
          >
            <List className="mr-2 inline h-4 w-4" />
            New List
          </button>
          <button
            className="rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            title="New task (N)"
            onClick={() => openTaskEditor(null, selectedListIds[0] ?? null)}
          >
            <Plus className="mr-2 inline h-4 w-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Sidebar - Desktop only */}
        {isDesktop && (
          <div className="w-64 shrink-0">
            <TaskSidebar
              isCreating={isSaving}
              selectedListIds={selectedListIds}
              taskLists={taskLists}
              onCreateList={handleCreateList}
              onCreateListTrigger={sidebarCreateListTrigger}
              onDeleteList={handleDeleteList}
              onImportExportList={handleImportExportList}
              onShareList={handleShareList}
              onToggleList={toggleListVisibility}
            />
          </div>
        )}

        {/* Tasks view */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            animate="animate"
            className="min-h-0 flex-1"
            exit="exit"
            initial="initial"
            transition={viewTransition}
            variants={viewVariants}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Task editor modal */}
      {isEditorOpen && (
        <TaskEditor
          defaultAssigneeIds={[]}
          defaultListId={defaultListId}
          isSaving={isSaving}
          task={editingTask}
          taskLists={taskLists}
          onClose={closeTaskEditor}
          onDelete={editingTask ? handleDeleteTask : undefined}
          onSave={handleSaveTask}
        />
      )}

      {/* Share dialog */}
      {isShareDialogOpen && sharingList && (
        <ShareDialog
          currentUserId={devices.find((d) => d.isCurrent)?.id ?? ''}
          familyMembers={devices.map((d) => ({
            id: d.id,
            name: d.name,
            role: d.isCurrent ? 'You' : 'Device',
          }))}
          isLoading={isSaving}
          isOpen={isShareDialogOpen}
          taskList={sharingList}
          onClose={closeShareDialog}
          onGetShares={getTaskListShares}
          onShare={shareTaskList}
          onUnshare={unshareTaskList}
          onUpdateShare={updateTaskListShare}
        />
      )}

      {/* Import/Export dialog */}
      <ImportExportDialog
        isLoading={isSaving}
        isOpen={isImportExportDialogOpen}
        taskList={importExportList}
        onClose={closeImportExportDialog}
      />
    </motion.div>
  );
}

export default function TasksModule(): JSX.Element {
  return (
    <Routes>
      <Route index element={<TasksPage />} />
    </Routes>
  );
}

// Re-export types and hooks for external use
export * from './types';
export * from './hooks';
export * from './stores';
