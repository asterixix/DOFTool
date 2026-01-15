/**
 * Sync Module - P2P synchronization for renderer process
 */

// Hooks
export { useSync } from './hooks';

// Store
export {
  useSyncStore,
  selectSyncStatus,
  selectPeers,
  selectDiscoveredPeers,
  selectPeerCount,
  selectLastSyncAt,
  selectIsConnected,
  selectSyncStatusText,
  selectConnectedPeerCount,
} from './stores/sync.store';

// Types
export type {
  SyncStatus,
  PeerInfo,
  DiscoveredPeerInfo,
} from './stores/sync.store';
