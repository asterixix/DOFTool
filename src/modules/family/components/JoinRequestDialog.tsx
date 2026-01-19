/**
 * Join Request Dialog - Admin approval dialog for join requests
 *
 * This component displays incoming join requests from other devices
 * and allows admins to approve or reject them with role assignment.
 */

import { useState, useEffect } from 'react';

import { Check, Loader2, UserPlus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PermissionRole = 'admin' | 'member' | 'viewer';

interface JoinRequest {
  id: string;
  deviceId: string;
  deviceName: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface JoinRequestDialogProps {
  isAdmin: boolean;
}

export function JoinRequestDialog({ isAdmin }: JoinRequestDialogProps): JSX.Element | null {
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<JoinRequest | null>(null);
  const [selectedRole, setSelectedRole] = useState<PermissionRole>('member');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  // Always listen for new join requests (regardless of isAdmin status)
  // This ensures we don't miss events due to timing issues with family data loading
  useEffect(() => {
    const unsubscribe = window.electronAPI.discovery.onNewJoinRequest((request) => {
      setPendingRequests((prev) => {
        // Avoid duplicates
        if (prev.some((r) => r.id === request.id)) {
          return prev;
        }
        return [...prev, request];
      });

      // Show dialog for the new request if not already showing one
      if (!currentRequest) {
        setCurrentRequest(request);
        setShowDialog(true);
      }

      // Emit a notification for the join request
      void window.electronAPI.notifications.emit({
        module: 'family',
        title: 'New Join Request',
        body: `${request.deviceName} wants to join your family`,
        priority: 'urgent',
        data: {
          type: 'join_request',
          requestId: request.id,
          deviceId: request.deviceId,
          deviceName: request.deviceName,
        },
      });
    });

    return () => {
      unsubscribe();
    };
  }, [currentRequest]);

  // Poll for pending join requests (runs when isAdmin becomes true)
  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const checkRequests = async (): Promise<void> => {
      try {
        const requests = await window.electronAPI.discovery.getPendingJoinRequests();
        setPendingRequests(requests);

        // If there are new requests, show the dialog
        if (requests.length > 0 && !currentRequest) {
          setCurrentRequest(requests[0] ?? null);
          setShowDialog(true);
        }
      } catch {
        // ignore
      }
    };

    // Check immediately and then every 5 seconds
    void checkRequests();
    const intervalId = setInterval(() => void checkRequests(), 5000);

    return () => clearInterval(intervalId);
  }, [isAdmin, currentRequest]);

  // When isAdmin changes to true and we have pending requests, show dialog
  useEffect(() => {
    if (isAdmin && pendingRequests.length > 0 && !currentRequest) {
      setCurrentRequest(pendingRequests[0] ?? null);
      setShowDialog(true);
    }
  }, [isAdmin, pendingRequests, currentRequest]);

  // Listen for custom event to open dialog (triggered from notification click)
  useEffect(() => {
    const handleOpenDialog = async (event: Event): Promise<void> => {
      const customEvent = event as CustomEvent<{
        requestId?: string;
        deviceId?: string;
        deviceName?: string;
      }>;
      const { requestId, deviceId, deviceName } = customEvent.detail;

      // First, try to find in current pending requests
      let request = pendingRequests.find((r) => r.id === requestId);

      // If not found, fetch fresh pending requests from backend
      if (!request) {
        try {
          const freshRequests = await window.electronAPI.discovery.getPendingJoinRequests();
          setPendingRequests(freshRequests);

          // Try to find the request in fresh data
          request = freshRequests.find((r) => r.id === requestId);

          // If still not found but we have requests, use the first one
          if (!request && freshRequests.length > 0) {
            request = freshRequests[0];
          }
        } catch {
          // ignore
        }
      }

      // If we found a request, show the dialog
      if (request) {
        setCurrentRequest(request);
        setShowDialog(true);
      } else if (deviceId && deviceName) {
        // Fallback: create a temporary request from event data
        const tempRequest: JoinRequest = {
          id: requestId ?? `temp-${Date.now()}`,
          deviceId,
          deviceName,
          requestedAt: Date.now(),
          status: 'pending',
        };
        setPendingRequests((prev) => [...prev, tempRequest]);
        setCurrentRequest(tempRequest);
        setShowDialog(true);
      }
    };

    const handler = (event: Event): void => {
      void handleOpenDialog(event);
    };

    window.addEventListener('open-join-request-dialog', handler);

    return () => {
      window.removeEventListener('open-join-request-dialog', handler);
    };
  }, [pendingRequests]);

  const handleApprove = async (): Promise<void> => {
    if (!currentRequest) {
      return;
    }

    try {
      setIsProcessing(true);
      await window.electronAPI.discovery.approveJoinRequest(currentRequest.id, selectedRole);

      // Remove from pending list
      setPendingRequests((prev) => prev.filter((r) => r.id !== currentRequest.id));

      // Move to next request or close dialog
      const remaining = pendingRequests.filter((r) => r.id !== currentRequest.id);
      if (remaining.length > 0) {
        setCurrentRequest(remaining[0] ?? null);
      } else {
        setCurrentRequest(null);
        setShowDialog(false);
      }
    } catch (error) {
      console.error('Failed to approve join request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!currentRequest) {
      return;
    }

    try {
      setIsProcessing(true);
      await window.electronAPI.discovery.rejectJoinRequest(currentRequest.id);

      // Remove from pending list
      setPendingRequests((prev) => prev.filter((r) => r.id !== currentRequest.id));

      // Move to next request or close dialog
      const remaining = pendingRequests.filter((r) => r.id !== currentRequest.id);
      if (remaining.length > 0) {
        setCurrentRequest(remaining[0] ?? null);
      } else {
        setCurrentRequest(null);
        setShowDialog(false);
      }
    } catch (error) {
      console.error('Failed to reject join request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isAdmin || !showDialog || !currentRequest) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Join Request
          </DialogTitle>
          <DialogDescription>A device wants to join your family</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{currentRequest.deviceName}</p>
                <p className="text-sm text-muted-foreground">
                  Requested at {formatTime(currentRequest.requestedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Assign Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value: PermissionRole) => setSelectedRole(value)}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex flex-col">
                    <span>Member</span>
                    <span className="text-xs text-muted-foreground">
                      Can create, edit, and delete content
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex flex-col">
                    <span>Viewer</span>
                    <span className="text-xs text-muted-foreground">
                      Can only view content, no editing
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex flex-col">
                    <span>Admin</span>
                    <span className="text-xs text-muted-foreground">
                      Full access to all features and settings
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pendingRequests.length > 1 && (
            <p className="text-center text-sm text-muted-foreground">
              {pendingRequests.length - 1} more request(s) pending
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button disabled={isProcessing} variant="outline" onClick={() => void handleReject()}>
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            Reject
          </Button>
          <Button disabled={isProcessing} onClick={() => void handleApprove()}>
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Approve as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
