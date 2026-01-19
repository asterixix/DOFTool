import { EventEmitter } from 'events';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SignalingService } from './SignalingService';

import type {
  SignalingMessage,
  RTCSessionDescriptionInit,
  RTCIceCandidateInit,
} from './Sync.types';
import type { Socket, Server } from 'net';

// Helper to create mock socket with event simulation
function createMockSocket(): Socket &
  EventEmitter & {
    writable: boolean;
    _handlers: Map<string, ((...args: unknown[]) => void)[]>;
  } {
  const handlers = new Map<string, ((...args: unknown[]) => void)[]>();
  const socket = new EventEmitter() as Socket &
    EventEmitter & {
      writable: boolean;
      _handlers: Map<string, ((...args: unknown[]) => void)[]>;
    };

  socket._handlers = handlers;
  socket.writable = true;
  socket.write = vi.fn((data: string) => {
    return true;
  });
  socket.destroy = vi.fn();
  socket.setEncoding = vi.fn();

  // Override on to track handlers
  const originalOn = socket.on.bind(socket);
  socket.on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (!handlers.has(event)) {
      handlers.set(event, []);
    }
    handlers.get(event)!.push(handler);
    return originalOn(event, handler);
  }) as typeof socket.on;

  return socket;
}

// Create mock server
function createMockServer(): Server &
  EventEmitter & {
    _connectionHandler: ((socket: Socket) => void) | null;
    _simulateConnection: (socket: Socket) => void;
  } {
  const server = new EventEmitter() as Server &
    EventEmitter & {
      _connectionHandler: ((socket: Socket) => void) | null;
      _simulateConnection: (socket: Socket) => void;
    };

  server._connectionHandler = null;
  server.listen = vi.fn((_port: number, callback?: () => void) => {
    server.address = vi.fn(() => ({ port: 12345, family: 'IPv4', address: '127.0.0.1' }));
    if (callback) {
      setImmediate(callback);
    }
    return server;
  });
  server.close = vi.fn();

  // Capture connection handler
  const originalOn = server.on.bind(server);
  server.on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (event === 'connection') {
      server._connectionHandler = handler as (socket: Socket) => void;
    }
    return originalOn(event, handler);
  }) as typeof server.on;

  server._simulateConnection = (socket: Socket) => {
    if (server._connectionHandler) {
      server._connectionHandler(socket);
    }
  };

  return server;
}

let mockServer: ReturnType<typeof createMockServer>;
let mockConnectSocket: ReturnType<typeof createMockSocket>;

vi.mock('net', () => ({
  createServer: vi.fn((handler?: (socket: Socket) => void) => {
    if (handler) {
      mockServer._connectionHandler = handler;
    }
    return mockServer;
  }),
  connect: vi.fn((_port: number, _host: string, callback?: () => void) => {
    if (callback) {
      setImmediate(callback);
    }
    return mockConnectSocket;
  }),
}));

describe('SignalingService', () => {
  let signalingService: SignalingService;

  const defaultConfig = {
    deviceId: 'local-device-123',
    deviceName: 'Local Device',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = createMockServer();
    mockConnectSocket = createMockSocket();
    signalingService = new SignalingService();
  });

  afterEach(() => {
    try {
      signalingService.destroy();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should initialize service with config', () => {
      signalingService.initialize(defaultConfig);

      expect(signalingService).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start TCP signaling server', async () => {
      signalingService.initialize(defaultConfig);

      const port = await signalingService.start();

      expect(port).toBe(12345);
      expect(mockServer.listen).toHaveBeenCalledWith(0, expect.any(Function));
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new SignalingService();

      await expect(uninitializedService.start()).rejects.toThrow(
        'SignalingService not initialized'
      );
    });

    it('should emit listening event with port', async () => {
      const listeningHandler = vi.fn();
      signalingService.initialize(defaultConfig);
      signalingService.on('listening', listeningHandler);

      await signalingService.start();

      expect(listeningHandler).toHaveBeenCalledWith(12345);
    });

    it('should set isActive to true after starting', async () => {
      signalingService.initialize(defaultConfig);

      expect(signalingService.isActive()).toBe(false);

      await signalingService.start();

      expect(signalingService.isActive()).toBe(true);
    });
  });

  describe('getPort', () => {
    it('should return 0 before starting', () => {
      signalingService.initialize(defaultConfig);

      expect(signalingService.getPort()).toBe(0);
    });

    it('should return port after starting', async () => {
      signalingService.initialize(defaultConfig);
      await signalingService.start();

      expect(signalingService.getPort()).toBe(12345);
    });
  });

  describe('connection handling', () => {
    beforeEach(async () => {
      signalingService.initialize(defaultConfig);
      await signalingService.start();
    });

    it('should handle incoming connection and emit client-connected', () => {
      const clientConnectedHandler = vi.fn();
      signalingService.on('client-connected', clientConnectedHandler);

      const socket = createMockSocket();
      mockServer._simulateConnection(socket);

      // Simulate message with 'from' field to identify client
      const message: SignalingMessage = {
        type: 'offer',
        from: 'peer-device-456',
        to: defaultConfig.deviceId,
        payload: { type: 'offer', sdp: 'v=0...' },
        signature: 'sig',
        timestamp: Date.now(),
      };

      socket.emit('data', JSON.stringify(message) + '\n');

      expect(clientConnectedHandler).toHaveBeenCalledWith('peer-device-456');
    });

    it('should emit message-received with respond function', () => {
      const messageReceivedHandler = vi.fn();
      signalingService.on('message-received', messageReceivedHandler);

      const socket = createMockSocket();
      mockServer._simulateConnection(socket);

      const message: SignalingMessage = {
        type: 'offer',
        from: 'peer-device-456',
        to: defaultConfig.deviceId,
        payload: { type: 'offer', sdp: 'v=0...' },
        signature: 'sig',
        timestamp: Date.now(),
      };

      socket.emit('data', JSON.stringify(message) + '\n');

      expect(messageReceivedHandler).toHaveBeenCalledWith(message, expect.any(Function));
    });

    it('should handle multiple messages in buffer', () => {
      const messageReceivedHandler = vi.fn();
      signalingService.on('message-received', messageReceivedHandler);

      const socket = createMockSocket();
      mockServer._simulateConnection(socket);

      const message1: SignalingMessage = {
        type: 'offer',
        from: 'peer-1',
        to: defaultConfig.deviceId,
        payload: { type: 'offer', sdp: 'sdp1' },
        signature: 'sig1',
        timestamp: Date.now(),
      };

      const message2: SignalingMessage = {
        type: 'answer',
        from: 'peer-2',
        to: defaultConfig.deviceId,
        payload: { type: 'answer', sdp: 'sdp2' },
        signature: 'sig2',
        timestamp: Date.now(),
      };

      // Send both messages in one data chunk
      socket.emit('data', JSON.stringify(message1) + '\n' + JSON.stringify(message2) + '\n');

      expect(messageReceivedHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle partial message buffering', () => {
      const messageReceivedHandler = vi.fn();
      signalingService.on('message-received', messageReceivedHandler);

      const socket = createMockSocket();
      mockServer._simulateConnection(socket);

      const message: SignalingMessage = {
        type: 'offer',
        from: 'peer-device-456',
        to: defaultConfig.deviceId,
        payload: { type: 'offer', sdp: 'v=0...' },
        signature: 'sig',
        timestamp: Date.now(),
      };

      const jsonStr = JSON.stringify(message);
      const half1 = jsonStr.slice(0, jsonStr.length / 2);
      const half2 = jsonStr.slice(jsonStr.length / 2) + '\n';

      // Send first half
      socket.emit('data', half1);
      expect(messageReceivedHandler).not.toHaveBeenCalled();

      // Send second half with newline
      socket.emit('data', half2);
      expect(messageReceivedHandler).toHaveBeenCalledTimes(1);
    });

    it('should emit client-disconnected when socket closes', () => {
      const clientDisconnectedHandler = vi.fn();
      signalingService.on('client-disconnected', clientDisconnectedHandler);

      const socket = createMockSocket();
      mockServer._simulateConnection(socket);

      // Identify the client first
      const message: SignalingMessage = {
        type: 'offer',
        from: 'peer-device-456',
        to: defaultConfig.deviceId,
        payload: { type: 'offer', sdp: 'v=0...' },
        signature: 'sig',
        timestamp: Date.now(),
      };
      socket.emit('data', JSON.stringify(message) + '\n');

      // Close the socket
      socket.emit('close');

      expect(clientDisconnectedHandler).toHaveBeenCalledWith('peer-device-456');
    });
  });

  describe('connectTo', () => {
    beforeEach(() => {
      signalingService.initialize(defaultConfig);
    });

    it('should connect to remote signaling server', async () => {
      const socket = await signalingService.connectTo('192.168.1.100', 8080, 'peer-device-456');

      expect(socket).toBe(mockConnectSocket);
    });

    it('should track connection by device ID', async () => {
      await signalingService.connectTo('192.168.1.100', 8080, 'peer-device-456');

      expect(signalingService.isConnectedTo('peer-device-456')).toBe(true);
      expect(signalingService.getConnectedDevices()).toContain('peer-device-456');
    });

    it('should emit message-received for incoming messages', async () => {
      const messageReceivedHandler = vi.fn();
      signalingService.on('message-received', messageReceivedHandler);

      await signalingService.connectTo('192.168.1.100', 8080, 'peer-device-456');

      const message: SignalingMessage = {
        type: 'answer',
        from: 'peer-device-456',
        to: defaultConfig.deviceId,
        payload: { type: 'answer', sdp: 'answer-sdp' },
        signature: 'sig',
        timestamp: Date.now(),
      };

      mockConnectSocket.emit('data', JSON.stringify(message) + '\n');

      expect(messageReceivedHandler).toHaveBeenCalledWith(message, expect.any(Function));
    });
  });

  describe('sendTo', () => {
    beforeEach(async () => {
      signalingService.initialize(defaultConfig);
      await signalingService.connectTo('192.168.1.100', 8080, 'peer-device-456');
    });

    it('should send message to connected device', () => {
      const message: SignalingMessage = {
        type: 'offer',
        from: defaultConfig.deviceId,
        to: 'peer-device-456',
        payload: { type: 'offer', sdp: 'v=0...' },
        signature: 'sig',
        timestamp: Date.now(),
      };

      signalingService.sendTo('peer-device-456', message);

      expect(mockConnectSocket.write).toHaveBeenCalledWith(JSON.stringify(message) + '\n');
    });

    it('should throw error for unknown device', () => {
      const message: SignalingMessage = {
        type: 'offer',
        from: defaultConfig.deviceId,
        to: 'unknown-device',
        payload: { type: 'offer', sdp: 'v=0...' },
        signature: 'sig',
        timestamp: Date.now(),
      };

      expect(() => {
        signalingService.sendTo('unknown-device', message);
      }).toThrow('No connection to device: unknown-device');
    });
  });

  describe('message creation helpers', () => {
    beforeEach(() => {
      signalingService.initialize(defaultConfig);
    });

    it('should create offer message', () => {
      const offer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };

      const message = signalingService.createOfferMessage('peer-device-456', offer, 'signature');

      expect(message.type).toBe('offer');
      expect(message.from).toBe(defaultConfig.deviceId);
      expect(message.to).toBe('peer-device-456');
      expect(message.payload).toEqual(offer);
      expect(message.signature).toBe('signature');
      expect(message.timestamp).toBeDefined();
    });

    it('should create answer message', () => {
      const answer: RTCSessionDescriptionInit = { type: 'answer', sdp: 'v=0...' };

      const message = signalingService.createAnswerMessage('peer-device-456', answer, 'signature');

      expect(message.type).toBe('answer');
      expect(message.from).toBe(defaultConfig.deviceId);
      expect(message.to).toBe('peer-device-456');
      expect(message.payload).toEqual(answer);
    });

    it('should create ICE candidate message', () => {
      const candidate: RTCIceCandidateInit = {
        candidate: 'candidate:1234',
        sdpMid: '0',
        sdpMLineIndex: 0,
      };

      const message = signalingService.createIceCandidateMessage(
        'peer-device-456',
        candidate,
        'signature'
      );

      expect(message.type).toBe('ice-candidate');
      expect(message.from).toBe(defaultConfig.deviceId);
      expect(message.to).toBe('peer-device-456');
      expect(message.payload).toEqual(candidate);
    });

    it('should throw if not initialized', () => {
      const uninitializedService = new SignalingService();
      const offer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };

      expect(() => {
        uninitializedService.createOfferMessage('peer', offer, 'sig');
      }).toThrow('SignalingService not initialized');
    });
  });

  describe('disconnectFrom', () => {
    beforeEach(async () => {
      signalingService.initialize(defaultConfig);
      await signalingService.connectTo('192.168.1.100', 8080, 'peer-device-456');
    });

    it('should disconnect from specific device', () => {
      signalingService.disconnectFrom('peer-device-456');

      expect(mockConnectSocket.destroy).toHaveBeenCalled();
      expect(signalingService.isConnectedTo('peer-device-456')).toBe(false);
    });

    it('should not throw for unknown device', () => {
      expect(() => {
        signalingService.disconnectFrom('unknown-device');
      }).not.toThrow();
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      signalingService.initialize(defaultConfig);
      await signalingService.start();
      await signalingService.connectTo('192.168.1.100', 8080, 'peer-device-456');
    });

    it('should close all connections and server', () => {
      signalingService.stop();

      expect(mockConnectSocket.destroy).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
      expect(signalingService.isActive()).toBe(false);
      expect(signalingService.getPort()).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should cleanup all resources', async () => {
      signalingService.initialize(defaultConfig);
      await signalingService.start();

      signalingService.destroy();

      expect(mockServer.close).toHaveBeenCalled();
      expect(signalingService.listenerCount('message-received')).toBe(0);
    });
  });
});
