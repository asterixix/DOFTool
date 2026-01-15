/**
 * Signaling Service - TCP-based signaling for WebRTC connections
 *
 * Each device runs a TCP server that accepts signaling messages
 * for WebRTC connection establishment.
 */

import { EventEmitter } from 'events';
import { createServer, connect, type Server, type Socket } from 'net';

import type {
  SignalingMessage,
  RTCSessionDescriptionInit,
  RTCIceCandidateInit,
} from './Sync.types';

/** Signaling service configuration */
interface SignalingConfig {
  deviceId: string;
  deviceName: string;
}

/** Events emitted by SignalingService */
interface SignalingServiceEvents {
  'message-received': (message: SignalingMessage, respond: (msg: SignalingMessage) => void) => void;
  'client-connected': (deviceId: string) => void;
  'client-disconnected': (deviceId: string) => void;
  'error': (error: Error) => void;
  'listening': (port: number) => void;
}

/** Pending connection info */
interface PendingConnection {
  socket: Socket;
  buffer: string;
  deviceId?: string;
}

export class SignalingService extends EventEmitter {
  private server: Server | null = null;
  private config: SignalingConfig | null = null;
  private connections: Map<string, Socket> = new Map();
  private pendingConnections: Set<PendingConnection> = new Set();
  private port: number = 0;
  private isRunning = false;

  constructor() {
    super();
  }

  /**
   * Initialize the signaling service
   */
  initialize(config: SignalingConfig): void {
    this.config = config;
  }

  /**
   * Start the TCP signaling server
   * Returns the port number assigned
   */
  async start(): Promise<number> {
    if (!this.config) {
      throw new Error('SignalingService not initialized');
    }

    return new Promise((resolve, reject) => {
      this.server = createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on('error', (error) => {
        console.error('[SignalingService] Server error:', error);
        this.emit('error', error);
        reject(error);
      });

      // Listen on dynamic port (0 = OS assigns available port)
      this.server.listen(0, () => {
        const address = this.server?.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          this.isRunning = true;
          console.error('[SignalingService] Listening on port', this.port);
          this.emit('listening', this.port);
          resolve(this.port);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });
    });
  }

  /**
   * Get the port the server is listening on
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Handle a new incoming connection
   */
  private handleConnection(socket: Socket): void {
    const pending: PendingConnection = {
      socket,
      buffer: '',
    };
    this.pendingConnections.add(pending);

    socket.setEncoding('utf8');

    socket.on('data', (data: string) => {
      pending.buffer += data;
      this.processBuffer(pending);
    });

    socket.on('close', () => {
      this.pendingConnections.delete(pending);
      if (pending.deviceId) {
        this.connections.delete(pending.deviceId);
        this.emit('client-disconnected', pending.deviceId);
      }
    });

    socket.on('error', (error) => {
      console.error('[SignalingService] Socket error:', error);
      this.pendingConnections.delete(pending);
      if (pending.deviceId) {
        this.connections.delete(pending.deviceId);
      }
    });
  }

  /**
   * Process buffered data for newline-delimited JSON messages
   */
  private processBuffer(pending: PendingConnection): void {
    const lines = pending.buffer.split('\n');
    pending.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as SignalingMessage;
          this.handleMessage(message, pending);
        } catch (error) {
          console.error('[SignalingService] Failed to parse message:', error);
        }
      }
    }
  }

  /**
   * Handle a received signaling message
   */
  private handleMessage(message: SignalingMessage, pending: PendingConnection): void {
    // Track device ID from first message
    if (!pending.deviceId && message.from) {
      pending.deviceId = message.from;
      this.connections.set(message.from, pending.socket);
      this.pendingConnections.delete(pending);
      this.emit('client-connected', message.from);
    }

    // Create respond function for this connection
    const respond = (response: SignalingMessage): void => {
      this.sendToSocket(pending.socket, response);
    };

    this.emit('message-received', message, respond);
  }

  /**
   * Send a message to a specific socket
   */
  private sendToSocket(socket: Socket, message: SignalingMessage): void {
    if (socket.writable) {
      socket.write(JSON.stringify(message) + '\n');
    }
  }

  /**
   * Connect to a remote signaling server
   */
  async connectTo(host: string, port: number, deviceId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = connect(port, host, () => {
        this.connections.set(deviceId, socket);
        resolve(socket);
      });

      socket.setEncoding('utf8');

      let buffer = '';

      socket.on('data', (data: string) => {
        buffer += data;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line) as SignalingMessage;
              const respond = (response: SignalingMessage): void => {
                this.sendToSocket(socket, response);
              };
              this.emit('message-received', message, respond);
            } catch (error) {
              console.error('[SignalingService] Failed to parse message:', error);
            }
          }
        }
      });

      socket.on('close', () => {
        this.connections.delete(deviceId);
        this.emit('client-disconnected', deviceId);
      });

      socket.on('error', (error) => {
        console.error('[SignalingService] Connection error:', error);
        this.connections.delete(deviceId);
        reject(error);
      });
    });
  }

  /**
   * Send a signaling message to a specific device
   */
  async sendTo(deviceId: string, message: SignalingMessage): Promise<void> {
    const socket = this.connections.get(deviceId);
    if (!socket) {
      throw new Error(`No connection to device: ${deviceId}`);
    }

    this.sendToSocket(socket, message);
  }

  /**
   * Create an offer message
   */
  createOfferMessage(
    to: string,
    offer: RTCSessionDescriptionInit,
    signature: string
  ): SignalingMessage {
    if (!this.config) {
      throw new Error('SignalingService not initialized');
    }

    return {
      type: 'offer',
      from: this.config.deviceId,
      to,
      payload: offer,
      signature,
      timestamp: Date.now(),
    };
  }

  /**
   * Create an answer message
   */
  createAnswerMessage(
    to: string,
    answer: RTCSessionDescriptionInit,
    signature: string
  ): SignalingMessage {
    if (!this.config) {
      throw new Error('SignalingService not initialized');
    }

    return {
      type: 'answer',
      from: this.config.deviceId,
      to,
      payload: answer,
      signature,
      timestamp: Date.now(),
    };
  }

  /**
   * Create an ICE candidate message
   */
  createIceCandidateMessage(
    to: string,
    candidate: RTCIceCandidateInit,
    signature: string
  ): SignalingMessage {
    if (!this.config) {
      throw new Error('SignalingService not initialized');
    }

    return {
      type: 'ice-candidate',
      from: this.config.deviceId,
      to,
      payload: candidate,
      signature,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if connected to a specific device
   */
  isConnectedTo(deviceId: string): boolean {
    return this.connections.has(deviceId);
  }

  /**
   * Get list of connected device IDs
   */
  getConnectedDevices(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Disconnect from a specific device
   */
  disconnectFrom(deviceId: string): void {
    const socket = this.connections.get(deviceId);
    if (socket) {
      socket.destroy();
      this.connections.delete(deviceId);
    }
  }

  /**
   * Stop the signaling server
   */
  stop(): void {
    this.isRunning = false;

    // Close all connections
    for (const socket of this.connections.values()) {
      socket.destroy();
    }
    this.connections.clear();

    // Close pending connections
    for (const pending of this.pendingConnections) {
      pending.socket.destroy();
    }
    this.pendingConnections.clear();

    // Close server
    if (this.server) {
      this.server.close();
      this.server = null;
    }

    this.port = 0;
  }

  /**
   * Check if the service is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }

  // Type-safe event methods
  override on<K extends keyof SignalingServiceEvents>(
    event: K,
    listener: SignalingServiceEvents[K]
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override emit<K extends keyof SignalingServiceEvents>(
    event: K,
    ...args: Parameters<SignalingServiceEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  override off<K extends keyof SignalingServiceEvents>(
    event: K,
    listener: SignalingServiceEvents[K]
  ): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}
