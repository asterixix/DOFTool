/**
 * Sync Settings Section - Component for P2P synchronization settings
 */

import { useState } from 'react';

import { Network, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { trackModuleAction } from '@/hooks/useAnalytics';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export function SyncSettingsSection(): JSX.Element {
  const { status, peerCount, lastSyncAt } = useSyncStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleForceSync = async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      await window.electronAPI.sync.forceSync();
      trackModuleAction('general', 'force_sync_triggered', { peerCount, status });
    } catch (err) {
      console.error('Failed to force sync:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) {
      return 'Never';
    }
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    return date.toLocaleString();
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'connected':
      case 'syncing':
        return 'text-green-600';
      case 'connecting':
      case 'discovering':
        return 'text-yellow-600';
      case 'offline':
        return 'text-gray-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'connected':
        return `${peerCount} device${peerCount !== 1 ? 's' : ''} connected`;
      case 'syncing':
        return 'Syncing...';
      case 'connecting':
        return 'Connecting...';
      case 'discovering':
        return 'Discovering devices...';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          P2P Synchronization
        </CardTitle>
        <CardDescription>
          Manage peer-to-peer synchronization with other family devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sync Status</Label>
              <p className={`text-sm font-medium ${getStatusColor()}`}>{getStatusText()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Connected Devices</Label>
            <p className="text-sm text-muted-foreground">
              {peerCount === 0
                ? 'No devices connected'
                : `${peerCount} device${peerCount !== 1 ? 's' : ''} connected`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Last Sync</Label>
            <p className="text-sm text-muted-foreground">{formatLastSync(lastSyncAt)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            disabled={isRefreshing || status === 'offline'}
            variant="outline"
            onClick={handleForceSync}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              'Force Sync'
            )}
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            P2P synchronization uses local network discovery (mDNS) to find and connect to other
            family devices. Data is synchronized in real-time using CRDT technology for
            conflict-free collaboration.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
