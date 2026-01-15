/**
 * Sync Store - Zustand state management for P2P sync status and peer connections
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/** Sync status from the main process */
export type SyncStatus = 'offline' | 'discovering' | 'connecting' | 'connected' | 'syncing';

/** Peer connection info */
export interface PeerInfo {
  deviceId: string;
  deviceName: string;
  status: string;
  lastSeen: number;
  lastSyncAt: number | null;
}

/** Discovered peer info */
export interface DiscoveredPeerInfo {
  deviceId: string;
  deviceName: string;
  host: string;
  port: number;
  discoveredAt: number;
}

export interface SyncStore {
  // State
  status: SyncStatus;
  peers: PeerInfo[];
  discoveredPeers: DiscoveredPeerInfo[];
  peerCount: number;
  lastSyncAt: number | null;
  error: string | null;
  isInitialized: boolean;

  // Actions
  setStatus: (status: SyncStatus) => void;
  setPeers: (peers: PeerInfo[]) => void;
  setDiscoveredPeers: (peers: DiscoveredPeerInfo[]) => void;
  setPeerCount: (count: number) => void;
  setLastSyncAt: (time: number | null) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  addPeer: (peer: PeerInfo) => void;
  removePeer: (deviceId: string) => void;
  updatePeer: (deviceId: string, updates: Partial<PeerInfo>) => void;

  // Computed helpers
  getConnectedPeerCount: () => number;
  getSyncStatusText: () => string;
  isConnected: () => boolean;

  // Reset
  reset: () => void;
}

const initialState = {
  status: 'offline' as SyncStatus,
  peers: [] as PeerInfo[],
  discoveredPeers: [] as DiscoveredPeerInfo[],
  peerCount: 0,
  lastSyncAt: null as number | null,
  error: null as string | null,
  isInitialized: false,
};

export const useSyncStore = create<SyncStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Setters
    setStatus: (status: SyncStatus) => set({ status }),
    setPeers: (peers: PeerInfo[]) => set({ peers, peerCount: peers.length }),
    setDiscoveredPeers: (discoveredPeers: DiscoveredPeerInfo[]) => set({ discoveredPeers }),
    setPeerCount: (peerCount: number) => set({ peerCount }),
    setLastSyncAt: (lastSyncAt: number | null) => set({ lastSyncAt }),
    setError: (error: string | null) => set({ error }),
    setInitialized: (isInitialized: boolean) => set({ isInitialized }),

    // Peer management
    addPeer: (peer: PeerInfo) =>
      set((state) => {
        const filtered = state.peers.filter((p) => p.deviceId !== peer.deviceId);
        const newPeers = [...filtered, peer];
        return { peers: newPeers, peerCount: newPeers.length };
      }),

    removePeer: (deviceId: string) =>
      set((state) => {
        const newPeers = state.peers.filter((p) => p.deviceId !== deviceId);
        return { peers: newPeers, peerCount: newPeers.length };
      }),

    updatePeer: (deviceId: string, updates: Partial<PeerInfo>) =>
      set((state) => ({
        peers: state.peers.map((p) =>
          p.deviceId === deviceId ? { ...p, ...updates } : p
        ),
      })),

    // Computed helpers
    getConnectedPeerCount: () => {
      const { peers } = get();
      return peers.filter((p) => p.status === 'connected').length;
    },

    getSyncStatusText: () => {
      const { status } = get();
      switch (status) {
        case 'connected': {
          const connectedCount = get().getConnectedPeerCount();
          return `${connectedCount} device${connectedCount !== 1 ? 's' : ''} connected`;
        }
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
    },

    isConnected: () => {
      const { status } = get();
      return status === 'connected' || status === 'syncing';
    },

    // Reset store to initial state
    reset: () => set(initialState),
  }))
);

// Selector hooks for optimized re-renders
export const selectSyncStatus = (state: SyncStore): SyncStatus => state.status;
export const selectPeers = (state: SyncStore): PeerInfo[] => state.peers;
export const selectDiscoveredPeers = (state: SyncStore): DiscoveredPeerInfo[] => state.discoveredPeers;
export const selectPeerCount = (state: SyncStore): number => state.peerCount;
export const selectLastSyncAt = (state: SyncStore): number | null => state.lastSyncAt;
export const selectIsConnected = (state: SyncStore): boolean => state.isConnected();
export const selectSyncStatusText = (state: SyncStore): string => state.getSyncStatusText();
export const selectConnectedPeerCount = (state: SyncStore): number => state.getConnectedPeerCount();
