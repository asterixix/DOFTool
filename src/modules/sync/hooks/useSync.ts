/**
 * useSync Hook - React hook for P2P sync operations
 *
 * Provides access to sync status, peer connections, and sync actions
 * with automatic status updates from the main process.
 */

import { useCallback, useEffect } from 'react';

import { useSyncStore } from '../stores/sync.store';

import type { PeerInfo, DiscoveredPeerInfo, SyncStatus , SyncStore } from '../stores/sync.store';


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

// Global state for singleton pattern
let syncListenersSetup = false;
let syncStoreInstance: SyncStore | null = null;
let syncHookCount = 0;

// Store event handlers for cleanup
let statusHandler: ((status: unknown) => void) | null = null;
let peerConnectedHandler: ((peer: unknown) => void) | null = null;
let peerDisconnectedHandler: ((deviceId: unknown) => void) | null = null;

// Set up event listeners for sync updates - stable dependencies to prevent re-renders
  useEffect(() => {
    const electronAPI = (window as unknown as {
      electronAPI?: {
        on: (channel: string, callback: (...args: unknown[]) => void) => void;
        off: (channel: string, callback: (...args: unknown[]) => void) => void;
        removeAllListeners: (channel: string) => void;
      };
    }).electronAPI;

    if (!electronAPI) {return;}

    // Increment hook count
    syncHookCount++;

    // If this is the first instance, set up listeners
    if (!syncListenersSetup) {
      // Clean up any existing listeners as safety measure
      electronAPI.removeAllListeners('sync:status-changed');
      electronAPI.removeAllListeners('sync:peer-connected');
      electronAPI.removeAllListeners('sync:peer-disconnected');
      
      syncStoreInstance = store;
      syncListenersSetup = true;

      // Handle status changes
      statusHandler = (status: unknown): void => {
        if (!syncStoreInstance) {return;}
        if (status && typeof status === 'object') {
          const s = status as {
            status?: SyncStatus;
            peerCount?: number;
            lastSyncAt?: number | null;
            error?: string;
          };
          if (s.status) {syncStoreInstance.setStatus(s.status);}
          if (typeof s.peerCount === 'number') {syncStoreInstance.setPeerCount(s.peerCount);}
          if (s.lastSyncAt !== undefined) {syncStoreInstance.setLastSyncAt(s.lastSyncAt);}
          if (s.error !== undefined) {syncStoreInstance.setError(s.error ?? null);}
        }
      };

      // Handle peer connected
      peerConnectedHandler = (peer: unknown): void => {
        if (!syncStoreInstance) {return;}
        if (peer && typeof peer === 'object') {
          const p = peer as PeerInfo;
          if (p.deviceId) {
            syncStoreInstance.addPeer(p);
          }
        }
      };

      // Handle peer disconnected
      peerDisconnectedHandler = (deviceId: unknown): void => {
        if (!syncStoreInstance) {return;}
        if (typeof deviceId === 'string') {
          syncStoreInstance.removePeer(deviceId);
        }
      };

      // Subscribe to events
      electronAPI.on('sync:status-changed', statusHandler);
      electronAPI.on('sync:peer-connected', peerConnectedHandler);
      electronAPI.on('sync:peer-disconnected', peerDisconnectedHandler);

      // Initial refresh
      void refreshStatus();
      void refreshPeers();
    } else {
      // Update the store instance to current one
      syncStoreInstance = store;
    }

    // Cleanup when hook unmounts
    return () => {
      // Decrement hook count
      syncHookCount--;
      
      // Update store instance to next one if available
      if (syncHookCount > 0 && syncStoreInstance === store) {
        // Find another store instance (simplified - just keep current)
        syncStoreInstance = store;
      }
      
      // Clean up listeners when last hook unmounts
      if (syncHookCount === 0 && syncListenersSetup) {
        if (statusHandler) {
          electronAPI.off('sync:status-changed', statusHandler);
          statusHandler = null;
        }
        if (peerConnectedHandler) {
          electronAPI.off('sync:peer-connected', peerConnectedHandler);
          peerConnectedHandler = null;
        }
        if (peerDisconnectedHandler) {
          electronAPI.off('sync:peer-disconnected', peerDisconnectedHandler);
          peerDisconnectedHandler = null;
        }
        
        syncListenersSetup = false;
        syncStoreInstance = null;
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
