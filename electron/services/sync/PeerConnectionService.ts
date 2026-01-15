/**
 * Peer Connection Service - WebRTC peer connection management
 *
 * Manages WebRTC peer connections for P2P data synchronization.
 * Uses wrtc package for Node.js WebRTC support in Electron main process.
 */

import { EventEmitter } from 'events';

import type {
  DiscoveredPeer,
  PeerConnection,
  ConnectionStatus,
  DataChannelLike,
  PeerConnectionLike,
  RTCConfiguration,
  RTCSessionDescriptionInit,
  RTCIceCandidateInit,
  AuthRequest,
  AuthResponse,
} from './Sync.types';

/** Peer connection service configuration */
interface PeerConnectionConfig {
  deviceId: string;
  deviceName: string;
  /** WebRTC configuration */
  rtcConfig?: RTCConfiguration;
  /** Connection timeout in ms */
  connectionTimeout?: number;
  /** Authentication timeout in ms */
  authTimeout?: number;
}

/** Events emitted by PeerConnectionService */
interface PeerConnectionServiceEvents {
  'connection-state-changed': (deviceId: string, status: ConnectionStatus) => void;
  'channel-open': (deviceId: string, channel: DataChannelLike) => void;
  'channel-closed': (deviceId: string) => void;
  'channel-message': (deviceId: string, data: string) => void;
  'authenticated': (deviceId: string) => void;
  'authentication-failed': (deviceId: string, reason: string) => void;
  'ice-candidate': (deviceId: string, candidate: RTCIceCandidateInit) => void;
  'error': (deviceId: string, error: Error) => void;
}

/** WebRTC factory interface for dependency injection */
export interface WebRTCFactory {
  createPeerConnection(config?: RTCConfiguration): PeerConnectionLike;
}

/** Default WebRTC factory using wrtc package */
let wrtcModule: {
  RTCPeerConnection: new (config?: RTCConfiguration) => PeerConnectionLike;
} | null = null;

async function loadWrtc(): Promise<typeof wrtcModule> {
  if (!wrtcModule) {
    try {
      // Dynamic import of wrtc package
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const wrtc = require('wrtc') as typeof wrtcModule;
      wrtcModule = wrtc;
    } catch (error) {
      console.error('[PeerConnectionService] Failed to load wrtc:', error);
      // wrtc is optional - WebRTC can work without it in renderer process
      console.error('[PeerConnectionService] WebRTC will be limited without wrtc package');
      return null;
    }
  }
  return wrtcModule;
}

export class PeerConnectionService extends EventEmitter {
  private config: PeerConnectionConfig | null = null;
  private connections: Map<string, PeerConnection> = new Map();
  private webrtcFactory: WebRTCFactory | null = null;
  private pendingAuth: Map<string, NodeJS.Timeout> = new Map();

  private readonly defaultRtcConfig: RTCConfiguration = {
    iceServers: [], // No TURN servers needed for local network
  };

  constructor() {
    super();
  }

  /**
   * Initialize the peer connection service
   */
  async initialize(config: PeerConnectionConfig): Promise<void> {
    this.config = config;

    // Load wrtc module and create default factory
    const wrtc = await loadWrtc();
    if (wrtc) {
      this.webrtcFactory = {
        createPeerConnection: (rtcConfig?: RTCConfiguration) => {
          return new wrtc.RTCPeerConnection(
            rtcConfig ?? this.defaultRtcConfig
          ) as unknown as PeerConnectionLike;
        },
      };
    }
  }

  /**
   * Set a custom WebRTC factory (for testing or alternative implementations)
   */
  setWebRTCFactory(factory: WebRTCFactory): void {
    this.webrtcFactory = factory;
  }

  /**
   * Create a new peer connection (as initiator)
   */
  async createConnection(
    peer: DiscoveredPeer
  ): Promise<{ offer: RTCSessionDescriptionInit; connection: PeerConnection }> {
    if (!this.config || !this.webrtcFactory) {
      throw new Error('PeerConnectionService not initialized');
    }

    // Clean up existing connection if any
    this.closeConnection(peer.deviceId);

    const pc = this.webrtcFactory.createPeerConnection(
      this.config.rtcConfig ?? this.defaultRtcConfig
    );

    const connection: PeerConnection = {
      deviceId: peer.deviceId,
      deviceName: peer.deviceName,
      status: 'connecting',
      peerConnection: pc,
      dataChannel: null,
      lastSeen: Date.now(),
      lastSyncAt: null,
    };

    this.connections.set(peer.deviceId, connection);
    this.setupPeerConnectionHandlers(peer.deviceId, pc);

    // Create data channel (as initiator)
    const channel = pc.createDataChannel('familysync', {
      ordered: true,
      maxRetransmits: 10,
    });
    connection.dataChannel = channel;
    this.setupDataChannelHandlers(peer.deviceId, channel);

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.updateConnectionStatus(peer.deviceId, 'connecting');

    return { offer, connection };
  }

  /**
   * Accept an incoming connection (as responder)
   */
  async acceptConnection(
    peer: DiscoveredPeer,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.config || !this.webrtcFactory) {
      throw new Error('PeerConnectionService not initialized');
    }

    // Clean up existing connection if any
    this.closeConnection(peer.deviceId);

    const pc = this.webrtcFactory.createPeerConnection(
      this.config.rtcConfig ?? this.defaultRtcConfig
    );

    const connection: PeerConnection = {
      deviceId: peer.deviceId,
      deviceName: peer.deviceName,
      status: 'connecting',
      peerConnection: pc,
      dataChannel: null,
      lastSeen: Date.now(),
      lastSyncAt: null,
    };

    this.connections.set(peer.deviceId, connection);
    this.setupPeerConnectionHandlers(peer.deviceId, pc);

    // Handle incoming data channel
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      connection.dataChannel = channel;
      this.setupDataChannelHandlers(peer.deviceId, channel);
    };

    // Set remote description (offer)
    await pc.setRemoteDescription(offer);

    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.updateConnectionStatus(peer.deviceId, 'connecting');

    return answer;
  }

  /**
   * Handle answer from remote peer
   */
  async handleAnswer(
    deviceId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (!connection?.peerConnection) {
      throw new Error(`No connection for device: ${deviceId}`);
    }

    await connection.peerConnection.setRemoteDescription(answer);
  }

  /**
   * Add ICE candidate from remote peer
   */
  async addIceCandidate(
    deviceId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (!connection?.peerConnection) {
      throw new Error(`No connection for device: ${deviceId}`);
    }

    await connection.peerConnection.addIceCandidate(candidate);
  }

  /**
   * Setup handlers for peer connection events
   */
  private setupPeerConnectionHandlers(
    deviceId: string,
    pc: PeerConnectionLike
  ): void {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('ice-candidate', deviceId, event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      const connection = this.connections.get(deviceId);
      if (!connection) {return;}

      switch (pc.connectionState) {
        case 'connected':
          this.updateConnectionStatus(deviceId, 'authenticating');
          break;
        case 'disconnected':
        case 'failed':
          this.updateConnectionStatus(deviceId, 'disconnected');
          this.emit('channel-closed', deviceId);
          break;
        case 'closed':
          this.updateConnectionStatus(deviceId, 'disconnected');
          break;
      }
    };
  }

  /**
   * Setup handlers for data channel events
   */
  private setupDataChannelHandlers(
    deviceId: string,
    channel: DataChannelLike
  ): void {
    channel.onopen = () => {
      this.updateConnectionStatus(deviceId, 'authenticating');
      this.emit('channel-open', deviceId, channel);
      
      // Start authentication
      this.startAuthentication(deviceId);
    };

    channel.onclose = () => {
      this.updateConnectionStatus(deviceId, 'disconnected');
      this.emit('channel-closed', deviceId);
    };

    channel.onmessage = (event: MessageEvent) => {
      const data = typeof event.data === 'string' ? event.data : '';
      this.handleChannelMessage(deviceId, data);
    };

    channel.onerror = (event: Event) => {
      console.error(`[PeerConnectionService] Channel error for ${deviceId}:`, event);
      this.emit('error', deviceId, new Error('Data channel error'));
    };
  }

  /**
   * Handle incoming data channel message
   */
  private handleChannelMessage(deviceId: string, data: string): void {
    try {
      const message = JSON.parse(data) as { type: string };

      // Handle authentication messages
      if (message.type === 'AUTH_REQUEST') {
        this.handleAuthRequest(deviceId, message as AuthRequest);
        return;
      }

      if (message.type === 'AUTH_RESPONSE') {
        this.handleAuthResponse(deviceId, message as AuthResponse);
        return;
      }

      // Forward other messages
      this.emit('channel-message', deviceId, data);
    } catch (error) {
      // Non-JSON message, forward as-is
      this.emit('channel-message', deviceId, data);
    }
  }

  /**
   * Start authentication process
   */
  private startAuthentication(deviceId: string): void {
    if (!this.config) {return;}

    const connection = this.connections.get(deviceId);
    if (!connection?.dataChannel) {return;}

    const authRequest: AuthRequest = {
      type: 'AUTH_REQUEST',
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName,
      timestamp: Date.now(),
      signature: '', // TODO: Add proper signature with device key
    };

    this.sendToDevice(deviceId, JSON.stringify(authRequest));

    // Set authentication timeout
    const timeout = setTimeout(() => {
      const conn = this.connections.get(deviceId);
      if (conn?.status === 'authenticating') {
        this.emit('authentication-failed', deviceId, 'Authentication timeout');
        this.closeConnection(deviceId);
      }
    }, this.config.authTimeout ?? 10000);

    this.pendingAuth.set(deviceId, timeout);
  }

  /**
   * Handle authentication request from remote peer
   */
  private handleAuthRequest(deviceId: string, _request: AuthRequest): void {
    if (!this.config) {return;}

    // TODO: Verify signature with device's public key from _request

    const authResponse: AuthResponse = {
      type: 'AUTH_RESPONSE',
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName,
      timestamp: Date.now(),
      signature: '', // TODO: Add proper signature
      success: true,
    };

    this.sendToDevice(deviceId, JSON.stringify(authResponse));
  }

  /**
   * Handle authentication response from remote peer
   */
  private handleAuthResponse(deviceId: string, response: AuthResponse): void {
    // Clear auth timeout
    const timeout = this.pendingAuth.get(deviceId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingAuth.delete(deviceId);
    }

    if (response.success) {
      this.updateConnectionStatus(deviceId, 'connected');
      this.emit('authenticated', deviceId);
    } else {
      this.emit('authentication-failed', deviceId, 'Authentication rejected');
      this.closeConnection(deviceId);
    }
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(deviceId: string, status: ConnectionStatus): void {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.status = status;
      connection.lastSeen = Date.now();
      this.emit('connection-state-changed', deviceId, status);
    }
  }

  /**
   * Send data to a connected device
   */
  sendToDevice(deviceId: string, data: string): boolean {
    const connection = this.connections.get(deviceId);
    if (connection?.dataChannel?.readyState !== 'open') {
      return false;
    }

    connection.dataChannel.send(data);
    return true;
  }

  /**
   * Broadcast data to all connected devices
   */
  broadcast(data: string): void {
    for (const [deviceId, connection] of this.connections) {
      if (connection.status === 'connected' && connection.dataChannel?.readyState === 'open') {
        this.sendToDevice(deviceId, data);
      }
    }
  }

  /**
   * Get connection for a device
   */
  getConnection(deviceId: string): PeerConnection | undefined {
    return this.connections.get(deviceId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): PeerConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connected device IDs
   */
  getConnectedDeviceIds(): string[] {
    return Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.status === 'connected')
      .map(([id]) => id);
  }

  /**
   * Check if connected to a device
   */
  isConnectedTo(deviceId: string): boolean {
    const connection = this.connections.get(deviceId);
    return connection?.status === 'connected';
  }

  /**
   * Close a specific connection
   */
  closeConnection(deviceId: string): void {
    const connection = this.connections.get(deviceId);
    if (!connection) {return;}

    // Clear auth timeout
    const timeout = this.pendingAuth.get(deviceId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingAuth.delete(deviceId);
    }

    // Close data channel
    if (connection.dataChannel) {
      try {
        connection.dataChannel.close();
      } catch (error) {
        console.error('[PeerConnectionService] Error closing data channel:', error);
      }
    }

    // Close peer connection
    if (connection.peerConnection) {
      try {
        connection.peerConnection.close();
      } catch (error) {
        console.error('[PeerConnectionService] Error closing peer connection:', error);
      }
    }

    this.connections.delete(deviceId);
    this.emit('connection-state-changed', deviceId, 'disconnected');
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    for (const deviceId of this.connections.keys()) {
      this.closeConnection(deviceId);
    }
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    this.closeAllConnections();
    this.removeAllListeners();
    this.config = null;
    this.webrtcFactory = null;
  }

  // Type-safe event methods
  override on<K extends keyof PeerConnectionServiceEvents>(
    event: K,
    listener: PeerConnectionServiceEvents[K]
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override emit<K extends keyof PeerConnectionServiceEvents>(
    event: K,
    ...args: Parameters<PeerConnectionServiceEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  override off<K extends keyof PeerConnectionServiceEvents>(
    event: K,
    listener: PeerConnectionServiceEvents[K]
  ): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}
