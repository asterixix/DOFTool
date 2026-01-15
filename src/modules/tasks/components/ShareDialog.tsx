/**
 * ShareDialog - Task list sharing management dialog
 */

import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import type { TaskList, TaskPermission, TaskListShare } from '../types/Task.types';

interface ShareDialogProps {
  taskList: TaskList | null;
  isOpen: boolean;
  onClose: () => void;
  onShare: (
    listId: string,
    memberId: string,
    permission: TaskPermission
  ) => Promise<TaskListShare | null>;
  onUpdateShare: (
    listId: string,
    memberId: string,
    permission: TaskPermission
  ) => Promise<TaskListShare | null>;
  onUnshare: (listId: string, memberId: string) => Promise<boolean>;
  onGetShares: (listId: string) => Promise<TaskListShare[]>;
  // Family members would come from family store
  familyMembers: Array<{
    id: string;
    name: string;
    email?: string;
    role: string;
  }>;
  currentUserId: string;
  isLoading?: boolean;
}

const PERMISSION_LABELS: Record<TaskPermission, string> = {
  none: 'No access',
  view: 'Can view',
  edit: 'Can edit',
  admin: 'Can manage',
};

const PERMISSION_DESCRIPTIONS: Record<TaskPermission, string> = {
  none: 'No access to this task list',
  view: 'View tasks and list details',
  edit: 'View, create, and edit tasks',
  admin: 'Full control, including sharing and deletion',
};

export function ShareDialog({
  taskList,
  isOpen,
  onClose,
  onShare,
  onUpdateShare,
  onUnshare,
  onGetShares,
  familyMembers,
  currentUserId,
  isLoading,
}: ShareDialogProps): JSX.Element {
  const [shares, setShares] = useState<TaskListShare[]>([]);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [loadingShares, setLoadingShares] = useState(false);

  // Load shares when task list changes
  useEffect(() => {
    if (taskList && isOpen) {
      setLoadingShares(true);
      onGetShares(taskList.id)
        .then((loadedShares) => {
          setShares(loadedShares);
        })
        .catch((error) => {
          console.error('Failed to load shares:', error);
        })
        .finally(() => {
          setLoadingShares(false);
        });
    }
  }, [taskList, isOpen, onGetShares]);

  if (!taskList) {
    return <></>;
  }

  const handlePermissionChange = async (
    memberId: string,
    permission: TaskPermission
  ): Promise<void> => {
    if (!taskList) {
      return;
    }

    setUpdatingMember(memberId);
    try {
      const existingShare = shares.find((s) => s.memberId === memberId);

      if (existingShare) {
        if (permission === 'none') {
          await onUnshare(taskList.id, memberId);
          setShares((prev) => prev.filter((s) => s.memberId !== memberId));
        } else {
          const updated = await onUpdateShare(taskList.id, memberId, permission);
          if (updated) {
            setShares((prev) =>
              prev.map((s) => (s.memberId === memberId ? { ...s, permission } : s))
            );
          }
        }
      } else if (permission !== 'none') {
        const newShare = await onShare(taskList.id, memberId, permission);
        if (newShare) {
          setShares((prev) => [...prev, newShare]);
        }
      }
    } catch (error) {
      console.error('Failed to update sharing:', error);
      // In a real app, show error toast
    } finally {
      setUpdatingMember(null);
    }
  };

  const getAvailableMembers = (): Array<{
    id: string;
    name: string;
    email?: string;
    role: string;
  }> => {
    const sharedMemberIds = new Set(shares.map((s) => s.memberId));
    return familyMembers.filter(
      (member) => member.id !== taskList.ownerId && !sharedMemberIds.has(member.id)
    );
  };

  const getMemberName = (memberId: string): string => {
    const member = familyMembers.find((m) => m.id === memberId);
    return member?.name ?? 'Unknown';
  };

  const getMemberInitials = (memberId: string): string => {
    const name = getMemberName(memberId);
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canManageSharing =
    taskList.ownerId === currentUserId ||
    shares.some((s) => s.memberId === currentUserId && s.permission === 'admin');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{taskList.name}&rdquo;</DialogTitle>
          <DialogDescription>
            Manage who can access this task list and their permission levels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current shares */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Shared with</h4>

            {loadingShares ? (
              <p className="text-sm text-muted-foreground">Loading shares...</p>
            ) : (
              <>
                {/* Owner */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getMemberInitials(taskList.ownerId)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{getMemberName(taskList.ownerId)}</p>
                      <p className="text-xs text-muted-foreground">Owner</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Owner</Badge>
                </div>

                {/* Shared members */}
                {shares.map((share) => (
                  <div key={share.memberId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getMemberInitials(share.memberId)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{getMemberName(share.memberId)}</p>
                        <p className="text-xs text-muted-foreground">
                          Shared {new Date(share.sharedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {canManageSharing ? (
                      <Select
                        disabled={!!(updatingMember === share.memberId || isLoading)}
                        value={share.permission}
                        onValueChange={(value: TaskPermission) => {
                          void handlePermissionChange(share.memberId, value);
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">{PERMISSION_LABELS['view']}</SelectItem>
                          <SelectItem value="edit">{PERMISSION_LABELS['edit']}</SelectItem>
                          <SelectItem value="admin">{PERMISSION_LABELS['admin']}</SelectItem>
                          <SelectItem value="none">{PERMISSION_LABELS['none']}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{PERMISSION_LABELS[share.permission]}</Badge>
                    )}
                  </div>
                ))}

                {shares.length === 0 && (
                  <p className="text-sm text-muted-foreground">Not shared with anyone yet.</p>
                )}
              </>
            )}
          </div>

          {/* Add new share */}
          {canManageSharing && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Share with family member</h4>

                {getAvailableMembers().length > 0 ? (
                  <div className="space-y-2">
                    {getAvailableMembers().map((member) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {member.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          </div>
                        </div>

                        <Select
                          disabled={!!isLoading}
                          onValueChange={(value: TaskPermission) => {
                            void handlePermissionChange(member.id, value);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select access" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">{PERMISSION_LABELS['view']}</SelectItem>
                            <SelectItem value="edit">{PERMISSION_LABELS['edit']}</SelectItem>
                            <SelectItem value="admin">{PERMISSION_LABELS['admin']}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    All family members already have access.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Permission explanations */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Permission levels</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>
                <strong>Can view:</strong> {PERMISSION_DESCRIPTIONS['view']}
              </div>
              <div>
                <strong>Can edit:</strong> {PERMISSION_DESCRIPTIONS['edit']}
              </div>
              <div>
                <strong>Can manage:</strong> {PERMISSION_DESCRIPTIONS['admin']}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
