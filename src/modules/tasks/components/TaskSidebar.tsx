/**
 * TaskSidebar - Task list management and filters
 */

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { TASK_LIST_COLORS, type TaskList, type TaskListColor } from '../types/Task.types';

interface TaskSidebarProps {
  taskLists: TaskList[];
  selectedListIds: string[];
  onToggleList: (listId: string) => void;
  onCreateList: (name: string, color: TaskListColor) => Promise<void>;
  onShareList?: (listId: string) => void;
  onImportExportList?: (listId: string) => void;
  onDeleteList?: (listId: string) => void;
  isCreating?: boolean;
  onCreateListTrigger?: boolean;
}

export function TaskSidebar({
  taskLists,
  selectedListIds,
  onToggleList,
  onCreateList,
  onShareList,
  onImportExportList,
  onDeleteList,
  isCreating,
  onCreateListTrigger,
}: TaskSidebarProps): JSX.Element {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState<TaskListColor>('blue');

  // Sync with external trigger
  useEffect(() => {
    if (onCreateListTrigger !== undefined) {
      setShowCreateForm(onCreateListTrigger);
      // Auto-focus input when triggered externally
      if (onCreateListTrigger) {
        setTimeout(() => {
          const input = document.getElementById('newListName');
          input?.focus();
        }, 100);
      }
    }
  }, [onCreateListTrigger]);

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newListName.trim()) {
      return;
    }

    await onCreateList(newListName.trim(), newListColor);
    setNewListName('');
    setShowCreateForm(false);
    // Reset to default color for next creation
    setNewListColor('blue');
  };

  const colorOptions: TaskListColor[] = [
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

  return (
    <div className="space-y-4">
      {/* Task Lists */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">My Lists</CardTitle>
            <Button
              className="h-6 w-6"
              size="icon"
              variant="ghost"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {/* Create form */}
          {showCreateForm && (
            <form
              className="mb-3 space-y-2 rounded-md border p-2"
              onSubmit={(e) => void handleCreate(e)}
            >
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="newListName">
                  Name
                </Label>
                <Input
                  className="h-8 text-sm"
                  disabled={isCreating}
                  id="newListName"
                  placeholder="List name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <div className="flex flex-wrap gap-1">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`h-5 w-5 rounded-full ${TASK_LIST_COLORS[color].bg} ${
                        newListColor === color ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      type="button"
                      onClick={() => setNewListColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  className="h-7 text-xs"
                  disabled={isCreating ?? !newListName.trim()}
                  size="sm"
                  type="submit"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  className="h-7 text-xs"
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Task lists */}
          {taskLists.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              No lists yet. Create one to get started.
            </p>
          ) : (
            taskLists.map((list) => {
              const isSelected = selectedListIds.includes(list.id);
              const colorClasses = TASK_LIST_COLORS[list.color] ?? TASK_LIST_COLORS.blue;

              return (
                <ContextMenu key={list.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                        isSelected ? '' : 'opacity-50'
                      }`}
                      onClick={() => onToggleList(list.id)}
                    >
                      <div
                        className={`h-3 w-3 shrink-0 rounded-sm ${colorClasses.bg} ${colorClasses.border} border`}
                      />
                      <span className="flex-1 truncate">{list.name}</span>
                      {isSelected && (
                        <svg
                          className="h-4 w-4 shrink-0 text-primary"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {onImportExportList && (
                      <ContextMenuItem
                        onClick={() => {
                          onImportExportList(list.id);
                        }}
                      >
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17,8 12,3 7,8" />
                          <line x1="12" x2="12" y1="3" y2="15" />
                        </svg>
                        Import/Export
                      </ContextMenuItem>
                    )}
                    {onShareList && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => {
                            onShareList(list.id);
                          }}
                        >
                          <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            <polyline points="16,6 12,2 8,6" />
                            <line x1="12" x2="12" y1="2" y2="15" />
                          </svg>
                          Share list
                        </ContextMenuItem>
                      </>
                    )}
                    {onDeleteList && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to delete "${list.name}"? This will also delete all tasks in this list.`
                              )
                            ) {
                              void onDeleteList(list.id);
                            }
                          }}
                        >
                          <svg
                            className="mr-2 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <polyline points="3,6 5,6 21,6" />
                            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
                          </svg>
                          Delete list
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Quick stats */}
      {taskLists.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lists</span>
              <Badge variant="secondary">{taskLists.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Showing</span>
              <Badge variant="secondary">
                {selectedListIds.length} of {taskLists.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
