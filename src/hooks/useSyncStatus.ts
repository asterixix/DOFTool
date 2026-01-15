/**
 * useSyncStatus - Hook for managing sync status and peer connections
 *
 * Wraps the useSync hook with additional convenience methods and
 * automatic status refreshing.
 */

import { useEffect } from 'react';

import { useSync } from '@/modules/sync';

interface UseSyncStatusOptions {
  familyId?: string | undefined;
  autoConnect?: boolean;
}

type SyncResult = ReturnType<typeof useSync>;

interface UseSyncStatusResult {
  status: SyncResult['status'];
  peers: SyncResult['peers'];
  discoveredPeers: SyncResult['discoveredPeers'];
  peerCount: SyncResult['peerCount'];
  lastSyncAt: SyncResult['lastSyncAt'];
  error: SyncResult['error'];
  isConnected: SyncResult['isConnected'];
  statusText: SyncResult['statusText'];
  isConnecting: boolean;
  isSyncing: boolean;
  isDiscovering: boolean;
  isOffline: boolean;
  connectedPeerCount: number;
  totalPeerCount: number;
  discoveredPeerCount: number;
  refreshStatus: () => void;
  refreshPeers: () => void;
  forceSync: () => void;
  startSync: () => void;
  stopSync: () => void;
}

export function useSyncStatus({
  familyId,
  autoConnect = true,
}: UseSyncStatusOptions = {}): UseSyncStatusResult {
  const {
    status,
    peers,
    discoveredPeers,
    peerCount,
    lastSyncAt,
    error,
    isConnected,
    statusText,
    refreshStatus,
    refreshPeers,
    forceSync,
    startSync,
    stopSync,
  } = useSync();

  // Auto-start sync when familyId is available
  useEffect(() => {
    if (!autoConnect || !familyId) {
      return;
    }

    // Sync service is started automatically in main process when family exists
    // Just refresh status to get current state
    void refreshStatus();
    void refreshPeers();
  }, [familyId, autoConnect, refreshStatus, refreshPeers]);

  // Periodic status refresh
  useEffect(() => {
    if (status === 'offline') {
      return;
    }

    const interval = setInterval(() => {
      void refreshStatus();
      void refreshPeers();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [status, refreshStatus, refreshPeers]);

  // Get connected peer count
  const connectedPeerCount = peers.filter((p) => p.status === 'connected').length;

  return {
    status,
    peers,
    discoveredPeers,
    peerCount,
    lastSyncAt,
    error,
    statusText,
    isConnected,
    isConnecting: status === 'connecting',
    isSyncing: status === 'syncing',
    isDiscovering: status === 'discovering',
    isOffline: status === 'offline',
    connectedPeerCount,
    totalPeerCount: peers.length,
    discoveredPeerCount: discoveredPeers.length,
    // Actions
    refreshStatus: () => {
      void refreshStatus();
    },
    refreshPeers: () => {
      void refreshPeers();
    },
    forceSync: () => {
      void forceSync();
    },
    startSync: () => {
      void startSync();
    },
    stopSync: () => {
      void stopSync();
    },
  };
}
