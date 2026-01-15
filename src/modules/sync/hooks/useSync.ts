/**
 * useSync Hook - React hook for P2P sync operations
 *
 * Provides access to sync status, peer connections, and sync actions
 * with automatic status updates from the main process.
 */

import { useCallback, useEffect } from 'react';

import { useSyncStore } from '../stores/sync.store';

import type { PeerInfo, DiscoveredPeerInfo, SyncStatus, SyncStore } from '../stores/sync.store';

/** Sync API from preload */
interface SyncAPI {
  getStatus: () => Promise<{
    status: SyncStatus;
    peerCount: number;
    lastSyncAt: number | null;
    error?: string;
  }>;
  forceSync: () => Promise<{ success: boolean }>;
  getPeers: () => Promise<PeerInfo[]>;
  start: () => Promise<{ success: boolean }>;
  stop: () => Promise<{ success: boolean }>;
  getDiscoveredPeers: () => Promise<DiscoveredPeerInfo[]>;
}

/** Get sync API from window.electronAPI */
function getSyncAPI(): SyncAPI {
  const api = (window as unknown as { electronAPI?: { sync?: SyncAPI } }).electronAPI?.sync;
  if (!api) {
    throw new Error('Sync API not available');
  }
  return api;
}

/** Hook return type */
interface UseSyncReturn {
  // State
  status: SyncStatus;
  peers: PeerInfo[];
  discoveredPeers: DiscoveredPeerInfo[];
  peerCount: number;
  lastSyncAt: number | null;
  error: string | null;
  isConnected: boolean;
  statusText: string;

  // Actions
  refreshStatus: () => Promise<void>;
  refreshPeers: () => Promise<void>;
  forceSync: () => Promise<boolean>;
  startSync: () => Promise<boolean>;
  stopSync: () => Promise<boolean>;
}

export function useSync(): UseSyncReturn {
  const store = useSyncStore();

  // Refresh sync status from main process
  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const api = getSyncAPI();
      const status = await api.getStatus();
      store.setStatus(status.status);
      store.setPeerCount(status.peerCount);
      store.setLastSyncAt(status.lastSyncAt);
      store.setError(status.error ?? null);
      store.setInitialized(true);
    } catch (error) {
      console.error('[useSync] Failed to refresh status:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to get sync status');
    }
  }, [store]);

  // Refresh peer list from main process
  const refreshPeers = useCallback(async (): Promise<void> => {
    try {
      const api = getSyncAPI();
      const [peers, discoveredPeers] = await Promise.all([
        api.getPeers(),
        api.getDiscoveredPeers(),
      ]);
      store.setPeers(peers);
      store.setDiscoveredPeers(discoveredPeers);
    } catch (error) {
      console.error('[useSync] Failed to refresh peers:', error);
    }
  }, [store]);

  // Force sync with all peers
  const forceSync = useCallback(async (): Promise<boolean> => {
    try {
      const api = getSyncAPI();
      const result = await api.forceSync();
      if (!result.success) {
        console.error('[useSync] Force sync failed:', (result as { error?: string }).error);
        return false;
      }
      await refreshStatus();
      return true;
    } catch (error) {
      console.error('[useSync] Failed to force sync:', error);
      return false;
    }
  }, [refreshStatus]);

  // Start sync service
  const startSync = useCallback(async (): Promise<boolean> => {
    try {
      const api = getSyncAPI();
      const result = await api.start();
      if (!result.success) {
        console.error('[useSync] Start sync failed:', (result as { error?: string }).error);
        return false;
      }
      await refreshStatus();
      return true;
    } catch (error) {
      console.error('[useSync] Failed to start sync:', error);
      return false;
    }
  }, [refreshStatus]);

  // Stop sync service
  const stopSync = useCallback(async (): Promise<boolean> => {
    try {
      const api = getSyncAPI();
      const result = await api.stop();
      if (!result.success) {
        console.error('[useSync] Stop sync failed:', (result as { error?: string }).error);
        return false;
      }
      await refreshStatus();
      return true;
    } catch (error) {
      console.error('[useSync] Failed to stop sync:', error);
      return false;
    }
  }, [refreshStatus]);

  // Global state for singleton pattern (ref-like objects to avoid hook assignment warnings)
  const syncListenersSetupRef = { current: false };
  const syncStoreInstanceRef = { current: null as SyncStore | null };
  const syncHookCountRef = { current: 0 };

  const incrementHookCount = (): number => {
    syncHookCountRef.current += 1;
    return syncHookCountRef.current;
  };

  const decrementHookCount = (): number => {
    syncHookCountRef.current -= 1;
    return syncHookCountRef.current;
  };

  // Store event handlers for cleanup
  const statusHandler = (status: unknown): void => {
    if (!syncStoreInstanceRef.current) {
      return;
    }
    if (status && typeof status === 'object') {
      const s = status as {
        status?: SyncStatus;
        peerCount?: number;
        lastSyncAt?: number | null;
        error?: string;
      };
      if (s.status) {
        syncStoreInstanceRef.current.setStatus(s.status);
      }
      if (typeof s.peerCount === 'number') {
        syncStoreInstanceRef.current.setPeerCount(s.peerCount);
      }
      if (s.lastSyncAt !== undefined) {
        syncStoreInstanceRef.current.setLastSyncAt(s.lastSyncAt);
      }
      if (s.error !== undefined) {
        syncStoreInstanceRef.current.setError(s.error ?? null);
      }
    }
  };

  const peerConnectedHandler = (peer: unknown): void => {
    if (!syncStoreInstanceRef.current) {
      return;
    }
    if (peer && typeof peer === 'object') {
      const p = peer as PeerInfo;
      if (p.deviceId) {
        syncStoreInstanceRef.current.addPeer(p);
      }
    }
  };

  const peerDisconnectedHandler = (deviceId: unknown): void => {
    if (!syncStoreInstanceRef.current) {
      return;
    }
    if (typeof deviceId === 'string') {
      syncStoreInstanceRef.current.removePeer(deviceId);
    }
  };

  // Set up event listeners for sync updates - stable dependencies to prevent re-renders
  useEffect(() => {
    const electronAPI = (
      window as unknown as {
        electronAPI?: {
          on: (channel: string, callback: (...args: unknown[]) => void) => void;
          off: (channel: string, callback: (...args: unknown[]) => void) => void;
          removeAllListeners: (channel: string) => void;
        };
      }
    ).electronAPI;

    if (!electronAPI) {
      return;
    }

    // Increment hook count
    incrementHookCount();

    // If this is the first instance, set up listeners
    if (!syncListenersSetupRef.current) {
      // Clean up any existing listeners as safety measure
      electronAPI.removeAllListeners('sync:status-changed');
      electronAPI.removeAllListeners('sync:peer-connected');
      electronAPI.removeAllListeners('sync:peer-disconnected');

      syncStoreInstanceRef.current = store;
      syncListenersSetupRef.current = true;

      // Subscribe to events
      electronAPI.on('sync:status-changed', statusHandler);
      electronAPI.on('sync:peer-connected', peerConnectedHandler);
      electronAPI.on('sync:peer-disconnected', peerDisconnectedHandler);

      // Initial refresh
      void refreshStatus();
      void refreshPeers();
    } else {
      // Update the store instance to current one
      syncStoreInstanceRef.current = store;
    }

    // Cleanup when hook unmounts
    return () => {
      // Decrement hook count
      const remainingHookCount = decrementHookCount();

      // Update store instance to next one if available
      if (remainingHookCount > 0 && syncStoreInstanceRef.current === store) {
        // Find another store instance (simplified - just keep current)
        syncStoreInstanceRef.current = store;
      }

      // Clean up listeners when last hook unmounts
      if (remainingHookCount === 0 && syncListenersSetupRef.current) {
        electronAPI.off('sync:status-changed', statusHandler);
        electronAPI.off('sync:peer-connected', peerConnectedHandler);
        electronAPI.off('sync:peer-disconnected', peerDisconnectedHandler);

        syncListenersSetupRef.current = false;
        syncStoreInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - listeners set up once, never re-run

  return {
    // State
    status: store.status,
    peers: store.peers,
    discoveredPeers: store.discoveredPeers,
    peerCount: store.peerCount,
    lastSyncAt: store.lastSyncAt,
    error: store.error,
    isConnected: store.isConnected(),
    statusText: store.getSyncStatusText(),

    // Actions
    refreshStatus,
    refreshPeers,
    forceSync,
    startSync,
    stopSync,
  };
}
