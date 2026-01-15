/**
 * Yjs Sync Provider - Handles Yjs CRDT synchronization over WebRTC
 *
 * Implements the Yjs sync protocol for exchanging document state
 * and updates between peers.
 */

import { EventEmitter } from 'events';

import * as awarenessProtocol from 'y-protocols/awareness';
import * as Y from 'yjs';

import { debounce, throttle } from './SyncPerformance';

import type { SyncMessageType, AwarenessState, DataChannelLike } from './Sync.types';

/** Sync performance configuration */
const SYNC_CONFIG = {
  /** Debounce delay for document updates (ms) */
  UPDATE_DEBOUNCE_MS: 100,
  /** Throttle interval for awareness updates (ms) */
  AWARENESS_THROTTLE_MS: 200,
  /** Max pending updates before force flush (memory limit) */
  MAX_PENDING_UPDATES: 50,
  /** Max total bytes in pending updates before force flush */
  MAX_PENDING_BYTES: 1024 * 1024, // 1MB
} as const;

/** Sync provider configuration */
interface YjsSyncProviderConfig {
  deviceId: string;
  deviceName: string;
  /** Encryption key for E2EE (optional, handled by EncryptionService if provided) */
  encryptionKey?: Uint8Array;
}

/** Events emitted by YjsSyncProvider */
interface YjsSyncProviderEvents {
  'sync-started': (deviceId: string) => void;
  'sync-completed': (deviceId: string) => void;
  'sync-error': (deviceId: string, error: Error) => void;
  'awareness-update': (states: Map<number, AwarenessState>) => void;
}

/** Sync message structure */
interface SyncMessage {
  type: SyncMessageType;
  payload: string; // Base64 encoded
  timestamp: number;
}

/** Connected peer info */
interface SyncPeer {
  deviceId: string;
  channel: DataChannelLike;
  synced: boolean;
  lastSyncAt: number | null;
}

export class YjsSyncProvider extends EventEmitter {
  private config: YjsSyncProviderConfig | null = null;
  private ydoc: Y.Doc | null = null;
  private awareness: awarenessProtocol.Awareness | null = null;
  private peers: Map<string, SyncPeer> = new Map();
  private updateHandler: ((update: Uint8Array, origin: unknown) => void) | null = null;
  private awarenessHandler:
    | ((changes: { added: number[]; updated: number[]; removed: number[] }) => void)
    | null = null;

  // Debounced/throttled handlers
  private debouncedBroadcastUpdate:
    | ((() => void) & { cancel: () => void; flush: () => void })
    | null = null;
  private throttledBroadcastAwareness:
    | (((encodedAwareness: Uint8Array) => void) & { cancel: () => void })
    | null = null;
  private pendingUpdates: Uint8Array[] = [];
  private pendingBytes = 0;

  constructor() {
    super();
  }

  /**
   * Initialize the sync provider with a Yjs document
   */
  initialize(config: YjsSyncProviderConfig, ydoc: Y.Doc): void {
    this.config = config;
    this.ydoc = ydoc;

    // Set up awareness
    this.awareness = new awarenessProtocol.Awareness(ydoc);
    this.setupAwareness();

    // Create debounced broadcast function for updates
    this.debouncedBroadcastUpdate = debounce(
      () => this.flushPendingUpdates(),
      SYNC_CONFIG.UPDATE_DEBOUNCE_MS,
      { leading: false, trailing: true }
    );

    // Listen for local document updates with memory-limited batching
    this.updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote') {
        // Queue update
        this.pendingUpdates.push(update);
        this.pendingBytes += update.byteLength;

        // Force flush if memory limits exceeded
        if (
          this.pendingUpdates.length >= SYNC_CONFIG.MAX_PENDING_UPDATES ||
          this.pendingBytes >= SYNC_CONFIG.MAX_PENDING_BYTES
        ) {
          this.debouncedBroadcastUpdate?.flush();
        } else {
          this.debouncedBroadcastUpdate?.();
        }
      }
    };
    this.ydoc.on('update', this.updateHandler);
  }

  /**
   * Flush pending updates - merges multiple updates into one for efficiency
   */
  private flushPendingUpdates(): void {
    if (this.pendingUpdates.length === 0) {
      return;
    }

    // Take ownership of pending updates and reset counters
    const updates = this.pendingUpdates;
    this.pendingUpdates = [];
    this.pendingBytes = 0;

    // Merge and broadcast synchronously to avoid memory buildup
    try {
      const mergedUpdate = Y.mergeUpdates(updates);
      this.broadcastUpdateDirect(mergedUpdate);
    } catch (error) {
      console.error('[YjsSyncProvider] Failed to merge/broadcast updates:', error);
    }
  }

  /**
   * Broadcast update directly to all peers (synchronous, simple)
   */
  private broadcastUpdateDirect(update: Uint8Array): void {
    for (const [deviceId, peer] of this.peers) {
      if (peer.synced && peer.channel.readyState === 'open') {
        this.sendSyncMessage(deviceId, 'UPDATE', update);
      }
    }
  }

  /**
   * Set up awareness protocol with throttled updates
   */
  private setupAwareness(): void {
    if (!this.awareness || !this.config) {
      return;
    }

    // Set local awareness state
    this.awareness.setLocalState({
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName,
      currentView: 'family',
      lastSeen: Date.now(),
    } as AwarenessState);

    // Create throttled awareness broadcast
    this.throttledBroadcastAwareness = throttle(
      (encodedAwareness: Uint8Array) => this.broadcastAwareness(encodedAwareness),
      SYNC_CONFIG.AWARENESS_THROTTLE_MS,
      { leading: true, trailing: true }
    );

    // Listen for awareness changes with throttling
    this.awarenessHandler = (changes) => {
      if (!this.awareness) {
        return;
      }

      // Encode awareness update (fast operation)
      const encodedAwareness = awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
        ...changes.added,
        ...changes.updated,
        ...changes.removed,
      ]);

      // Throttle the broadcast
      this.throttledBroadcastAwareness?.(encodedAwareness);

      // Emit event with current states (deferred to avoid blocking)
      setImmediate(() => {
        if (!this.awareness) {
          return;
        }
        const states = new Map<number, AwarenessState>();
        this.awareness.getStates().forEach((state, clientId) => {
          states.set(clientId, state as AwarenessState);
        });
        this.emit('awareness-update', states);
      });
    };
    this.awareness.on('change', this.awarenessHandler);
  }

  /**
   * Add a peer for synchronization
   */
  addPeer(deviceId: string, channel: DataChannelLike): void {
    if (!this.ydoc) {
      throw new Error('YjsSyncProvider not initialized');
    }

    const peer: SyncPeer = {
      deviceId,
      channel,
      synced: false,
      lastSyncAt: null,
    };

    this.peers.set(deviceId, peer);

    // Set up message handler for this peer
    const originalHandler = channel.onmessage;
    channel.onmessage = (event: MessageEvent) => {
      const data = typeof event.data === 'string' ? event.data : '';
      this.handlePeerMessage(deviceId, data);

      // Call original handler if exists
      if (originalHandler) {
        originalHandler.call(channel, event);
      }
    };

    // Start sync with this peer
    this.startSync(deviceId);
  }

  /**
   * Remove a peer
   */
  removePeer(deviceId: string): void {
    this.peers.delete(deviceId);
  }

  /**
   * Start synchronization with a peer
   */
  private startSync(deviceId: string): void {
    if (!this.ydoc) {
      return;
    }

    const peer = this.peers.get(deviceId);
    if (!peer) {
      return;
    }

    this.emit('sync-started', deviceId);

    // Send sync step 1 (our state vector)
    const stateVector = Y.encodeStateVector(this.ydoc);
    this.sendSyncMessage(deviceId, 'SYNC_STEP_1', stateVector);
  }

  /**
   * Handle incoming message from peer
   */
  private handlePeerMessage(deviceId: string, data: string): void {
    try {
      const message = JSON.parse(data) as SyncMessage;

      // Skip non-sync messages
      if (!['SYNC_STEP_1', 'SYNC_STEP_2', 'UPDATE', 'AWARENESS'].includes(message.type)) {
        return;
      }

      const payload = this.base64ToUint8Array(message.payload);
      this.processMessage(deviceId, message.type, payload);
    } catch {
      // Not a sync message, ignore
    }
  }

  /**
   * Process sync protocol message
   */
  private processMessage(deviceId: string, type: SyncMessageType, payload: Uint8Array): void {
    if (!this.ydoc) {
      return;
    }

    const peer = this.peers.get(deviceId);
    if (!peer) {
      return;
    }

    switch (type) {
      case 'SYNC_STEP_1':
        // Peer sent their state vector, respond with missing updates
        this.handleSyncStep1(deviceId, payload);
        break;

      case 'SYNC_STEP_2':
        // Peer sent missing updates
        this.handleSyncStep2(deviceId, payload);
        break;

      case 'UPDATE':
        // Incremental update
        this.handleUpdate(deviceId, payload);
        break;

      case 'AWARENESS':
        // Awareness update
        this.handleAwareness(payload);
        break;
    }
  }

  /**
   * Handle sync step 1 (state vector from peer) - deferred to avoid blocking
   */
  private handleSyncStep1(deviceId: string, stateVector: Uint8Array): void {
    if (!this.ydoc) {
      return;
    }

    const ydoc = this.ydoc;

    // Defer heavy Yjs operations to next tick to avoid blocking UI
    setImmediate(() => {
      // Calculate and send missing updates
      const missingUpdates = Y.encodeStateAsUpdate(ydoc, stateVector);
      this.sendSyncMessage(deviceId, 'SYNC_STEP_2', missingUpdates);

      // Also send our state vector for peer to respond with their updates
      const ourStateVector = Y.encodeStateVector(ydoc);
      this.sendSyncMessage(deviceId, 'SYNC_STEP_1', ourStateVector);
    });
  }

  /**
   * Handle sync step 2 (missing updates from peer) - deferred to avoid blocking
   */
  private handleSyncStep2(deviceId: string, updates: Uint8Array): void {
    if (!this.ydoc) {
      return;
    }

    const ydoc = this.ydoc;

    // Defer update application to next tick
    setImmediate(() => {
      // Apply the updates
      Y.applyUpdate(ydoc, updates, 'remote');

      // Mark peer as synced
      const peer = this.peers.get(deviceId);
      if (peer) {
        peer.synced = true;
        peer.lastSyncAt = Date.now();
        this.emit('sync-completed', deviceId);
      }
    });
  }

  /**
   * Handle incremental update from peer - deferred to avoid blocking
   */
  private handleUpdate(deviceId: string, update: Uint8Array): void {
    if (!this.ydoc) {
      return;
    }

    const ydoc = this.ydoc;

    // Defer update application to next tick
    setImmediate(() => {
      Y.applyUpdate(ydoc, update, 'remote');

      // Update last sync time
      const peer = this.peers.get(deviceId);
      if (peer) {
        peer.lastSyncAt = Date.now();
      }
    });
  }

  /**
   * Handle awareness update from peer
   */
  private handleAwareness(encodedAwareness: Uint8Array): void {
    if (!this.awareness) {
      return;
    }

    awarenessProtocol.applyAwarenessUpdate(this.awareness, encodedAwareness, 'remote');
  }

  /**
   * Broadcast awareness to all peers
   */
  private broadcastAwareness(encodedAwareness: Uint8Array): void {
    for (const [deviceId, peer] of this.peers) {
      if (peer.channel.readyState === 'open') {
        this.sendSyncMessage(deviceId, 'AWARENESS', encodedAwareness);
      }
    }
  }

  /**
   * Send a sync message to a specific peer
   */
  private sendSyncMessage(deviceId: string, type: SyncMessageType, payload: Uint8Array): void {
    const peer = this.peers.get(deviceId);
    if (peer?.channel.readyState !== 'open') {
      return;
    }

    const message: SyncMessage = {
      type,
      payload: this.uint8ArrayToBase64(payload),
      timestamp: Date.now(),
    };

    peer.channel.send(JSON.stringify(message));
  }

  /**
   * Update local awareness state
   */
  setAwarenessState(state: Partial<AwarenessState>): void {
    if (!this.awareness || !this.config) {
      return;
    }

    const currentState = this.awareness.getLocalState() as AwarenessState | null;
    this.awareness.setLocalState({
      ...currentState,
      ...state,
      deviceId: this.config.deviceId,
      lastSeen: Date.now(),
    });
  }

  /**
   * Get awareness states for all peers
   */
  getAwarenessStates(): Map<number, AwarenessState> {
    const states = new Map<number, AwarenessState>();
    if (this.awareness) {
      this.awareness.getStates().forEach((state, clientId) => {
        states.set(clientId, state as AwarenessState);
      });
    }
    return states;
  }

  /**
   * Get peer sync status
   */
  getPeerStatus(deviceId: string): { synced: boolean; lastSyncAt: number | null } | undefined {
    const peer = this.peers.get(deviceId);
    if (!peer) {
      return undefined;
    }
    return {
      synced: peer.synced,
      lastSyncAt: peer.lastSyncAt,
    };
  }

  /**
   * Get all synced peer IDs
   */
  getSyncedPeerIds(): string[] {
    return Array.from(this.peers.entries())
      .filter(([_, peer]) => peer.synced)
      .map(([id]) => id);
  }

  /**
   * Force sync with all peers
   */
  forceSync(): void {
    for (const deviceId of this.peers.keys()) {
      this.startSync(deviceId);
    }
  }

  /**
   * Convert Uint8Array to base64 string
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64');
  }

  /**
   * Convert base64 string to Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  /**
   * Destroy the sync provider
   */
  destroy(): void {
    // Cancel debounced/throttled handlers
    this.debouncedBroadcastUpdate?.cancel();
    this.throttledBroadcastAwareness?.cancel();

    // Flush any pending updates before destroying
    if (this.pendingUpdates.length > 0) {
      this.debouncedBroadcastUpdate?.flush();
    }

    // Remove listeners from ydoc
    if (this.ydoc && this.updateHandler) {
      this.ydoc.off('update', this.updateHandler);
    }

    // Remove awareness listeners
    if (this.awareness && this.awarenessHandler) {
      this.awareness.off('change', this.awarenessHandler);
      this.awareness.destroy();
    }

    // Clear peers
    this.peers.clear();

    // Clear references
    this.ydoc = null;
    this.awareness = null;
    this.config = null;
    this.updateHandler = null;
    this.awarenessHandler = null;
    this.debouncedBroadcastUpdate = null;
    this.throttledBroadcastAwareness = null;
    this.pendingUpdates = [];

    this.removeAllListeners();
  }

  // Type-safe event methods
  override on<K extends keyof YjsSyncProviderEvents>(
    event: K,
    listener: YjsSyncProviderEvents[K]
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override emit<K extends keyof YjsSyncProviderEvents>(
    event: K,
    ...args: Parameters<YjsSyncProviderEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  override off<K extends keyof YjsSyncProviderEvents>(
    event: K,
    listener: YjsSyncProviderEvents[K]
  ): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}
