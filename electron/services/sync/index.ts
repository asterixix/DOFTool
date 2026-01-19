/**
 * Sync Module - P2P synchronization services using y-webrtc
 *
 * Exports all sync-related services and types for use in the main process.
 */

export { SyncService } from './SyncService';

// Discovery service (unified for peer sync and family discovery)
export {
  DiscoveryService,
  type DiscoveredFamily,
  type JoinRequest,
  type JoinApproval,
  type DiscoveryConfig,
} from './DiscoveryService';
export { SignalingService } from './SignalingService';
export { PeerConnectionService, type WebRTCFactory } from './PeerConnectionService';
export { YjsSyncProvider } from './YjsSyncProvider';

// Performance utilities
export {
  debounce,
  throttle,
  BatchProcessor,
  AsyncQueue,
  deferToNextTick,
  chunkArray,
  processInChunks,
  RateLimiter,
  PerformanceMetrics,
  syncMetrics,
} from './SyncPerformance';

export type {
  // WebRTC types
  RTCConfiguration,
  RTCIceServer,
  RTCSessionDescriptionInit,
  RTCSdpType,
  RTCIceCandidateInit,
  RTCDataChannelState,
  RTCPeerConnectionState,
  RTCIceConnectionState,
  DataChannelLike,
  PeerConnectionLike,
  RTCDataChannelOptions,
  RTCPeerConnectionIceEvent,
  RTCDataChannelEvent,
  // Sync types
  SyncMessageType,
  ConnectionStatus,
  DiscoveredPeer,
  PeerConnection,
  SignalingMessage,
  SyncMessage,
  AuthRequest,
  AuthResponse,
  AwarenessState,
  SyncStatus,
  SyncConfig,
  SyncServiceEvents,
  SyncEventEmitter,
} from './Sync.types';

export { SYNC_PROTOCOL_VERSION, MDNS_SERVICE_TYPE } from './Sync.types';
