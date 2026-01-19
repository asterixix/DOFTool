import crypto from 'crypto';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { DiscoveryService } from './DiscoveryService';
import { SYNC_PROTOCOL_VERSION, MDNS_SERVICE_TYPE } from './Sync.types';

import type { DiscoveredPeer } from './Sync.types';
import type { Service, Browser } from 'bonjour-service';

// Helper to create a mock service with proper family ID hash
function createMockService(
  familyId: string,
  deviceId: string,
  deviceName: string,
  host = '192.168.1.100'
): Partial<Service> {
  const familyIdHash = crypto.createHash('sha256').update(familyId).digest('hex').slice(0, 32);
  return {
    stop: vi.fn(),
    name: `DOFTool-${deviceId.slice(0, 8)}`,
    type: MDNS_SERVICE_TYPE,
    port: 8080,
    host,
    addresses: [host],
    txt: {
      fid: familyIdHash,
      did: deviceId,
      dn: deviceName,
      pv: SYNC_PROTOCOL_VERSION,
      av: '0.1.0',
    },
  };
}

// Mock browser with event simulation capability
function createMockBrowser(): Browser & { _handlers: Map<string, ((service: Service) => void)[]> } {
  const handlers = new Map<string, ((service: Service) => void)[]>();
  return {
    _handlers: handlers,
    start: vi.fn(),
    stop: vi.fn(),
    on: vi.fn((event: string, handler: (service: Service) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, []);
      }
      handlers.get(event)!.push(handler);
    }),
    services: [],
  } as unknown as Browser & { _handlers: Map<string, ((service: Service) => void)[]> };
}

let mockBrowser: ReturnType<typeof createMockBrowser>;
let mockAdvertisement: Partial<Service>;

const mockBonjour = {
  publish: vi.fn(() => {
    mockAdvertisement = { stop: vi.fn() };
    return mockAdvertisement as Service;
  }),
  find: vi.fn(() => mockBrowser),
  destroy: vi.fn(),
};

vi.mock('bonjour-service', () => ({
  default: vi.fn(() => mockBonjour),
  Bonjour: vi.fn(() => mockBonjour),
}));

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;

  const defaultConfig = {
    deviceId: 'device-local-123',
    deviceName: 'Test Device',
    familyId: 'family-test-1',
    signalingPort: 8080,
    appVersion: '0.1.0',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBrowser = createMockBrowser();
    discoveryService = new DiscoveryService();
  });

  afterEach(() => {
    try {
      discoveryService.destroy();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should initialize discovery service with config', () => {
      discoveryService.initialize(defaultConfig);

      expect(discoveryService).toBeDefined();
      expect(discoveryService.isActive()).toBe(false);
    });

    it('should create bonjour instance on initialize', () => {
      discoveryService.initialize(defaultConfig);

      // Bonjour constructor should have been called
      expect(mockBonjour).toBeDefined();
    });
  });

  describe('startAdvertising', () => {
    it('should publish mDNS advertisement with correct parameters', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.startAdvertising();

      expect(mockBonjour.publish).toHaveBeenCalledTimes(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls = mockBonjour.publish.mock.calls as any[][];
      expect(calls.length).toBeGreaterThan(0);

      const publishArg = calls[0][0] as {
        name: string;
        type: string;
        port: number;
        txt: { did: string; dn: string; pv: string; av: string; fid: string };
      };

      expect(publishArg.name).toContain('DOFTool-');
      expect(publishArg.type).toBe(MDNS_SERVICE_TYPE);
      expect(publishArg.port).toBe(defaultConfig.signalingPort);
      expect(publishArg.txt.did).toBe(defaultConfig.deviceId);
      expect(publishArg.txt.dn).toBe(defaultConfig.deviceName);
      expect(publishArg.txt.pv).toBe(SYNC_PROTOCOL_VERSION);
      expect(publishArg.txt.av).toBe(defaultConfig.appVersion);
    });

    it('should hash family ID in advertisement for privacy', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.startAdvertising();

      expect(mockBonjour.publish).toHaveBeenCalledTimes(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls = mockBonjour.publish.mock.calls as any[][];
      expect(calls.length).toBeGreaterThan(0);

      const publishArg = calls[0][0] as {
        txt: { fid: string };
      };

      const familyIdHash = crypto
        .createHash('sha256')
        .update(defaultConfig.familyId)
        .digest('hex')
        .slice(0, 32);

      expect(publishArg.txt.fid).toBe(familyIdHash);
      expect(publishArg.txt.fid).not.toBe(defaultConfig.familyId);
    });

    it('should throw error if not initialized', () => {
      const uninitializedService = new DiscoveryService();

      expect(() => {
        uninitializedService.startAdvertising();
      }).toThrow('DiscoveryService not initialized');
    });

    it('should stop existing advertisement before starting new one', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.startAdvertising();

      const firstAd = mockAdvertisement;
      discoveryService.startAdvertising();

      expect(firstAd.stop).toHaveBeenCalled();
    });

    it('should emit error event on publish failure', () => {
      const errorHandler = vi.fn();
      mockBonjour.publish.mockImplementationOnce(() => {
        throw new Error('Publish failed');
      });

      discoveryService.initialize(defaultConfig);
      discoveryService.on('error', errorHandler);
      discoveryService.startAdvertising();

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('stopAdvertising', () => {
    it('should stop active advertisement', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.startAdvertising();
      discoveryService.stopAdvertising();

      expect(mockAdvertisement.stop).toHaveBeenCalled();
    });

    it('should not throw if not advertising', () => {
      discoveryService.initialize(defaultConfig);

      expect(() => {
        discoveryService.stopAdvertising();
      }).not.toThrow();
    });
  });

  describe('startBrowsing', () => {
    it('should start browsing for mDNS services', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.startBrowsing();

      expect(mockBonjour.find).toHaveBeenCalledWith({ type: MDNS_SERVICE_TYPE });
      expect(discoveryService.isActive()).toBe(true);
    });

    it('should throw error if not initialized', () => {
      const uninitializedService = new DiscoveryService();

      expect(() => {
        uninitializedService.startBrowsing();
      }).toThrow('DiscoveryService not initialized');
    });

    it('should register up and down event handlers', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.startBrowsing();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onCalls = (mockBrowser.on as ReturnType<typeof vi.fn>).mock.calls;
      const eventNames = onCalls.map((call) => call[0] as string);
      expect(eventNames).toContain('up');
      expect(eventNames).toContain('down');
    });

    it('should stop existing browser before starting new one', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.startBrowsing();
      discoveryService.startBrowsing();

      expect(mockBrowser.stop as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });
  });

  describe('peer discovery events', () => {
    it('should emit peer-discovered when service from same family appears', () => {
      const peerDiscoveredHandler = vi.fn();
      const peerService = createMockService(
        defaultConfig.familyId,
        'peer-device-456',
        'Peer Device'
      );

      discoveryService.initialize(defaultConfig);
      discoveryService.on('peer-discovered', peerDiscoveredHandler);
      discoveryService.startBrowsing();

      // Simulate service up event
      const upHandlers = mockBrowser._handlers.get('up') ?? [];
      upHandlers.forEach((handler) => handler(peerService as Service));

      expect(peerDiscoveredHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'peer-device-456',
          deviceName: 'Peer Device',
          host: '192.168.1.100',
          port: 8080,
          protocolVersion: SYNC_PROTOCOL_VERSION,
        })
      );
    });

    it('should not emit peer-discovered for services from different family', () => {
      const peerDiscoveredHandler = vi.fn();
      const peerService = createMockService(
        'different-family-id',
        'peer-device-456',
        'Peer Device'
      );

      discoveryService.initialize(defaultConfig);
      discoveryService.on('peer-discovered', peerDiscoveredHandler);
      discoveryService.startBrowsing();

      const upHandlers = mockBrowser._handlers.get('up') ?? [];
      upHandlers.forEach((handler) => handler(peerService as Service));

      expect(peerDiscoveredHandler).not.toHaveBeenCalled();
    });

    it('should not emit peer-discovered for own device', () => {
      const peerDiscoveredHandler = vi.fn();
      const ownService = createMockService(
        defaultConfig.familyId,
        defaultConfig.deviceId,
        defaultConfig.deviceName
      );

      discoveryService.initialize(defaultConfig);
      discoveryService.on('peer-discovered', peerDiscoveredHandler);
      discoveryService.startBrowsing();

      const upHandlers = mockBrowser._handlers.get('up') ?? [];
      upHandlers.forEach((handler) => handler(ownService as Service));

      expect(peerDiscoveredHandler).not.toHaveBeenCalled();
    });

    it('should not emit peer-discovered for incompatible protocol version', () => {
      const peerDiscoveredHandler = vi.fn();
      const peerService = createMockService(
        defaultConfig.familyId,
        'peer-device-456',
        'Peer Device'
      );
      (peerService.txt as Record<string, string>).pv = '999';

      discoveryService.initialize(defaultConfig);
      discoveryService.on('peer-discovered', peerDiscoveredHandler);
      discoveryService.startBrowsing();

      const upHandlers = mockBrowser._handlers.get('up') ?? [];
      upHandlers.forEach((handler) => handler(peerService as Service));

      expect(peerDiscoveredHandler).not.toHaveBeenCalled();
    });

    it('should emit peer-lost when service goes down', () => {
      const peerLostHandler = vi.fn();
      const peerService = createMockService(
        defaultConfig.familyId,
        'peer-device-456',
        'Peer Device'
      );

      discoveryService.initialize(defaultConfig);
      discoveryService.on('peer-lost', peerLostHandler);
      discoveryService.startBrowsing();

      // First discover the peer
      const upHandlers = mockBrowser._handlers.get('up') ?? [];
      upHandlers.forEach((handler) => handler(peerService as Service));

      // Then lose the peer
      const downHandlers = mockBrowser._handlers.get('down') ?? [];
      downHandlers.forEach((handler) => handler(peerService as Service));

      expect(peerLostHandler).toHaveBeenCalledWith('peer-device-456');
    });

    it('should not emit peer-lost for unknown peer', () => {
      const peerLostHandler = vi.fn();
      const peerService = createMockService(
        defaultConfig.familyId,
        'unknown-device',
        'Unknown Device'
      );

      discoveryService.initialize(defaultConfig);
      discoveryService.on('peer-lost', peerLostHandler);
      discoveryService.startBrowsing();

      // Lose a peer that was never discovered
      const downHandlers = mockBrowser._handlers.get('down') ?? [];
      downHandlers.forEach((handler) => handler(peerService as Service));

      expect(peerLostHandler).not.toHaveBeenCalled();
    });

    it('should handle service with no txt record', () => {
      const peerDiscoveredHandler = vi.fn();
      const peerService = { name: 'test', port: 8080 };

      discoveryService.initialize(defaultConfig);
      discoveryService.on('peer-discovered', peerDiscoveredHandler);
      discoveryService.startBrowsing();

      const upHandlers = mockBrowser._handlers.get('up') ?? [];
      expect(() => {
        upHandlers.forEach((handler) => handler(peerService as Service));
      }).not.toThrow();

      expect(peerDiscoveredHandler).not.toHaveBeenCalled();
    });
  });

  describe('stopBrowsing', () => {
    it('should stop the browser and set isActive to false', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.startBrowsing();

      expect(discoveryService.isActive()).toBe(true);

      discoveryService.stopBrowsing();

      expect(mockBrowser.stop as ReturnType<typeof vi.fn>).toHaveBeenCalled();
      expect(discoveryService.isActive()).toBe(false);
    });
  });

  describe('start and stop', () => {
    it('should start both advertising and browsing', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.start();

      expect(mockBonjour.publish).toHaveBeenCalled();
      expect(mockBonjour.find).toHaveBeenCalled();
      expect(discoveryService.isActive()).toBe(true);
    });

    it('should stop both advertising and browsing and clear peers', () => {
      const peerService = createMockService(
        defaultConfig.familyId,
        'peer-device-456',
        'Peer Device'
      );

      discoveryService.initialize(defaultConfig);
      discoveryService.start();

      // Discover a peer
      const upHandlers = mockBrowser._handlers.get('up') ?? [];
      upHandlers.forEach((handler) => handler(peerService as Service));

      expect(discoveryService.getDiscoveredPeers()).toHaveLength(1);

      discoveryService.stop();

      expect(mockAdvertisement.stop as ReturnType<typeof vi.fn>).toHaveBeenCalled();
      expect(mockBrowser.stop as ReturnType<typeof vi.fn>).toHaveBeenCalled();
      expect(discoveryService.getDiscoveredPeers()).toHaveLength(0);
    });
  });

  describe('getDiscoveredPeers', () => {
    it('should return empty array initially', () => {
      discoveryService.initialize(defaultConfig);

      const peers = discoveryService.getDiscoveredPeers();

      expect(peers).toEqual([]);
    });

    it('should return all discovered peers', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.startBrowsing();

      const peer1 = createMockService(defaultConfig.familyId, 'peer-1', 'Peer 1', '192.168.1.101');
      const peer2 = createMockService(defaultConfig.familyId, 'peer-2', 'Peer 2', '192.168.1.102');

      const upHandlers = mockBrowser._handlers.get('up') ?? [];
      upHandlers.forEach((handler) => handler(peer1 as Service));
      upHandlers.forEach((handler) => handler(peer2 as Service));

      const peers = discoveryService.getDiscoveredPeers();

      expect(peers).toHaveLength(2);
      expect(peers.map((p: DiscoveredPeer) => p.deviceId)).toContain('peer-1');
      expect(peers.map((p: DiscoveredPeer) => p.deviceId)).toContain('peer-2');
    });
  });

  describe('getPeer', () => {
    it('should return undefined for unknown device', () => {
      discoveryService.initialize(defaultConfig);

      expect(discoveryService.getPeer('unknown-id')).toBeUndefined();
    });

    it('should return peer by device ID', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.startBrowsing();

      const peerService = createMockService(
        defaultConfig.familyId,
        'peer-device-456',
        'Peer Device'
      );

      const upHandlers = mockBrowser._handlers.get('up') ?? [];
      upHandlers.forEach((handler) => handler(peerService as Service));

      const peer = discoveryService.getPeer('peer-device-456');

      expect(peer).toBeDefined();
      expect(peer?.deviceId).toBe('peer-device-456');
      expect(peer?.deviceName).toBe('Peer Device');
    });
  });

  describe('destroy', () => {
    it('should cleanup all resources', () => {
      discoveryService.initialize(defaultConfig);
      discoveryService.start();
      discoveryService.destroy();

      expect(mockBonjour.destroy).toHaveBeenCalled();
      expect(discoveryService.getDiscoveredPeers()).toHaveLength(0);
    });

    it('should remove all listeners', () => {
      const handler = vi.fn();
      discoveryService.initialize(defaultConfig);
      discoveryService.on('peer-discovered', handler);
      discoveryService.destroy();

      expect(discoveryService.listenerCount('peer-discovered')).toBe(0);
    });
  });
});
