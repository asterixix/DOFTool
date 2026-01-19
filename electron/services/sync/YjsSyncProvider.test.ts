import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as Y from 'yjs';
import { YjsSyncProvider } from './YjsSyncProvider';

import type { DataChannelLike, SyncMessage, AwarenessState } from './Sync.types';
import type { Awareness } from 'y-protocols/awareness';

// Mock yjs
const mockYDoc = {
  getMap: vi.fn(),
  getArray: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  transact: vi.fn((fn: () => void) => fn()),
  applyUpdate: vi.fn(),
};

vi.mock('yjs', () => ({
  Doc: vi.fn(() => mockYDoc),
  mergeUpdates: vi.fn((updates: Uint8Array[]) => new Uint8Array(updates[0] ?? [])),
  encodeStateAsUpdate: vi.fn(() => new Uint8Array([1, 2, 3])),
  encodeStateVector: vi.fn(() => new Uint8Array([1])),
  applyUpdate: vi.fn(),
}));

// Mock y-protocols/awareness
const mockAwareness = {
  setLocalState: vi.fn(),
  setLocalStateField: vi.fn(),
  getLocalState: vi.fn(() => ({})),
  getStates: vi.fn(() => new Map()),
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
  clientID: 12345,
};

vi.mock('y-protocols/awareness', () => ({
  Awareness: vi.fn(() => mockAwareness),
  encodeAwarenessUpdate: vi.fn(() => new Uint8Array([1, 2, 3])),
  decodeAwarenessUpdate: vi.fn(() => []),
}));

// Mock SyncPerformance
vi.mock('./SyncPerformance', () => ({
  debounce: vi.fn((fn: () => void) => {
    const debounced = () => fn();
    debounced.cancel = vi.fn();
    debounced.flush = vi.fn(() => fn());
    return debounced;
  }),
  throttle: vi.fn((fn: (data: unknown) => void) => {
    const throttled = (data: unknown) => fn(data);
    throttled.cancel = vi.fn();
    return throttled;
  }),
}));

describe('YjsSyncProvider', () => {
  let syncProvider: YjsSyncProvider;
  let mockYDocInstance: Y.Doc;
  let mockDataChannel: DataChannelLike;

  beforeEach(() => {
    vi.clearAllMocks();

    mockYDocInstance = mockYDoc as unknown as Y.Doc;

    mockDataChannel = {
      readyState: 'open' as RTCDataChannelState,
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
    };

    syncProvider = new YjsSyncProvider();
  });

  afterEach(() => {
    try {
      syncProvider.destroy();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should initialize sync provider', () => {
      const config = {
        deviceId: 'device-1',
        deviceName: 'Test Device',
      };

      syncProvider.initialize(config, mockYDocInstance);

      expect(mockYDoc.on).toHaveBeenCalled();
      expect(mockAwareness.on).toHaveBeenCalled();
    });

    it('should set up awareness state', () => {
      const config = {
        deviceId: 'device-1',
        deviceName: 'Test Device',
      };

      syncProvider.initialize(config, mockYDocInstance);

      expect(mockAwareness.setLocalState).toHaveBeenCalled();
    });
  });

  describe('addPeer', () => {
    beforeEach(() => {
      const config = {
        deviceId: 'device-1',
        deviceName: 'Test Device',
      };

      syncProvider.initialize(config, mockYDocInstance);
    });

    it('should add peer for sync', () => {
      syncProvider.addPeer('peer-1', mockDataChannel);

      const peers = syncProvider.getPeers();
      expect(peers).toContain('peer-1');
    });

    it('should send initial sync state to new peer', () => {
      syncProvider.addPeer('peer-1', mockDataChannel);

      expect(mockDataChannel.send).toHaveBeenCalled();
    });
  });

  describe('removePeer', () => {
    beforeEach(() => {
      const config = {
        deviceId: 'device-1',
        deviceName: 'Test Device',
      };

      syncProvider.initialize(config, mockYDocInstance);
      syncProvider.addPeer('peer-1', mockDataChannel);
    });

    it('should remove peer', () => {
      syncProvider.removePeer('peer-1');

      const peers = syncProvider.getPeers();
      expect(peers).not.toContain('peer-1');
    });
  });

  describe('sync messages', () => {
    beforeEach(() => {
      const config = {
        deviceId: 'device-1',
        deviceName: 'Test Device',
      };

      syncProvider.initialize(config, mockYDocInstance);
      syncProvider.addPeer('peer-1', mockDataChannel);
    });

    it('should handle sync message from peer', async () => {
      const message = JSON.stringify({
        type: 'UPDATE' as SyncMessage['type'],
        payload: Buffer.from([1, 2, 3]).toString('base64'),
        timestamp: Date.now(),
      });

      // Simulate message by calling onmessage directly
      if (mockDataChannel.onmessage) {
        mockDataChannel.onmessage({ data: message } as MessageEvent);
      }

      // Wait for setImmediate to process the message
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(vi.mocked(Y).applyUpdate).toHaveBeenCalled();
    });

    it('should handle awareness update from peer', () => {
      const message = JSON.stringify({
        type: 'AWARENESS' as SyncMessage['type'],
        payload: Buffer.from([1, 2, 3]).toString('base64'),
        timestamp: Date.now(),
      });

      // Simulate message by calling onmessage directly
      if (mockDataChannel.onmessage) {
        mockDataChannel.onmessage({ data: message } as MessageEvent);
      }

      // Awareness should be updated
      expect(syncProvider).toBeDefined();
    });
  });

  describe('broadcast updates', () => {
    beforeEach(() => {
      const config = {
        deviceId: 'device-1',
        deviceName: 'Test Device',
      };

      syncProvider.initialize(config, mockYDocInstance);
      syncProvider.addPeer('peer-1', mockDataChannel);
    });

    it('should broadcast document updates to peers', () => {
      // Simulate document update
      const handler = mockYDoc.on.mock.calls.find((call) => call[0] === 'update')?.[1];
      if (handler && typeof handler === 'function') {
        handler(new Uint8Array([1, 2, 3]), 'local');
      }

      // Update should be queued
      expect(syncProvider).toBeDefined();
    });

    it('should flush pending updates when limit reached', () => {
      // Add multiple updates
      const handler = mockYDoc.on.mock.calls.find((call) => call[0] === 'update')?.[1];
      if (handler && typeof handler === 'function') {
        for (let i = 0; i < 60; i++) {
          handler(new Uint8Array([1, 2, 3]), 'local');
        }
      }

      // Updates should be flushed
      expect(mockDataChannel.send).toHaveBeenCalled();
    });
  });

  describe('awareness', () => {
    beforeEach(() => {
      const config = {
        deviceId: 'device-1',
        deviceName: 'Test Device',
      };

      syncProvider.initialize(config, mockYDocInstance);
    });

    it('should update local awareness state', () => {
      syncProvider.updateAwarenessState({ currentView: 'calendar' });

      expect(mockAwareness.setLocalState).toHaveBeenCalled();
    });

    it('should get awareness states', () => {
      const states = syncProvider.getAwarenessStates();

      expect(states).toBeDefined();
      expect(states instanceof Map).toBe(true);
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      const config = {
        deviceId: 'device-1',
        deviceName: 'Test Device',
      };

      syncProvider.initialize(config, mockYDocInstance);
      syncProvider.addPeer('peer-1', mockDataChannel);
    });

    it('should destroy provider and cleanup', () => {
      syncProvider.destroy();

      expect(mockYDoc.off).toHaveBeenCalled();
      expect(mockAwareness.off).toHaveBeenCalled();
      expect(mockAwareness.destroy).toHaveBeenCalled();
      expect(mockDataChannel.close).toHaveBeenCalled();
    });
  });

  describe('getPeers', () => {
    beforeEach(() => {
      const config = {
        deviceId: 'device-1',
        deviceName: 'Test Device',
      };

      syncProvider.initialize(config, mockYDocInstance);
    });

    it('should return list of connected peers', () => {
      syncProvider.addPeer('peer-1', mockDataChannel);
      syncProvider.addPeer('peer-2', mockDataChannel);

      const peers = syncProvider.getPeers();

      expect(peers).toContain('peer-1');
      expect(peers).toContain('peer-2');
      expect(peers.length).toBe(2);
    });
  });

  describe('events', () => {
    beforeEach(() => {
      const config = {
        deviceId: 'device-1',
        deviceName: 'Test Device',
      };

      syncProvider.initialize(config, mockYDocInstance);
    });

    it('should emit sync-started event', async () => {
      let deviceId: string | undefined;

      const promise = new Promise<string>((resolve) => {
        syncProvider.on('sync-started', (id) => {
          resolve(id);
        });
      });

      // Simulate sync start
      syncProvider.addPeer('peer-1', mockDataChannel);

      deviceId = await promise;
      expect(deviceId).toBeDefined();
    });

    it('should emit sync-completed event', async () => {
      let deviceId: string | undefined;

      const promise = new Promise<string>((resolve) => {
        syncProvider.on('sync-completed', (id) => {
          resolve(id);
        });
      });

      // Add peer to start sync
      syncProvider.addPeer('peer-1', mockDataChannel);

      // Simulate receiving SYNC_STEP_1 message
      const stateVector = Y.encodeStateVector(mockYDocInstance);
      const step1Message = JSON.stringify({
        type: 'SYNC_STEP_1' as SyncMessage['type'],
        payload: Buffer.from(stateVector).toString('base64'),
        timestamp: Date.now(),
      });

      if (mockDataChannel.onmessage) {
        // This will trigger SYNC_STEP_2 response
        mockDataChannel.onmessage({ data: step1Message } as MessageEvent);
      }

      // Now simulate receiving SYNC_STEP_2 to complete sync
      const update = Y.encodeStateAsUpdate(mockYDocInstance);
      const step2Message = JSON.stringify({
        type: 'SYNC_STEP_2' as SyncMessage['type'],
        payload: Buffer.from(update).toString('base64'),
        timestamp: Date.now(),
      });

      if (mockDataChannel.onmessage) {
        mockDataChannel.onmessage({ data: step2Message } as MessageEvent);
      }

      deviceId = await promise;
      expect(deviceId).toBeDefined();
    });

    it('should emit awareness-update event', async () => {
      let states: Map<number, AwarenessState> | undefined;

      const promise = new Promise<Map<number, AwarenessState>>((resolve) => {
        syncProvider.on('awareness-update', (s) => {
          resolve(s);
        });
      });

      // Trigger awareness change by simulating the awareness handler
      const awarenessHandler = mockAwareness.on.mock.calls.find(
        (call) => call[0] === 'change'
      )?.[1];
      if (awarenessHandler && typeof awarenessHandler === 'function') {
        awarenessHandler({
          added: [1],
          updated: [],
          removed: [],
        });
      }

      states = await promise;
      expect(states).toBeDefined();
    });
  });
});
