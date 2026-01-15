/**
 * FolderManager Component
 * Dialog for creating, renaming, and deleting email folders
 */

import { useEffect, useState } from 'react';

import { FolderPlus, Edit2, Trash2, Folder } from 'lucide-react';

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
import { Separator } from '@/components/ui/separator';

import type { EmailFolder } from '../types/Email.types';

interface FolderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  folders: EmailFolder[];
  onFolderCreated: () => void;
  onFolderRenamed: () => void;
  onFolderDeleted: () => void;
}

export function FolderManager({
  open,
  onOpenChange,
  accountId,
  folders,
  onFolderCreated,
  onFolderRenamed,
  onFolderDeleted,
}: FolderManagerProps): JSX.Element {
  const [folderName, setFolderName] = useState('');
  const [parentFolder, setParentFolder] = useState<string>('');
  const [editingFolder, setEditingFolder] = useState<EmailFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<EmailFolder | null>(null);
  const [moveToFolder, setMoveToFolder] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out system folders that can't be renamed/deleted
  const customFolders = folders.filter((f) => f.type === 'custom' && f.selectable);

  // Get top-level folders for parent selection
  const topLevelFolders = folders.filter((f) => !f.path.includes('/'));

  useEffect(() => {
    if (open) {
      setFolderName('');
      setParentFolder('');
      setEditingFolder(null);
      setDeletingFolder(null);
      setMoveToFolder('');
      setError(null);
    }
  }, [open]);

  const handleCreateFolder = async (): Promise<void> => {
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let folderPath = folderName.trim();
      if (parentFolder && parentFolder !== '__none__') {
        const parent = folders.find((f) => f.path === parentFolder);
        if (parent) {
          folderPath = `${parent.path}/${folderName.trim()}`;
        }
      }

      const emailAPI = (
        window.electronAPI as {
          email?: {
            createFolder: (accountId: string, folderPath: string) => Promise<{ success: boolean }>;
          };
        }
      )?.email;
      if (!emailAPI) {
        throw new Error('Email API not available');
      }
      await emailAPI.createFolder(accountId, folderPath);
      setFolderName('');
      setParentFolder('');
      onFolderCreated();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
      setError(errorMessage);
      console.error('Failed to create folder:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameFolder = async (): Promise<void> => {
    if (!editingFolder || !folderName.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let newPath = folderName.trim();
      if (editingFolder.parent) {
        const parentPath = editingFolder.parent;
        newPath = `${parentPath}/${folderName.trim()}`;
      }

      const emailAPI = (
        window.electronAPI as {
          email?: {
            renameFolder: (
              accountId: string,
              oldPath: string,
              newPath: string
            ) => Promise<{ success: boolean }>;
          };
        }
      )?.email;
      if (!emailAPI) {
        throw new Error('Email API not available');
      }
      await emailAPI.renameFolder(accountId, editingFolder.path, newPath);
      setEditingFolder(null);
      setFolderName('');
      onFolderRenamed();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename folder';
      setError(errorMessage);
      console.error('Failed to rename folder:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFolder = async (): Promise<void> => {
    if (!deletingFolder) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const emailAPI = (
        window.electronAPI as {
          email?: {
            deleteFolder: (
              accountId: string,
              folderPath: string,
              moveMessagesTo?: string
            ) => Promise<{ success: boolean }>;
          };
        }
      )?.email;
      if (!emailAPI) {
        throw new Error('Email API not available');
      }
      await emailAPI.deleteFolder(
        accountId,
        deletingFolder.path,
        moveToFolder && moveToFolder !== '__delete__' ? moveToFolder : undefined
      );
      setDeletingFolder(null);
      setMoveToFolder('');
      onFolderDeleted();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete folder';
      setError(errorMessage);
      console.error('Failed to delete folder:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (folder: EmailFolder): void => {
    setEditingFolder(folder);
    setDeletingFolder(null);
    // Extract folder name from path
    const name = folder.path.split('/').pop() ?? folder.name;
    setFolderName(name);
  };

  const startDelete = (folder: EmailFolder): void => {
    setDeletingFolder(folder);
    setEditingFolder(null);
    setFolderName('');
    setMoveToFolder('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Folders</DialogTitle>
          <DialogDescription>
            Create, rename, and delete email folders. System folders (Inbox, Sent, etc.) cannot be
            modified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create Folder Form */}
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Create New Folder</h3>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="parent-folder">Parent Folder (Optional)</Label>
                <Select value={parentFolder} onValueChange={setParentFolder}>
                  <SelectTrigger id="parent-folder">
                    <SelectValue placeholder="Top level (no parent)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Top level (no parent)</SelectItem>
                    {topLevelFolders.map((folder) => (
                      <SelectItem key={folder.path} value={folder.path}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input
                  id="folder-name"
                  placeholder="Enter folder name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !editingFolder) {
                      void handleCreateFolder();
                    }
                  }}
                />
              </div>

              <Button disabled={!folderName.trim() || isLoading} onClick={handleCreateFolder}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Folder
              </Button>
            </div>
          </div>

          <Separator />

          {/* Folders List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Custom Folders</h3>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {customFolders.length === 0 && (
              <p className="text-sm text-muted-foreground">No custom folders created yet.</p>
            )}

            {customFolders.length > 0 && (
              <div className="space-y-1">
                {customFolders.map((folder) => (
                  <div
                    key={folder.path}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{folder.path}</span>
                      {folder.unreadMessages > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({folder.unreadMessages} unread)
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        disabled={isLoading}
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(folder)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        disabled={isLoading}
                        size="sm"
                        variant="ghost"
                        onClick={() => startDelete(folder)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit Dialog */}
          {editingFolder && (
            <div className="space-y-4 rounded-lg border border-primary p-4">
              <h3 className="text-sm font-semibold">Rename Folder</h3>
              <div className="grid gap-2">
                <Label htmlFor="edit-folder-name">New Folder Name</Label>
                <Input
                  id="edit-folder-name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleRenameFolder();
                    }
                    if (e.key === 'Escape') {
                      setEditingFolder(null);
                      setFolderName('');
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button disabled={!folderName.trim() || isLoading} onClick={handleRenameFolder}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingFolder(null);
                    setFolderName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Delete Dialog */}
          {deletingFolder && (
            <div className="space-y-4 rounded-lg border border-destructive p-4">
              <h3 className="text-sm font-semibold text-destructive">Delete Folder</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete &quot;{deletingFolder.path}&quot;?
                {deletingFolder.totalMessages > 0 && (
                  <span className="mt-1 block">
                    This folder contains {deletingFolder.totalMessages} message
                    {deletingFolder.totalMessages !== 1 ? 's' : ''}. You can move them to another
                    folder.
                  </span>
                )}
              </p>

              {deletingFolder.totalMessages > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="move-to-folder">Move messages to (optional)</Label>
                  <Select value={moveToFolder} onValueChange={setMoveToFolder}>
                    <SelectTrigger id="move-to-folder">
                      <SelectValue placeholder="Select folder (or leave empty to delete)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__delete__">Delete messages</SelectItem>
                      {folders
                        .filter((f) => f.path !== deletingFolder.path && f.selectable)
                        .map((folder) => (
                          <SelectItem key={folder.path} value={folder.path}>
                            {folder.path}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2">
                <Button disabled={isLoading} variant="destructive" onClick={handleDeleteFolder}>
                  Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeletingFolder(null);
                    setMoveToFolder('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
