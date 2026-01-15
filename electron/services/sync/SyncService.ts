/**
 * Sync Service - Main orchestrator for P2P synchronization
 *
 * Coordinates mDNS discovery, WebRTC signaling, peer connections,
 * and Yjs document synchronization between family devices.
 */

import { EventEmitter } from 'events';

import { DiscoveryService } from './DiscoveryService';
import { PeerConnectionService } from './PeerConnectionService';
import { SignalingService } from './SignalingService';
import { throttle, debounce } from './SyncPerformance';
import { YjsSyncProvider } from './YjsSyncProvider';

/** Status update throttling configuration */
const STATUS_UPDATE_THROTTLE_MS = 100;
const PEER_COUNT_DEBOUNCE_MS = 200;

import type {
  DiscoveredPeer,
  PeerConnection,
  SyncStatus,
  SyncConfig,
  AwarenessState,
  SignalingMessage,
  RTCSessionDescriptionInit,
  RTCIceCandidateInit,
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
  'error': (error: Error) => void;
}

export class SyncService extends EventEmitter {
  private config: SyncConfig | null = null;
  private ydoc: Y.Doc | null = null;

  // Sub-services
  private discoveryService: DiscoveryService;
  private signalingService: SignalingService;
  private peerConnectionService: PeerConnectionService;
  private yjsSyncProvider: YjsSyncProvider;

  // State
  private status: SyncStatus = {
    status: 'offline',
    peerCount: 0,
    lastSyncAt: null,
  };
  private isRunning = false;
  private pendingConnections: Set<string> = new Set();

  // Performance: throttled/debounced handlers
  private throttledEmitStatus: ((status: SyncStatus) => void) & { cancel: () => void };
  private debouncedUpdatePeerCount: (() => void) & { cancel: () => void; flush: () => void };

  constructor() {
    super();

    this.discoveryService = new DiscoveryService();
    this.signalingService = new SignalingService();
    this.peerConnectionService = new PeerConnectionService();
    this.yjsSyncProvider = new YjsSyncProvider();

    // Throttle status emissions to prevent flooding the renderer
    this.throttledEmitStatus = throttle(
      (status: SyncStatus) => {
        this.emit('status-changed', status);
      },
      STATUS_UPDATE_THROTTLE_MS,
      { leading: true, trailing: true }
    );

    // Debounce peer count updates (multiple connections can change rapidly)
    this.debouncedUpdatePeerCount = debounce(
      () => this.updatePeerCountImmediate(),
      PEER_COUNT_DEBOUNCE_MS,
      { leading: false, trailing: true }
    );

    this.setupEventHandlers();
  }

  /**
   * Initialize the sync service
   */
  async initialize(config: SyncConfig, ydoc: Y.Doc): Promise<void> {
    this.config = config;
    this.ydoc = ydoc;

    // Initialize signaling service first to get port
    this.signalingService.initialize({
      deviceId: config.deviceId,
      deviceName: config.deviceName,
    });

    const signalingPort = await this.signalingService.start();

    // Initialize discovery service with signaling port
    this.discoveryService.initialize({
      ...config,
      signalingPort,
    });

    // Initialize peer connection service
    await this.peerConnectionService.initialize({
      deviceId: config.deviceId,
      deviceName: config.deviceName,
    });

    // Initialize Yjs sync provider
    this.yjsSyncProvider.initialize(
      {
        deviceId: config.deviceId,
        deviceName: config.deviceName,
        encryptionKey: config.encryptionKey,
      },
      ydoc
    );

    console.error('[SyncService] Initialized with signaling port', signalingPort);
  }

  /**
   * Set up event handlers for sub-services
   */
  private setupEventHandlers(): void {
    // Discovery events
    this.discoveryService.on('peer-discovered', (peer) => {
      this.handlePeerDiscovered(peer);
    });

    this.discoveryService.on('peer-lost', (deviceId) => {
      this.handlePeerLost(deviceId);
    });

    this.discoveryService.on('error', (error) => {
      console.error('[SyncService] Discovery error:', error);
      this.emit('error', error);
    });

    // Signaling events
    this.signalingService.on('message-received', (message, respond) => {
      this.handleSignalingMessage(message, respond);
    });

    // Peer connection events
    this.peerConnectionService.on('connection-state-changed', (deviceId, status) => {
      this.handleConnectionStateChanged(deviceId, status);
    });

    this.peerConnectionService.on('channel-open', (deviceId, channel) => {
      this.handleChannelOpen(deviceId, channel);
    });

    this.peerConnectionService.on('channel-closed', (deviceId) => {
      this.handleChannelClosed(deviceId);
    });

    this.peerConnectionService.on('ice-candidate', (deviceId, candidate) => {
      this.handleIceCandidate(deviceId, candidate);
    });

    this.peerConnectionService.on('authenticated', (deviceId) => {
      this.handlePeerAuthenticated(deviceId);
    });

    // Yjs sync events
    this.yjsSyncProvider.on('sync-started', (deviceId) => {
      console.error(`[SyncService] Sync started with ${deviceId}`);
    });

    this.yjsSyncProvider.on('sync-completed', (deviceId) => {
      console.error(`[SyncService] Sync completed with ${deviceId}`);
      this.updateStatus({ lastSyncAt: Date.now() });
      this.emit('sync-completed');
    });

    this.yjsSyncProvider.on('awareness-update', (states) => {
      this.emit('awareness-update', states);
    });
  }

  /**
   * Start the sync service
   */
  start(): void {
    if (this.isRunning) {return;}

    if (!this.config || !this.ydoc) {
      console.error('[SyncService] Cannot start: not initialized');
      throw new Error('SyncService not initialized');
    }

    this.isRunning = true;
    this.updateStatus({ status: 'discovering' });

    // Start discovery
    this.discoveryService.start();

    console.error('[SyncService] Started');
  }

  /**
   * Stop the sync service
   */
  stop(): void {
    if (!this.isRunning) {return;}

    this.isRunning = false;

    // Stop all services
    this.discoveryService.stop();
    this.peerConnectionService.closeAllConnections();
    this.signalingService.stop();

    this.pendingConnections.clear();
    this.updateStatus({ status: 'offline', peerCount: 0 });

    console.error('[SyncService] Stopped');
  }

  /**
   * Handle discovered peer
   */
  private handlePeerDiscovered(peer: DiscoveredPeer): void {
    console.error(`[SyncService] Peer discovered: ${peer.deviceName}`);
    this.emit('peer-discovered', peer);

    // Initiate connection if not already connecting
    if (!this.pendingConnections.has(peer.deviceId)) {
      this.initiateConnection(peer);
    }
  }

  /**
   * Handle peer going offline
   */
  private handlePeerLost(deviceId: string): void {
    console.error(`[SyncService] Peer lost: ${deviceId}`);

    this.pendingConnections.delete(deviceId);
    this.peerConnectionService.closeConnection(deviceId);
    this.yjsSyncProvider.removePeer(deviceId);
    this.emit('peer-lost', deviceId);

    this.updatePeerCount();
  }

  /**
   * Initiate connection to a discovered peer
   */
  private async initiateConnection(peer: DiscoveredPeer): Promise<void> {
    if (!this.config) {return;}

    // Use device ID comparison to determine who initiates
    // Higher ID initiates to prevent both sides trying simultaneously
    if (this.config.deviceId < peer.deviceId) {
      console.error(`[SyncService] Waiting for ${peer.deviceName} to initiate`);
      return;
    }

    this.pendingConnections.add(peer.deviceId);
    console.error(`[SyncService] Initiating connection to ${peer.deviceName}`);

    try {
      // Connect to peer's signaling server
      await this.signalingService.connectTo(peer.host, peer.port, peer.deviceId);

      // Create WebRTC offer
      const { offer } = await this.peerConnectionService.createConnection(peer);

      // Send offer via signaling
      const offerMessage = this.signalingService.createOfferMessage(
        peer.deviceId,
        offer,
        '' // TODO: Add signature
      );
      await this.signalingService.sendTo(peer.deviceId, offerMessage);
    } catch (error) {
      console.error(`[SyncService] Failed to initiate connection to ${peer.deviceName}:`, error);
      this.pendingConnections.delete(peer.deviceId);
    }
  }

  /**
   * Handle incoming signaling message
   */
  private async handleSignalingMessage(
    message: SignalingMessage,
    respond: (msg: SignalingMessage) => void
  ): Promise<void> {
    if (!this.config) {return;}

    // Ignore messages not for us
    if (message.to !== this.config.deviceId) {return;}

    const peer = this.discoveryService.getPeer(message.from);

    try {
      switch (message.type) {
        case 'offer':
          await this.handleOffer(message, peer, respond);
          break;

        case 'answer':
          await this.handleAnswer(message);
          break;

        case 'ice-candidate':
          await this.handleRemoteIceCandidate(message);
          break;
      }
    } catch (error) {
      console.error('[SyncService] Error handling signaling message:', error);
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(
    message: SignalingMessage,
    peer: DiscoveredPeer | undefined,
    respond: (msg: SignalingMessage) => void
  ): Promise<void> {
    if (!peer) {
      console.error('[SyncService] Received offer from unknown peer:', message.from);
      return;
    }

    console.error(`[SyncService] Received offer from ${peer.deviceName}`);

    this.pendingConnections.add(peer.deviceId);

    // Accept connection and create answer
    const answer = await this.peerConnectionService.acceptConnection(
      peer,
      message.payload as RTCSessionDescriptionInit
    );

    // Send answer
    const answerMessage = this.signalingService.createAnswerMessage(
      peer.deviceId,
      answer,
      '' // TODO: Add signature
    );
    respond(answerMessage);
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(message: SignalingMessage): Promise<void> {
    console.error(`[SyncService] Received answer from ${message.from}`);
    await this.peerConnectionService.handleAnswer(
      message.from,
      message.payload as RTCSessionDescriptionInit
    );
  }

  /**
   * Handle incoming ICE candidate
   */
  private async handleRemoteIceCandidate(message: SignalingMessage): Promise<void> {
    await this.peerConnectionService.addIceCandidate(
      message.from,
      message.payload as RTCIceCandidateInit
    );
  }

  /**
   * Handle local ICE candidate to send to peer
   */
  private async handleIceCandidate(
    deviceId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    if (!this.signalingService.isConnectedTo(deviceId)) {return;}

    const message = this.signalingService.createIceCandidateMessage(
      deviceId,
      candidate,
      '' // TODO: Add signature
    );

    try {
      await this.signalingService.sendTo(deviceId, message);
    } catch (error) {
      console.error('[SyncService] Failed to send ICE candidate:', error);
    }
  }

  /**
   * Handle connection state change
   */
  private handleConnectionStateChanged(
    deviceId: string,
    status: string
  ): void {
    console.error(`[SyncService] Connection state for ${deviceId}: ${status}`);

    if (status === 'connected') {
      this.updateStatus({ status: 'connected' });
    } else if (status === 'disconnected') {
      this.pendingConnections.delete(deviceId);
      this.yjsSyncProvider.removePeer(deviceId);
      this.emit('peer-disconnected', deviceId);
      this.updatePeerCount();
    }
  }

  /**
   * Handle data channel opening
   */
  private handleChannelOpen(deviceId: string, _channel: unknown): void {
    console.error(`[SyncService] Channel open with ${deviceId}`);
    // Channel is ready, authentication will happen next
  }

  /**
   * Handle data channel closing
   */
  private handleChannelClosed(deviceId: string): void {
    console.error(`[SyncService] Channel closed with ${deviceId}`);
    this.yjsSyncProvider.removePeer(deviceId);
    this.emit('peer-disconnected', deviceId);
    this.updatePeerCount();
  }

  /**
   * Handle peer authentication success
   */
  private handlePeerAuthenticated(deviceId: string): void {
    console.error(`[SyncService] Peer authenticated: ${deviceId}`);

    this.pendingConnections.delete(deviceId);

    // Get the connection and add to sync provider
    const connection = this.peerConnectionService.getConnection(deviceId);
    if (connection?.dataChannel) {
      this.yjsSyncProvider.addPeer(deviceId, connection.dataChannel);
      this.emit('peer-connected', connection);
      this.emit('sync-started');
    }

    this.updatePeerCount();
  }

  /**
   * Update sync status with throttled emission
   */
  private updateStatus(update: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...update };
    // Use throttled emit to prevent flooding renderer with updates
    this.throttledEmitStatus(this.status);
  }

  /**
   * Update peer count based on connected peers (debounced)
   */
  private updatePeerCount(): void {
    this.debouncedUpdatePeerCount();
  }

  /**
   * Immediate peer count update (called by debounced function)
   */
  private updatePeerCountImmediate(): void {
    const connectedCount = this.peerConnectionService.getConnectedDeviceIds().length;
    this.updateStatus({
      peerCount: connectedCount,
      status: connectedCount > 0 ? 'connected' : this.isRunning ? 'discovering' : 'offline',
    });
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Get list of connected peers
   */
  getConnectedPeers(): PeerConnection[] {
    return this.peerConnectionService.getAllConnections()
      .filter(conn => conn.status === 'connected');
  }

  /**
   * Get discovered peers
   */
  getDiscoveredPeers(): DiscoveredPeer[] {
    return this.discoveryService.getDiscoveredPeers();
  }

  /**
   * Force sync with all peers
   */
  forceSync(): void {
    this.yjsSyncProvider.forceSync();
    this.emit('sync-started');
  }

  /**
   * Update awareness state
   */
  setAwarenessState(state: Partial<AwarenessState>): void {
    this.yjsSyncProvider.setAwarenessState(state);
  }

  /**
   * Get awareness states
   */
  getAwarenessStates(): Map<number, AwarenessState> {
    return this.yjsSyncProvider.getAwarenessStates();
  }

  /**
   * Check if service is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    // Cancel throttled/debounced handlers
    this.throttledEmitStatus.cancel();
    this.debouncedUpdatePeerCount.cancel();

    this.stop();

    this.yjsSyncProvider.destroy();
    this.peerConnectionService.destroy();
    this.signalingService.destroy();
    this.discoveryService.destroy();

    this.removeAllListeners();
    this.config = null;
    this.ydoc = null;
  }

  // Type-safe event methods
  override on<K extends keyof SyncServiceEvents>(
    event: K,
    listener: SyncServiceEvents[K]
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override emit<K extends keyof SyncServiceEvents>(
    event: K,
    ...args: Parameters<SyncServiceEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  override off<K extends keyof SyncServiceEvents>(
    event: K,
    listener: SyncServiceEvents[K]
  ): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}
