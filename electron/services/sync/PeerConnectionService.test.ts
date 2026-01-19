import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PeerConnectionService } from './PeerConnectionService';

import type { WebRTCFactory } from './PeerConnectionService';
import type {
  DiscoveredPeer,
  RTCSessionDescriptionInit,
  RTCIceCandidateInit,
  DataChannelLike,
  PeerConnectionLike,
} from './Sync.types';

// Factory to create fresh mock instances
function createMockDataChannel(): DataChannelLike & {
  _triggerOpen: () => void;
  _triggerClose: () => void;
  _triggerMessage: (data: string) => void;
  _triggerError: () => void;
} {
  const channel: DataChannelLike & {
    _triggerOpen: () => void;
    _triggerClose: () => void;
    _triggerMessage: (data: string) => void;
    _triggerError: () => void;
  } = {
    send: vi.fn(),
    close: vi.fn(),
    readyState: 'connecting' as const,
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    _triggerOpen: () => {
      channel.readyState = 'open';
      channel.onopen?.(new Event('open'));
    },
    _triggerClose: () => {
      channel.readyState = 'closed';
      channel.onclose?.(new Event('close'));
    },
    _triggerMessage: (data: string) => {
      channel.onmessage?.(new MessageEvent('message', { data }));
    },
    _triggerError: () => {
      channel.onerror?.(new Event('error'));
    },
  };
  return channel;
}

function createMockPeerConnection(dataChannel: DataChannelLike): PeerConnectionLike & {
  _triggerIceCandidate: (candidate: RTCIceCandidateInit | null) => void;
  _triggerConnectionStateChange: (state: string) => void;
  _triggerDataChannel: (channel: DataChannelLike) => void;
} {
  const pc: PeerConnectionLike & {
    _triggerIceCandidate: (candidate: RTCIceCandidateInit | null) => void;
    _triggerConnectionStateChange: (state: string) => void;
    _triggerDataChannel: (channel: DataChannelLike) => void;
  } = {
    connectionState: 'new',
    iceConnectionState: 'new',
    createOffer: vi.fn(),
    createAnswer: vi.fn(),
    setLocalDescription: vi.fn(),
    setRemoteDescription: vi.fn(),
    addIceCandidate: vi.fn(),
    createDataChannel: vi.fn(() => dataChannel),
    close: vi.fn(),
    onicecandidate: null,
    ondatachannel: null,
    onconnectionstatechange: null,
    _triggerIceCandidate: (candidate) => {
      pc.onicecandidate?.({ candidate });
    },
    _triggerConnectionStateChange: (state) => {
      (pc as { connectionState: string }).connectionState = state;
      pc.onconnectionstatechange?.(new Event('connectionstatechange'));
    },
    _triggerDataChannel: (channel) => {
      pc.ondatachannel?.({ channel });
    },
  };
  return pc;
}

describe('PeerConnectionService', () => {
  let peerConnectionService: PeerConnectionService;
  let mockDataChannel: ReturnType<typeof createMockDataChannel>;
  let mockPeerConnection: ReturnType<typeof createMockPeerConnection>;
  let mockFactory: WebRTCFactory;

  const defaultConfig = {
    deviceId: 'local-device-123',
    deviceName: 'Local Device',
  };

  const defaultPeer: DiscoveredPeer = {
    deviceId: 'peer-device-456',
    deviceName: 'Peer Device',
    host: '192.168.1.100',
    port: 8080,
    familyIdHash: 'family-hash-abc',
    protocolVersion: '1',
    appVersion: '0.1.0',
    discoveredAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockDataChannel = createMockDataChannel();
    mockPeerConnection = createMockPeerConnection(mockDataChannel);

    mockFactory = {
      createPeerConnection: vi.fn(() => mockPeerConnection),
    };

    peerConnectionService = new PeerConnectionService();
    peerConnectionService.initialize(defaultConfig);
    peerConnectionService.setWebRTCFactory(mockFactory);
  });

  afterEach(() => {
    vi.useRealTimers();
    try {
      peerConnectionService.destroy();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should initialize service with config', () => {
      const service = new PeerConnectionService();
      service.initialize(defaultConfig);

      expect(service).toBeDefined();
    });
  });

  describe('createConnection', () => {
    it('should create peer connection as initiator', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      const result = await peerConnectionService.createConnection(defaultPeer);

      expect(result.offer).toEqual(mockOffer);
      expect(result.connection).toBeDefined();
      expect(result.connection.deviceId).toBe(defaultPeer.deviceId);
      expect(result.connection.status).toBe('connecting');
      expect(mockFactory.createPeerConnection).toHaveBeenCalled();
      expect(mockPeerConnection.createDataChannel).toHaveBeenCalledWith('familysync', {
        ordered: true,
        maxRetransmits: 10,
      });
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new PeerConnectionService();

      await expect(uninitializedService.createConnection(defaultPeer)).rejects.toThrow(
        'PeerConnectionService not initialized'
      );
    });

    it('should close existing connection before creating new one', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);
      await peerConnectionService.createConnection(defaultPeer);

      expect(mockPeerConnection.close).toHaveBeenCalled();
    });

    it('should emit ice-candidate event when ICE candidate is generated', async () => {
      const iceHandler = vi.fn();
      peerConnectionService.on('ice-candidate', iceHandler);

      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      const candidate: RTCIceCandidateInit = {
        candidate: 'candidate:1234',
        sdpMid: '0',
        sdpMLineIndex: 0,
      };
      mockPeerConnection._triggerIceCandidate(candidate);

      expect(iceHandler).toHaveBeenCalledWith(defaultPeer.deviceId, candidate);
    });
  });

  describe('acceptConnection', () => {
    it('should accept connection as responder', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'remote-offer-sdp' };
      const mockAnswer: RTCSessionDescriptionInit = { type: 'answer', sdp: 'local-answer-sdp' };

      (mockPeerConnection.setRemoteDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );
      (mockPeerConnection.createAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(mockAnswer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      const answer = await peerConnectionService.acceptConnection(defaultPeer, mockOffer);

      expect(answer).toEqual(mockAnswer);
      expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(mockOffer);
      expect(mockPeerConnection.createAnswer).toHaveBeenCalled();
      expect(mockPeerConnection.setLocalDescription).toHaveBeenCalledWith(mockAnswer);
    });

    it('should handle incoming data channel', async () => {
      const channelOpenHandler = vi.fn();
      peerConnectionService.on('channel-open', channelOpenHandler);

      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'remote-offer-sdp' };
      const mockAnswer: RTCSessionDescriptionInit = { type: 'answer', sdp: 'local-answer-sdp' };

      (mockPeerConnection.setRemoteDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );
      (mockPeerConnection.createAnswer as ReturnType<typeof vi.fn>).mockResolvedValue(mockAnswer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.acceptConnection(defaultPeer, mockOffer);

      // Simulate incoming data channel
      const incomingChannel = createMockDataChannel();
      mockPeerConnection._triggerDataChannel(incomingChannel);

      // Open the channel
      incomingChannel._triggerOpen();

      expect(channelOpenHandler).toHaveBeenCalledWith(defaultPeer.deviceId, incomingChannel);
    });
  });

  describe('handleAnswer', () => {
    it('should set remote description from answer', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );
      (mockPeerConnection.setRemoteDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      const mockAnswer: RTCSessionDescriptionInit = { type: 'answer', sdp: 'remote-answer-sdp' };
      await peerConnectionService.handleAnswer(defaultPeer.deviceId, mockAnswer);

      expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(mockAnswer);
    });

    it('should throw error for unknown device', async () => {
      const mockAnswer: RTCSessionDescriptionInit = { type: 'answer', sdp: 'remote-answer-sdp' };

      await expect(
        peerConnectionService.handleAnswer('unknown-device', mockAnswer)
      ).rejects.toThrow('No connection for device: unknown-device');
    });
  });

  describe('addIceCandidate', () => {
    it('should add ICE candidate to peer connection', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );
      (mockPeerConnection.addIceCandidate as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await peerConnectionService.createConnection(defaultPeer);

      const candidate: RTCIceCandidateInit = {
        candidate: 'candidate:1234',
        sdpMid: '0',
        sdpMLineIndex: 0,
      };

      await peerConnectionService.addIceCandidate(defaultPeer.deviceId, candidate);

      expect(mockPeerConnection.addIceCandidate).toHaveBeenCalledWith(candidate);
    });

    it('should throw error for unknown device', async () => {
      const candidate: RTCIceCandidateInit = { candidate: 'candidate:1234' };

      await expect(
        peerConnectionService.addIceCandidate('unknown-device', candidate)
      ).rejects.toThrow('No connection for device: unknown-device');
    });
  });

  describe('sendToDevice', () => {
    it('should send data through open data channel', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      // Make channel open
      mockDataChannel.readyState = 'open';

      const result = peerConnectionService.sendToDevice(defaultPeer.deviceId, 'test-message');

      expect(result).toBe(true);
      expect(mockDataChannel.send).toHaveBeenCalledWith('test-message');
    });

    it('should return false if channel is not open', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      // Channel is still 'connecting'
      const result = peerConnectionService.sendToDevice(defaultPeer.deviceId, 'test-message');

      expect(result).toBe(false);
      expect(mockDataChannel.send).not.toHaveBeenCalled();
    });
  });

  describe('broadcast', () => {
    it('should send data to all connected devices', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      // Set connection as connected with open channel
      const connection = peerConnectionService.getConnection(defaultPeer.deviceId);
      if (connection) {
        connection.status = 'connected';
        mockDataChannel.readyState = 'open';
      }

      peerConnectionService.broadcast('broadcast-message');

      expect(mockDataChannel.send).toHaveBeenCalledWith('broadcast-message');
    });
  });

  describe('connection state events', () => {
    it('should emit channel-open event when data channel opens', async () => {
      const channelOpenHandler = vi.fn();
      peerConnectionService.on('channel-open', channelOpenHandler);

      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);
      mockDataChannel._triggerOpen();

      expect(channelOpenHandler).toHaveBeenCalledWith(defaultPeer.deviceId, mockDataChannel);
    });

    it('should emit channel-closed event when data channel closes', async () => {
      const channelClosedHandler = vi.fn();
      peerConnectionService.on('channel-closed', channelClosedHandler);

      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);
      mockDataChannel._triggerClose();

      expect(channelClosedHandler).toHaveBeenCalledWith(defaultPeer.deviceId);
    });

    it('should emit channel-message event when message received', async () => {
      const messageHandler = vi.fn();
      peerConnectionService.on('channel-message', messageHandler);

      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);
      mockDataChannel._triggerMessage('test-message');

      expect(messageHandler).toHaveBeenCalledWith(defaultPeer.deviceId, 'test-message');
    });

    it('should emit error event when data channel error occurs', async () => {
      const errorHandler = vi.fn();
      peerConnectionService.on('error', errorHandler);

      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);
      mockDataChannel._triggerError();

      expect(errorHandler).toHaveBeenCalledWith(defaultPeer.deviceId, expect.any(Error));
    });

    it('should update status to authenticating when connection is connected', async () => {
      const stateChangeHandler = vi.fn();
      peerConnectionService.on('connection-state-changed', stateChangeHandler);

      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);
      mockPeerConnection._triggerConnectionStateChange('connected');

      expect(stateChangeHandler).toHaveBeenCalledWith(defaultPeer.deviceId, 'authenticating');
    });
  });

  describe('closeConnection', () => {
    it('should close data channel and peer connection', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);
      peerConnectionService.closeConnection(defaultPeer.deviceId);

      expect(mockDataChannel.close).toHaveBeenCalled();
      expect(mockPeerConnection.close).toHaveBeenCalled();
      expect(peerConnectionService.getConnection(defaultPeer.deviceId)).toBeUndefined();
    });

    it('should not throw for unknown device', () => {
      expect(() => {
        peerConnectionService.closeConnection('unknown-device');
      }).not.toThrow();
    });

    it('should emit connection-state-changed with disconnected', async () => {
      const stateChangeHandler = vi.fn();
      peerConnectionService.on('connection-state-changed', stateChangeHandler);

      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);
      stateChangeHandler.mockClear();

      peerConnectionService.closeConnection(defaultPeer.deviceId);

      expect(stateChangeHandler).toHaveBeenCalledWith(defaultPeer.deviceId, 'disconnected');
    });
  });

  describe('getConnection and getAllConnections', () => {
    it('should return connection by device ID', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      const connection = peerConnectionService.getConnection(defaultPeer.deviceId);

      expect(connection).toBeDefined();
      expect(connection?.deviceId).toBe(defaultPeer.deviceId);
      expect(connection?.deviceName).toBe(defaultPeer.deviceName);
    });

    it('should return undefined for non-existent connection', () => {
      expect(peerConnectionService.getConnection('non-existent')).toBeUndefined();
    });

    it('should return all connections', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      const connections = peerConnectionService.getAllConnections();

      expect(connections).toHaveLength(1);
      expect(connections[0].deviceId).toBe(defaultPeer.deviceId);
    });
  });

  describe('getConnectedDeviceIds and isConnectedTo', () => {
    it('should return connected device IDs', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      // Set status to connected
      const connection = peerConnectionService.getConnection(defaultPeer.deviceId);
      if (connection) {
        connection.status = 'connected';
      }

      const connectedIds = peerConnectionService.getConnectedDeviceIds();

      expect(connectedIds).toContain(defaultPeer.deviceId);
    });

    it('should check if connected to specific device', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      // Initially connecting
      expect(peerConnectionService.isConnectedTo(defaultPeer.deviceId)).toBe(false);

      // Set to connected
      const connection = peerConnectionService.getConnection(defaultPeer.deviceId);
      if (connection) {
        connection.status = 'connected';
      }

      expect(peerConnectionService.isConnectedTo(defaultPeer.deviceId)).toBe(true);
    });
  });

  describe('closeAllConnections', () => {
    it('should close all connections', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      peerConnectionService.closeAllConnections();

      expect(peerConnectionService.getAllConnections()).toHaveLength(0);
    });
  });

  describe('destroy', () => {
    it('should cleanup all resources', async () => {
      const mockOffer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };
      (mockPeerConnection.createOffer as ReturnType<typeof vi.fn>).mockResolvedValue(mockOffer);
      (mockPeerConnection.setLocalDescription as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      await peerConnectionService.createConnection(defaultPeer);

      peerConnectionService.destroy();

      expect(peerConnectionService.getAllConnections()).toHaveLength(0);
      expect(peerConnectionService.listenerCount('channel-open')).toBe(0);
    });
  });
});
