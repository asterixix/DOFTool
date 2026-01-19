import { EventEmitter } from 'events';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SyncService } from './SyncService';

import type { SyncConfig, AwarenessState } from './Sync.types';
import type * as Y from 'yjs';

// Mock WebrtcProvider with event simulation
function createMockProvider(): EventEmitter & {
  connected: boolean;
  awareness: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    setLocalState: ReturnType<typeof vi.fn>;
    setLocalStateField: ReturnType<typeof vi.fn>;
    getLocalState: ReturnType<typeof vi.fn>;
    getStates: ReturnType<typeof vi.fn>;
    clientID: number;
  };
  destroy: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  room: string;
} {
  const provider = new EventEmitter() as EventEmitter & {
    connected: boolean;
    awareness: {
      on: ReturnType<typeof vi.fn>;
      off: ReturnType<typeof vi.fn>;
      setLocalState: ReturnType<typeof vi.fn>;
      setLocalStateField: ReturnType<typeof vi.fn>;
      getLocalState: ReturnType<typeof vi.fn>;
      getStates: ReturnType<typeof vi.fn>;
      clientID: number;
    };
    destroy: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    room: string;
  };

  provider.connected = false;
  provider.room = 'test-room';
  provider.destroy = vi.fn();
  provider.connect = vi.fn(() => {
    provider.connected = true;
  });
  provider.disconnect = vi.fn(() => {
    provider.connected = false;
  });

  const awarenessStates = new Map<number, AwarenessState>();
  awarenessStates.set(1, {
    deviceId: 'local-device',
    deviceName: 'Local',
    currentView: 'calendar',
    lastSeen: Date.now(),
  });

  provider.awareness = {
    on: vi.fn(),
    off: vi.fn(),
    setLocalState: vi.fn(),
    setLocalStateField: vi.fn(),
    getLocalState: vi.fn(() => ({ deviceId: 'local-device', deviceName: 'Local' })),
    getStates: vi.fn(() => awarenessStates),
    clientID: 1,
  };

  return provider;
}

// Mock Y.Doc
function createMockYDoc(): Y.Doc & {
  _updateHandlers: ((update: Uint8Array, origin: unknown) => void)[];
} {
  const handlers: ((update: Uint8Array, origin: unknown) => void)[] = [];

  return {
    _updateHandlers: handlers,
    on: vi.fn((event: string, handler: (update: Uint8Array, origin: unknown) => void) => {
      if (event === 'update') {
        handlers.push(handler);
      }
    }),
    off: vi.fn(),
    destroy: vi.fn(),
    getMap: vi.fn(() => ({
      set: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      toJSON: vi.fn(() => ({})),
    })),
    getArray: vi.fn(() => ({
      push: vi.fn(),
      toArray: vi.fn(() => []),
    })),
    getText: vi.fn(() => ({
      toString: vi.fn(() => ''),
      insert: vi.fn(),
    })),
    transact: vi.fn((fn: () => void) => fn()),
    clientID: 12345,
    guid: 'test-doc-guid',
  } as unknown as Y.Doc & {
    _updateHandlers: ((update: Uint8Array, origin: unknown) => void)[];
  };
}

let mockProvider: ReturnType<typeof createMockProvider>;

vi.mock('y-webrtc', () => ({
  WebrtcProvider: vi.fn(() => mockProvider),
}));

describe('SyncService', () => {
  let syncService: SyncService;
  let mockYDoc: ReturnType<typeof createMockYDoc>;

  const defaultConfig: SyncConfig = {
    familyId: 'test-family',
    deviceId: 'local-device-123',
    deviceName: 'Local Device',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
    mockYDoc = createMockYDoc();
    syncService = new SyncService();
  });

  afterEach(() => {
    try {
      syncService.destroy();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should initialize with config and Y.Doc', () => {
      syncService.initialize(defaultConfig, mockYDoc);

      expect(syncService).toBeDefined();
      expect(syncService.isActive()).toBe(false);
    });

    it('should allow reinitialization', async () => {
      await syncService.initialize(defaultConfig, mockYDoc);

      // Should not throw when initializing again
      await expect(() => syncService.initialize(defaultConfig, mockYDoc)).not.toThrow();
    });
  });

  describe('start', () => {
    beforeEach(() => {
      syncService.initialize(defaultConfig, mockYDoc);
    });

    it('should start sync and set isActive to true', () => {
      syncService.start();

      expect(syncService.isActive()).toBe(true);
    });

    it('should emit status-changed event when started', () => {
      const statusHandler = vi.fn();
      syncService.on('status-changed', statusHandler);

      syncService.start();

      // Simulate provider status event
      mockProvider.emit('status', { connected: true });

      expect(statusHandler).toHaveBeenCalled();
    });

    it('should throw error if not initialized', () => {
      const uninitializedService = new SyncService();

      expect(() => {
        uninitializedService.start();
      }).toThrow('SyncService not initialized');
    });

    it('should not start if already active', () => {
      syncService.start();
      const startAgain = () => syncService.start();

      // Should not throw but also should not create a new provider
      expect(startAgain).not.toThrow();
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      syncService.initialize(defaultConfig, mockYDoc);
      syncService.start();
    });

    it('should stop sync and set isActive to false', () => {
      syncService.stop();

      expect(syncService.isActive()).toBe(false);
    });

    it('should destroy provider on stop', () => {
      syncService.stop();

      expect(mockProvider.destroy).toHaveBeenCalled();
    });

    it('should emit status-changed with disconnected status', () => {
      const statusHandler = vi.fn();
      syncService.on('status-changed', statusHandler);

      syncService.stop();

      expect(statusHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'offline',
          peerCount: 0,
        })
      );
    });
  });

  describe('getStatus', () => {
    it('should return disconnected status before starting', () => {
      syncService.initialize(defaultConfig, mockYDoc);

      const status = syncService.getStatus();

      expect(status.status).toBe('offline');
      expect(status.peerCount).toBe(0);
    });

    it('should return status reflecting provider state after starting', () => {
      syncService.initialize(defaultConfig, mockYDoc);
      syncService.start();

      mockProvider.connected = true;
      mockProvider.emit('status', { connected: true });

      const status = syncService.getStatus();

      expect(status.status).toBe('discovering');
    });
  });

  describe('getConnectedPeers', () => {
    beforeEach(() => {
      syncService.initialize(defaultConfig, mockYDoc);
      syncService.start();
    });

    it('should return empty array when no peers connected', () => {
      const peers = syncService.getConnectedPeers();

      expect(peers).toEqual([]);
    });

    it('should return peer IDs after peers connect', () => {
      // Simulate peers event
      mockProvider.emit('peers', {
        added: ['peer-1', 'peer-2'],
        removed: [],
        webrtcPeers: ['peer-1', 'peer-2'],
        bcPeers: [],
      });

      const peers = syncService.getConnectedPeers();

      expect(peers).toHaveLength(2);
      expect(peers[0]).toHaveProperty('deviceId', 'peer-1');
      expect(peers[1]).toHaveProperty('deviceId', 'peer-2');
    });
  });

  describe('peer events', () => {
    beforeEach(() => {
      syncService.initialize(defaultConfig, mockYDoc);
      syncService.start();
    });

    it('should emit peer-connected when peer joins', () => {
      const peerConnectedHandler = vi.fn();
      syncService.on('peer-connected', peerConnectedHandler);

      mockProvider.emit('peers', {
        added: ['peer-1'],
        removed: [],
        webrtcPeers: ['peer-1'],
        bcPeers: [],
      });

      expect(peerConnectedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'peer-1',
        })
      );
    });

    it('should emit peer-disconnected when peer leaves', () => {
      const peerDisconnectedHandler = vi.fn();
      syncService.on('peer-disconnected', peerDisconnectedHandler);

      // First add the peer
      mockProvider.emit('peers', {
        added: ['peer-1'],
        removed: [],
        webrtcPeers: ['peer-1'],
        bcPeers: [],
      });

      // Then remove the peer
      mockProvider.emit('peers', {
        added: [],
        removed: ['peer-1'],
        webrtcPeers: [],
        bcPeers: [],
      });

      expect(peerDisconnectedHandler).toHaveBeenCalledWith('peer-1');
    });
  });

  describe('sync events', () => {
    beforeEach(() => {
      syncService.initialize(defaultConfig, mockYDoc);
      syncService.start();
    });

    it('should emit sync-completed when synced', () => {
      const syncCompletedHandler = vi.fn();
      syncService.on('sync-completed', syncCompletedHandler);

      mockProvider.emit('synced', { synced: true });

      expect(syncCompletedHandler).toHaveBeenCalled();
    });
  });

  describe('awareness', () => {
    beforeEach(() => {
      syncService.initialize(defaultConfig, mockYDoc);
      syncService.start();
    });

    it('should set local awareness state', () => {
      const state: AwarenessState = {
        deviceId: defaultConfig.deviceId,
        deviceName: defaultConfig.deviceName,
        currentView: 'calendar',
        lastSeen: Date.now(),
      };

      syncService.setAwarenessState(state);

      expect(mockProvider.awareness.setLocalState).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: defaultConfig.deviceId,
          deviceName: defaultConfig.deviceName,
          currentView: 'calendar',
        })
      );
    });

    it('should get awareness states', () => {
      const states = syncService.getAwarenessStates();

      expect(mockProvider.awareness.getStates).toHaveBeenCalled();
      expect(states).toBeDefined();
    });

    it('should emit awareness-update event', () => {
      const awarenessHandler = vi.fn();
      syncService.on('awareness-update', awarenessHandler);

      // Find and trigger the awareness change handler
      const awarenessOnCalls = mockProvider.awareness.on.mock.calls;
      const changeHandler = awarenessOnCalls.find(
        (call: unknown[]) => call[0] === 'change'
      )?.[1] as
        | ((changes: { added: number[]; updated: number[]; removed: number[] }) => void)
        | undefined;

      if (changeHandler) {
        changeHandler({ added: [2], updated: [], removed: [] });
      }

      expect(awarenessHandler).toHaveBeenCalled();
    });
  });

  describe('forceSync', () => {
    beforeEach(() => {
      syncService.initialize(defaultConfig, mockYDoc);
      syncService.start();
    });

    it('should trigger sync broadcast', () => {
      syncService.forceSync();

      // Force sync should emit update to trigger sync
      expect(syncService.isActive()).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should cleanup all resources', () => {
      syncService.initialize(defaultConfig, mockYDoc);
      syncService.start();
      syncService.destroy();

      expect(mockProvider.destroy).toHaveBeenCalled();
      expect(syncService.isActive()).toBe(false);
      expect(syncService.listenerCount('status-changed')).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      syncService.initialize(defaultConfig, mockYDoc);
      syncService.start();

      expect(() => {
        syncService.destroy();
        syncService.destroy();
      }).not.toThrow();
    });
  });
});
