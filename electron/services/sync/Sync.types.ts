/**
 * Sync Types - Type definitions for P2P synchronization
 */

/// <reference types="node" />

import type { EventEmitter } from 'events';

// WebRTC types for Electron main process (using @roamhq/wrtc package types)
// These mirror the browser WebRTC API
export interface RTCConfiguration {
  iceServers?: RTCIceServer[];
  iceCandidatePoolSize?: number;
}

export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface RTCSessionDescriptionInit {
  type: RTCSdpType;
  sdp?: string;
}

export type RTCSdpType = 'offer' | 'answer' | 'pranswer' | 'rollback';

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export type RTCDataChannelState = 'connecting' | 'open' | 'closing' | 'closed';
export type RTCPeerConnectionState =
  | 'closed'
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'failed'
  | 'new';
export type RTCIceConnectionState =
  | 'checking'
  | 'closed'
  | 'completed'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'new';

// Simplified interfaces for our use case
export interface DataChannelLike {
  readyState: RTCDataChannelState;
  send(data: string | ArrayBuffer): void;
  close(): void;
  onopen: ((event: Event) => void) | null;
  onclose: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
}

export interface PeerConnectionLike {
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  createOffer(): Promise<RTCSessionDescriptionInit>;
  createAnswer(): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void>;
  setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void>;
  addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
  createDataChannel(label: string, options?: RTCDataChannelOptions): DataChannelLike;
  close(): void;
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null;
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null;
  onconnectionstatechange: ((event: Event) => void) | null;
}

export interface RTCDataChannelOptions {
  ordered?: boolean;
  maxRetransmits?: number;
  maxPacketLifeTime?: number;
  protocol?: string;
  negotiated?: boolean;
  id?: number;
}

export interface RTCPeerConnectionIceEvent {
  candidate: RTCIceCandidateInit | null;
}

export interface RTCDataChannelEvent {
  channel: DataChannelLike;
}

/** Protocol version for sync compatibility */
export const SYNC_PROTOCOL_VERSION = '1';

/** Service type for mDNS discovery */
export const MDNS_SERVICE_TYPE = 'familysync';

/** Sync message types */
export type SyncMessageType =
  | 'SYNC_STEP_1'
  | 'SYNC_STEP_2'
  | 'UPDATE'
  | 'AWARENESS'
  | 'AUTH_REQUEST'
  | 'AUTH_RESPONSE'
  | 'PING'
  | 'PONG';

/** Sync connection status */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'syncing'
  | 'error';

/** Discovered peer from mDNS */
export interface DiscoveredPeer {
  /** Device unique identifier */
  deviceId: string;
  /** Device display name */
  deviceName: string;
  /** Family ID hash for matching */
  familyIdHash: string;
  /** Host address (IP) */
  host: string;
  /** Port for signaling connection */
  port: number;
  /** Protocol version */
  protocolVersion: string;
  /** App version */
  appVersion?: string;
  /** Timestamp when discovered */
  discoveredAt: number;
}

/** Peer connection info */
export interface PeerConnection {
  /** Device ID */
  deviceId: string;
  /** Device name */
  deviceName: string;
  /** Connection status */
  status: ConnectionStatus;
  /** PeerConnection instance */
  peerConnection: PeerConnectionLike | null;
  /** DataChannel for sync */
  dataChannel: DataChannelLike | null;
  /** Last seen timestamp */
  lastSeen: number;
  /** Last sync timestamp */
  lastSyncAt: number | null;
  /** Connection error if any */
  error?: string;
}

/** Signaling message for WebRTC */
export interface SignalingMessage {
  /** Message type */
  type: 'offer' | 'answer' | 'ice-candidate';
  /** Sender device ID */
  from: string;
  /** Target device ID */
  to: string;
  /** SDP or ICE candidate payload */
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  /** Message signature for verification */
  signature: string;
  /** Timestamp */
  timestamp: number;
}

/** Sync protocol message */
export interface SyncMessage {
  /** Message type */
  type: SyncMessageType;
  /** Encrypted payload (base64) */
  payload: string;
  /** Timestamp */
  timestamp: number;
}

/** Authentication request message */
export interface AuthRequest {
  type: 'AUTH_REQUEST';
  deviceId: string;
  deviceName: string;
  timestamp: number;
  signature: string;
}

/** Authentication response message */
export interface AuthResponse {
  type: 'AUTH_RESPONSE';
  deviceId: string;
  deviceName: string;
  timestamp: number;
  signature: string;
  success: boolean;
}

/** Awareness state for real-time presence */
export interface AwarenessState {
  /** User/device ID */
  deviceId: string;
  /** Device display name */
  deviceName: string;
  /** Current view */
  currentView: 'calendar' | 'tasks' | 'email' | 'settings' | 'family';
  /** Current item being viewed/edited */
  currentItemId?: string;
  /** Last activity timestamp */
  lastSeen: number;
}

/** Sync service status */
export interface SyncStatus {
  /** Overall sync status */
  status: 'offline' | 'discovering' | 'connecting' | 'connected' | 'syncing';
  /** Number of connected peers */
  peerCount: number;
  /** Last successful sync */
  lastSyncAt: number | null;
  /** Current error if any */
  error?: string;
}

/** Sync service configuration */
export interface SyncConfig {
  /** Device ID */
  deviceId: string;
  /** Device name */
  deviceName: string;
  /** Family ID */
  familyId: string;
  /** Encryption key for data */
  encryptionKey?: Uint8Array;
}

/** Events emitted by sync services */
export interface SyncServiceEvents {
  'peer-discovered': (peer: DiscoveredPeer) => void;
  'peer-lost': (deviceId: string) => void;
  'peer-connected': (connection: PeerConnection) => void;
  'peer-disconnected': (deviceId: string) => void;
  'peer-authenticated': (deviceId: string) => void;
  'sync-started': () => void;
  'sync-completed': () => void;
  'sync-error': (error: Error) => void;
  'awareness-update': (states: Map<string, AwarenessState>) => void;
  'status-changed': (status: SyncStatus) => void;
}

/** Type-safe event emitter helper type for sync services */
export type SyncEventEmitter = EventEmitter & {
  on<K extends keyof SyncServiceEvents>(event: K, listener: SyncServiceEvents[K]): EventEmitter;
  emit<K extends keyof SyncServiceEvents>(
    event: K,
    ...args: Parameters<SyncServiceEvents[K]>
  ): boolean;
  off<K extends keyof SyncServiceEvents>(event: K, listener: SyncServiceEvents[K]): EventEmitter;
};
