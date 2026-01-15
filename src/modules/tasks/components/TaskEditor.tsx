/**
 * TaskEditor - Dialog for creating and editing tasks
 */

import { useEffect, useState } from 'react';

import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  TASK_LIST_COLORS,
  type Task,
  type TaskList,
  type TaskPriority,
  type TaskStatus,
} from '../types/Task.types';

interface TaskEditorProps {
  task: Task | null;
  taskLists: TaskList[];
  defaultListId: string | null;
  defaultAssigneeIds?: string[];
  onSave: (taskData: TaskFormData) => Promise<void>;
  onDelete: ((taskId: string) => Promise<void>) | undefined;
  onClose: () => void;
  isSaving: boolean | undefined;
}

export interface TaskFormData {
  id: string | undefined;
  taskListId: string;
  title: string;
  description: string | undefined;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  dueDate: number | undefined;
  dueTime: string | undefined;
  startDate: number | undefined;
  labels: Array<{ name: string; color: string }>;
  tags: string[];
  subtasks: Array<{ title: string; position: number }>;
  checklist: Array<{ text: string; position: number }>;
  dependsOn: string[];
  estimatedMinutes: number | undefined;
  recurrence: Task['recurrence'] | undefined;
  location: string | undefined;
  position: number | undefined;
}

export function TaskEditor({
  task,
  taskLists,
  defaultListId,
  defaultAssigneeIds,
  onSave,
  onDelete,
  onClose,
  isSaving,
}: TaskEditorProps): JSX.Element {
  const isEditing = !!task;

  // Form state
  const [taskListId, setTaskListId] = useState(
    task?.taskListId ?? defaultListId ?? taskLists[0]?.id ?? ''
  );
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'none');
  const [assigneeIds, _setAssigneeIds] = useState<string[]>(
    task?.assigneeIds ?? defaultAssigneeIds ?? []
  );
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [location, setLocation] = useState(task?.location ?? '');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>(
    task?.estimatedMinutes?.toString() ?? ''
  );
  const [tags, setTags] = useState<string>(task?.tags.join(', ') ?? '');
  const [hasTime, setHasTime] = useState<boolean>(!!task?.dueTime);

  // Initialize dates
  useEffect(() => {
    if (task?.dueDate) {
      const due = new Date(task.dueDate);
      setDueDate(format(due, 'yyyy-MM-dd'));
      if (task.dueTime) {
        setDueTime(task.dueTime);
        setHasTime(true);
      }
    } else {
      setDueDate('');
      setDueTime('');
      setHasTime(false);
    }

    if (task?.startDate) {
      const start = new Date(task.startDate);
      setStartDate(format(start, 'yyyy-MM-dd'));
    } else {
      setStartDate('');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim() || !taskListId) {
      return;
    }

    // Parse due date
    let dueDateTimestamp: number | undefined = undefined;
    if (dueDate) {
      const date = new Date(dueDate);
      if (hasTime && dueTime) {
        const [hours, minutes] = dueTime.split(':').map(Number);
        date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      dueDateTimestamp = date.getTime();
    }

    // Parse start date
    let startDateTimestamp: number | undefined = undefined;
    if (startDate) {
      const date = new Date(startDate);
      date.setHours(0, 0, 0, 0);
      startDateTimestamp = date.getTime();
    }

    // Parse tags
    const parsedTags = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // Parse estimated minutes
    const parsedEstimatedMinutes =
      estimatedMinutes.trim() !== '' ? parseInt(estimatedMinutes, 10) : undefined;

    const formData: TaskFormData = {
      id: task?.id,
      taskListId,
      title: title.trim(),
      description: description.trim() ?? undefined,
      status,
      priority,
      assigneeIds,
      dueDate: dueDateTimestamp,
      dueTime: hasTime && dueTime ? dueTime : undefined,
      startDate: startDateTimestamp,
      labels: [], // TODO: Implement label management
      tags: parsedTags,
      subtasks: [], // TODO: Implement subtask management in editor
      checklist: [], // TODO: Implement checklist management in editor
      dependsOn: [], // TODO: Implement dependency management
      estimatedMinutes: parsedEstimatedMinutes,
      recurrence: undefined, // TODO: Implement recurrence
      location: location.trim() ?? undefined,
      position: task?.position,
    };

    await onSave(formData);
  };

  const handleDelete = async (): Promise<void> => {
    if (task && onDelete && confirm('Are you sure you want to delete this task?')) {
      await onDelete(task.id);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't handle if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[role="textbox"]') !== null ||
        target.closest('[role="combobox"]') !== null
      ) {
        // Allow Escape to close even when typing
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: 'Todo' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'done', label: 'Done' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const priorityOptions: { value: TaskPriority; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'New Task'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update task details below.' : 'Create a new task and set its details.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              required
              id="title"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Task List selector */}
          <div className="space-y-2">
            <Label htmlFor="taskList">List *</Label>
            <Select value={taskListId} onValueChange={setTaskListId}>
              <SelectTrigger id="taskList">
                <SelectValue placeholder="Select a list" />
              </SelectTrigger>
              <SelectContent>
                {taskLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-sm ${TASK_LIST_COLORS[list.color].bg} ${TASK_LIST_COLORS[list.color].border} border`}
                      />
                      <span>{list.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as TaskPriority)}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              id="description"
              placeholder="Add task description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                checked={!!dueDate}
                className="h-4 w-4 rounded border-gray-300"
                id="hasDueDate"
                type="checkbox"
                onChange={(e) => {
                  if (!e.target.checked) {
                    setDueDate('');
                    setDueTime('');
                    setHasTime(false);
                  }
                }}
              />
              <Label className="font-normal" htmlFor="hasDueDate">
                Due date
              </Label>
            </div>
            {dueDate && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                <div className="flex items-center gap-2">
                  <input
                    checked={hasTime}
                    className="h-4 w-4 rounded border-gray-300"
                    id="hasTime"
                    type="checkbox"
                    onChange={(e) => {
                      setHasTime(e.target.checked);
                      if (!e.target.checked) {
                        setDueTime('');
                      }
                    }}
                  />
                  <Label className="text-xs font-normal" htmlFor="hasTime">
                    Time
                  </Label>
                  {hasTime && (
                    <Input
                      className="flex-1"
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                checked={!!startDate}
                className="h-4 w-4 rounded border-gray-300"
                id="hasStartDate"
                type="checkbox"
                onChange={(e) => {
                  if (!e.target.checked) {
                    setStartDate('');
                  }
                }}
              />
              <Label className="font-normal" htmlFor="hasStartDate">
                Start date
              </Label>
            </div>
            {startDate && (
              <Input
                className="ml-6"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Add location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="Comma-separated tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Separate tags with commas</p>
          </div>

          {/* Estimated Time */}
          <div className="space-y-2">
            <Label htmlFor="estimatedMinutes">Estimated Time (minutes)</Label>
            <Input
              id="estimatedMinutes"
              min="0"
              placeholder="e.g., 30"
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
            />
          </div>

          {/* TODO: Add Assignees, Subtasks, Checklist, Dependencies, Recurrence in future iterations */}

          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              {isEditing && onDelete && (
                <Button
                  disabled={isSaving}
                  type="button"
                  variant="destructive"
                  onClick={() => void handleDelete()}
                >
                  Delete
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button disabled={isSaving} type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button disabled={!!isSaving || !title.trim() || !taskListId} type="submit">
                  {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
