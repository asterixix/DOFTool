/**
 * Sync Service - Main orchestrator for P2P synchronization using y-webrtc
 *
 * This service provides a simplified interface for P2P sync using y-webrtc,
 * which handles peer discovery, signaling, and WebRTC connections automatically.
 */

import { EventEmitter } from 'events';

import { WebrtcProvider } from 'y-webrtc';

import type {
  DiscoveredPeer,
  PeerConnection,
  SyncStatus,
  SyncConfig,
  AwarenessState,
} from './Sync.types';
import type * as Y from 'yjs';

/** Events emitted by SyncService */
interface SyncServiceEvents {
  'status-changed': (status: SyncStatus) => void;
  'peer-discovered': (peer: DiscoveredPeer) => void;
  'peer-lost': (deviceId: string) => void;
  'peer-connected': (connection: PeerConnection) => void;
  'peer-disconnected': (deviceId: string) => void;
  'sync-started': () => void;
  'sync-completed': () => void;
  'sync-error': (error: Error) => void;
  'awareness-update': (states: Map<number, AwarenessState>) => void;
  error: (error: Error) => void;
}

// y-webrtc event types
type WebrtcStatusEvent = { connected: boolean };
type WebrtcSyncedEvent = boolean | { synced: boolean }; // Can be boolean or object
type WebrtcPeersEvent = {
  added: string[];
  removed: string[];
  webrtcPeers: string[];
  bcPeers: string[];
};

export class SyncService extends EventEmitter {
  private config: SyncConfig | null = null;
  private ydoc: Y.Doc | null = null;
  private provider: WebrtcProvider | null = null;
  private isRunning = false;
  private isInitializing = false;
  private peers: Map<string, PeerConnection> = new Map();
  private status: SyncStatus = {
    status: 'offline',
    peerCount: 0,
    lastSyncAt: null,
  };

  constructor() {
    super();
  }

  /**
   * Set up event handlers to forward events from WebrtcProvider
   */
  private setupEventHandlers(provider: WebrtcProvider): void {
    // Status event - indicates connection to signaling server
    provider.on('status', (event: WebrtcStatusEvent) => {
      const connected = event.connected ?? false;
      if (connected) {
        this.updateStatus('discovering');
      } else if (this.isRunning) {
        this.updateStatus('offline');
        // Connection lost - emit error
        const error = new Error('WebRTC connection lost');
        this.emit('sync-error', error);
      }
    });

    // Peers event - indicates peer connections
    provider.on('peers', (event: WebrtcPeersEvent) => {
      console.log('[SyncService] Peers event:', {
        added: event.added?.length ?? 0,
        removed: event.removed?.length ?? 0,
        webrtcPeers: event.webrtcPeers?.length ?? 0,
        bcPeers: event.bcPeers?.length ?? 0,
      });
      this.handlePeersEvent(event);
    });

    // Synced event - indicates document sync state
    // Note: y-webrtc uses 'synced' event
    provider.on('synced', (event: WebrtcSyncedEvent) => {
      // Event might be boolean or object with synced property
      const isSynced =
        typeof event === 'boolean' ? event : ((event as { synced?: boolean }).synced ?? false);
      console.log('[SyncService] Synced event:', isSynced);

      if (isSynced) {
        this.status.lastSyncAt = Date.now();
        // Only update to syncing if we have peers, otherwise keep current status
        if (this.peers.size > 0) {
          this.updateStatus('syncing');
        }
        this.emit('sync-completed');
      } else {
        this.emit('sync-started');
      }
      this.emit('status-changed', { ...this.status });
    });

    // Awareness changes
    provider.awareness.on('change', () => {
      const states = this.getAwarenessStates();
      this.emit('awareness-update', states);
    });
  }

  private updateStatus(status: SyncStatus['status']): void {
    const previousStatus = this.status.status;
    this.status.status = status;
    this.status.peerCount = this.peers.size;

    if (previousStatus !== status) {
      console.log(
        `[SyncService] Status changed: ${previousStatus} -> ${status} (peers: ${this.peers.size})`
      );
    }

    this.emit('status-changed', { ...this.status });
  }

  private handlePeersEvent(event: WebrtcPeersEvent): void {
    const now = Date.now();
    const webrtcPeerIds = new Set(event.webrtcPeers || []);

    // Handle newly added peers
    for (const peerId of event.added || []) {
      if (!this.peers.has(peerId)) {
        const connection: PeerConnection = {
          deviceId: peerId,
          deviceName: peerId.slice(0, 8), // Use first 8 chars as device name
          status: webrtcPeerIds.has(peerId) ? 'connected' : 'connecting',
          peerConnection: null,
          dataChannel: null,
          lastSeen: now,
          lastSyncAt: null,
        };
        this.peers.set(peerId, connection);

        this.emit('peer-discovered', {
          deviceId: peerId,
          deviceName: connection.deviceName,
          familyIdHash: this.config?.familyId ?? '',
          host: 'webrtc',
          port: 0,
          protocolVersion: '1',
          discoveredAt: now,
        });

        if (connection.status === 'connected') {
          this.emit('peer-connected', connection);
        }
      }
    }

    // Handle removed peers
    for (const peerId of event.removed || []) {
      if (this.peers.has(peerId)) {
        this.peers.delete(peerId);
        this.emit('peer-disconnected', peerId);
        this.emit('peer-lost', peerId);
      }
    }

    // Update status of existing peers
    for (const [peerId, connection] of this.peers) {
      const isConnected = webrtcPeerIds.has(peerId);
      const nextStatus: PeerConnection['status'] = isConnected ? 'connected' : 'connecting';

      if (connection.status !== nextStatus) {
        connection.status = nextStatus;
        connection.lastSeen = now;

        if (nextStatus === 'connected') {
          connection.lastSyncAt = now;
          this.emit('peer-connected', connection);
        }
      }
    }

    // Update overall status based on peer count
    if (this.peers.size > 0) {
      const connectedCount = Array.from(this.peers.values()).filter(
        (p) => p.status === 'connected'
      ).length;

      if (connectedCount > 0) {
        this.updateStatus('connected');
      } else {
        this.updateStatus('connecting');
      }
    } else {
      this.updateStatus(this.isRunning ? 'discovering' : 'offline');
    }
  }

  /**
   * Initialize the sync service
   */
  async initialize(config: SyncConfig, ydoc: Y.Doc): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      console.log('[SyncService] Initialization already in progress, skipping...');
      return;
    }

    this.isInitializing = true;

    try {
      // Clean up existing provider if reinitializing
      if (this.provider) {
        console.log('[SyncService] Destroying existing provider...');
        try {
          // Stop the provider first
          if (this.isRunning) {
            this.provider.disconnect();
            this.isRunning = false;
          }
          // Destroy the provider (this should clean up the room)
          this.provider.destroy();
        } catch (error) {
          console.error('[SyncService] Error destroying provider:', error);
        }
        this.provider = null;
        // Give a small delay to ensure cleanup completes
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.config = config;
      this.ydoc = ydoc;

      // Create WebrtcProvider with room name (familyId) and password
      // The provider will automatically connect to signaling servers
      // y-webrtc uses a default signaling server, but we can configure custom ones if needed
      // Note: y-webrtc maintains a global room registry, so we need to handle "already exists" errors
      let provider: WebrtcProvider;
      try {
        provider = new WebrtcProvider(config.familyId, ydoc, {
          password: config.familyId,
          // Use default signaling servers from y-webrtc
          // If you need custom signaling, uncomment and configure:
          // signaling: ['wss://signaling.yjs.dev'],
          // Configure STUN servers for NAT traversal (helpful for local network)
          peerOpts: {
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ],
            },
          },
        });
      } catch (error) {
        // If room already exists, wait a bit and retry (the previous provider should be cleaned up)
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log('[SyncService] Room already exists, waiting for cleanup and retrying...');
          await new Promise((resolve) => setTimeout(resolve, 500));
          provider = new WebrtcProvider(config.familyId, ydoc, {
            password: config.familyId,
            peerOpts: {
              config: {
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                ],
              },
            },
          });
        } else {
          throw error;
        }
      }

      // Set up event handlers before connecting
      this.setupEventHandlers(provider);

      // Disconnect initially - we'll connect when start() is called
      provider.disconnect();
      this.provider = provider;

      this.updateStatus('offline');
      console.log('[SyncService] Initialized with y-webrtc backend');
      console.log('[SyncService] Room name (familyId):', config.familyId);
      console.log('[SyncService] Device ID:', config.deviceId);
      console.log('[SyncService] Device name:', config.deviceName);
    } catch (error) {
      console.error('[SyncService] Error during initialization:', error);
      this.isInitializing = false;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Start the sync service
   */
  start(): void {
    if (this.isRunning) {
      console.log('[SyncService] Already running');
      return;
    }

    if (!this.config || !this.ydoc || !this.provider) {
      console.error('[SyncService] Cannot start: not initialized');
      throw new Error('SyncService not initialized');
    }

    this.isRunning = true;

    // Connect to signaling server and start peer discovery
    console.log('[SyncService] Connecting to signaling server...');
    this.provider.connect();
    this.updateStatus('discovering');

    // Update awareness with device info
    this.setAwarenessState({
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName,
    });

    console.log('[SyncService] Started - connecting to peers...');
    console.log('[SyncService] Provider connected:', this.provider.connected);
  }

  /**
   * Stop the sync service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.provider?.disconnect();
    this.provider?.destroy();
    this.updateStatus('offline');

    console.log('[SyncService] Stopped');
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status, peerCount: this.peers.size };
  }

  /**
   * Get list of connected peers
   */
  getConnectedPeers(): PeerConnection[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get discovered peers (in y-webrtc, peers are connected via signaling)
   */
  getDiscoveredPeers(): DiscoveredPeer[] {
    return Array.from(this.peers.values()).map((peer) => ({
      deviceId: peer.deviceId,
      deviceName: peer.deviceName,
      familyIdHash: this.config?.familyId ?? '',
      host: 'webrtc',
      port: 0,
      protocolVersion: '1',
      discoveredAt: peer.lastSeen,
    }));
  }

  /**
   * Force sync with all peers
   */
  forceSync(): void {
    if (!this.provider) {
      return;
    }
    this.emit('sync-started');
    this.provider.disconnect();
    this.provider.connect();
  }

  /**
   * Update awareness state
   */
  setAwarenessState(state: Partial<AwarenessState>): void {
    if (!this.provider || !this.config) {
      return;
    }

    const currentState = this.provider.awareness.getLocalState() as AwarenessState | null;
    this.provider.awareness.setLocalState({
      ...currentState,
      ...state,
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName,
      lastSeen: Date.now(),
    });
  }

  /**
   * Get awareness states
   */
  getAwarenessStates(): Map<number, AwarenessState> {
    if (!this.provider) {
      return new Map();
    }

    const states = new Map<number, AwarenessState>();
    this.provider.awareness.getStates().forEach((state, clientId) => {
      states.set(clientId, state as AwarenessState);
    });
    return states;
  }

  /**
   * Check if service is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.config !== null && this.ydoc !== null && this.provider !== null;
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    this.stop();
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
    this.peers.clear();
    this.removeAllListeners();
    this.config = null;
    this.ydoc = null;
  }

  // Type-safe event methods
  override on<K extends keyof SyncServiceEvents>(event: K, listener: SyncServiceEvents[K]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override emit<K extends keyof SyncServiceEvents>(
    event: K,
    ...args: Parameters<SyncServiceEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  override off<K extends keyof SyncServiceEvents>(event: K, listener: SyncServiceEvents[K]): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}
