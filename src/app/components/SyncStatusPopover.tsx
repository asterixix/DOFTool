/**
 * SyncStatusPopover - Dropdown panel showing sync status and connected peers
 */

import { useState } from 'react';

import { formatDistanceToNow } from 'date-fns';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Monitor,
  Smartphone,
  Laptop,
  Search,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { cn } from '@/lib/utils';

import type { PeerInfo, DiscoveredPeerInfo } from '@/modules/sync';

function getDeviceIcon(deviceName: string): typeof Monitor {
  const name = deviceName.toLowerCase();
  if (name.includes('phone') || name.includes('mobile')) {return Smartphone;}
  if (name.includes('laptop')) {return Laptop;}
  return Monitor;
}

function PeerItem({ peer }: { peer: PeerInfo }): JSX.Element {
  const Icon = getDeviceIcon(peer.deviceName);
  const isConnected = peer.status === 'connected';
  const lastSeen = peer.lastSeen
    ? formatDistanceToNow(new Date(peer.lastSeen), { addSuffix: true })
    : 'Unknown';

  return (
    <div className="flex items-center gap-3 rounded-lg p-2">
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          isConnected
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{peer.deviceName}</p>
        <p className="text-xs text-muted-foreground">
          {isConnected ? 'Connected' : `Last seen ${lastSeen}`}
        </p>
      </div>
      <div
        className={cn(
          'h-2 w-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
        )}
      />
    </div>
  );
}

function DiscoveredPeerItem({ peer }: { peer: DiscoveredPeerInfo }): JSX.Element {
  const Icon = getDeviceIcon(peer.deviceName);

  return (
    <div className="flex items-center gap-3 rounded-lg p-2 opacity-60">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{peer.deviceName}</p>
        <p className="text-xs text-muted-foreground">Discovered on network</p>
      </div>
      <Search className="h-3 w-3 text-muted-foreground" />
    </div>
  );
}

export function SyncStatusPopover(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const {
    status,
    statusText,
    peers,
    discoveredPeers,
    lastSyncAt,
    connectedPeerCount,
    isConnected,
    isOffline,
    forceSync,
    startSync,
    stopSync,
  } = useSyncStatus();

  const handleForceSync = async (): Promise<void> => {
    await forceSync();
  };

  const handleToggleSync = async (): Promise<void> => {
    if (isOffline) {
      await startSync();
    } else {
      await stopSync();
    }
  };

  const lastSyncText = lastSyncAt
    ? `Last synced ${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}`
    : 'Never synced';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
            isConnected && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            status === 'syncing' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            status === 'discovering' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            status === 'connecting' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            isOffline && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          )}
          type="button"
        >
          {isOffline ? (
            <WifiOff className="h-3 w-3" />
          ) : (
            <Wifi className={cn('h-3 w-3', status === 'syncing' && 'animate-pulse')} />
          )}
          <span>{statusText}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0" sideOffset={8}>
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Sync Status</h3>
            <div className="flex items-center gap-1">
              {!isOffline && (
                <Button
                  className="h-8 w-8"
                  size="icon"
                  title="Force sync now"
                  variant="ghost"
                  onClick={handleForceSync}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{lastSyncText}</p>
        </div>

        <ScrollArea className="max-h-[300px]">
          {peers.length > 0 && (
            <div className="p-2">
              <p className="px-2 text-xs font-medium text-muted-foreground">
                Connected Devices ({connectedPeerCount})
              </p>
              <div className="mt-1">
                {peers.map((peer) => (
                  <PeerItem key={peer.deviceId} peer={peer} />
                ))}
              </div>
            </div>
          )}

          {discoveredPeers.length > 0 && (
            <>
              {peers.length > 0 && <Separator />}
              <div className="p-2">
                <p className="px-2 text-xs font-medium text-muted-foreground">
                  Discovered on Network ({discoveredPeers.length})
                </p>
                <div className="mt-1">
                  {discoveredPeers.map((peer) => (
                    <DiscoveredPeerItem key={peer.deviceId} peer={peer} />
                  ))}
                </div>
              </div>
            </>
          )}

          {peers.length === 0 && discoveredPeers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {isOffline ? (
                <>
                  <WifiOff className="mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Sync is offline</p>
                  <p className="mt-1 text-xs text-muted-foreground/75">
                    Start sync to discover devices
                  </p>
                </>
              ) : (
                <>
                  <Search className="mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Looking for devices...</p>
                  <p className="mt-1 text-xs text-muted-foreground/75">
                    Make sure other devices are on the same network
                  </p>
                </>
              )}
            </div>
          )}
        </ScrollArea>

        <Separator />
        <div className="p-2">
          <Button
            className="w-full"
            size="sm"
            variant={isOffline ? 'default' : 'outline'}
            onClick={handleToggleSync}
          >
            {isOffline ? 'Start Sync' : 'Stop Sync'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
