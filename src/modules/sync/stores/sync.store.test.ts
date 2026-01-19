import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useSyncStore } from './sync.store';

import type { PeerInfo, DiscoveredPeerInfo } from './sync.store';

describe('sync.store', () => {
  beforeEach(() => {
    const { reset } = useSyncStore.getState();
    act(() => {
      reset();
    });
  });

  describe('initial state', () => {
    it('should have offline status initially', () => {
      const state = useSyncStore.getState();
      expect(state.status).toBe('offline');
    });

    it('should have empty peers array initially', () => {
      const state = useSyncStore.getState();
      expect(state.peers).toEqual([]);
    });

    it('should have empty discoveredPeers array initially', () => {
      const state = useSyncStore.getState();
      expect(state.discoveredPeers).toEqual([]);
    });

    it('should have zero peerCount initially', () => {
      const state = useSyncStore.getState();
      expect(state.peerCount).toBe(0);
    });

    it('should have null lastSyncAt initially', () => {
      const state = useSyncStore.getState();
      expect(state.lastSyncAt).toBeNull();
    });

    it('should have null error initially', () => {
      const state = useSyncStore.getState();
      expect(state.error).toBeNull();
    });

    it('should have false isInitialized initially', () => {
      const state = useSyncStore.getState();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('setters', () => {
    it('should set status', () => {
      const { setStatus } = useSyncStore.getState();
      act(() => {
        setStatus('connected');
      });

      expect(useSyncStore.getState().status).toBe('connected');
    });

    it('should set peers and update peerCount', () => {
      const peers: PeerInfo[] = [
        {
          deviceId: 'peer-1',
          deviceName: 'Peer 1',
          status: 'connected',
          lastSeen: Date.now(),
          lastSyncAt: Date.now(),
        },
        {
          deviceId: 'peer-2',
          deviceName: 'Peer 2',
          status: 'disconnected',
          lastSeen: Date.now(),
          lastSyncAt: null,
        },
      ];

      const { setPeers } = useSyncStore.getState();
      act(() => {
        setPeers(peers);
      });

      const state = useSyncStore.getState();
      expect(state.peers).toEqual(peers);
      expect(state.peerCount).toBe(2);
    });

    it('should set discovered peers', () => {
      const discoveredPeers: DiscoveredPeerInfo[] = [
        {
          deviceId: 'peer-1',
          deviceName: 'Peer 1',
          host: '192.168.1.1',
          port: 8080,
          discoveredAt: Date.now(),
        },
      ];

      const { setDiscoveredPeers } = useSyncStore.getState();
      act(() => {
        setDiscoveredPeers(discoveredPeers);
      });

      expect(useSyncStore.getState().discoveredPeers).toEqual(discoveredPeers);
    });

    it('should set peer count', () => {
      const { setPeerCount } = useSyncStore.getState();
      act(() => {
        setPeerCount(5);
      });

      expect(useSyncStore.getState().peerCount).toBe(5);
    });

    it('should set lastSyncAt', () => {
      const now = Date.now();
      const { setLastSyncAt } = useSyncStore.getState();
      act(() => {
        setLastSyncAt(now);
      });

      expect(useSyncStore.getState().lastSyncAt).toBe(now);
    });

    it('should set error', () => {
      const { setError } = useSyncStore.getState();
      act(() => {
        setError('Sync error');
      });

      expect(useSyncStore.getState().error).toBe('Sync error');
    });

    it('should set initialized', () => {
      const { setInitialized } = useSyncStore.getState();
      act(() => {
        setInitialized(true);
      });

      expect(useSyncStore.getState().isInitialized).toBe(true);
    });
  });

  describe('peer management', () => {
    it('should add peer', () => {
      const peer: PeerInfo = {
        deviceId: 'peer-1',
        deviceName: 'Peer 1',
        status: 'connected',
        lastSeen: Date.now(),
        lastSyncAt: Date.now(),
      };

      const { addPeer } = useSyncStore.getState();
      act(() => {
        addPeer(peer);
      });

      const state = useSyncStore.getState();
      expect(state.peers).toHaveLength(1);
      expect(state.peers[0]).toEqual(peer);
      expect(state.peerCount).toBe(1);
    });

    it('should update existing peer when adding duplicate', () => {
      const peer1: PeerInfo = {
        deviceId: 'peer-1',
        deviceName: 'Peer 1',
        status: 'connected',
        lastSeen: Date.now(),
        lastSyncAt: Date.now(),
      };

      const peer2: PeerInfo = {
        deviceId: 'peer-1',
        deviceName: 'Peer 1 Updated',
        status: 'disconnected',
        lastSeen: Date.now() + 1000,
        lastSyncAt: null,
      };

      const { addPeer } = useSyncStore.getState();
      act(() => {
        addPeer(peer1);
        addPeer(peer2);
      });

      const state = useSyncStore.getState();
      expect(state.peers).toHaveLength(1);
      expect(state.peers[0]).toEqual(peer2);
    });

    it('should remove peer', () => {
      const peer: PeerInfo = {
        deviceId: 'peer-1',
        deviceName: 'Peer 1',
        status: 'connected',
        lastSeen: Date.now(),
        lastSyncAt: Date.now(),
      };

      const { addPeer, removePeer } = useSyncStore.getState();
      act(() => {
        addPeer(peer);
        removePeer('peer-1');
      });

      const state = useSyncStore.getState();
      expect(state.peers).toHaveLength(0);
      expect(state.peerCount).toBe(0);
    });

    it('should update peer', () => {
      const peer: PeerInfo = {
        deviceId: 'peer-1',
        deviceName: 'Peer 1',
        status: 'connected',
        lastSeen: Date.now(),
        lastSyncAt: Date.now(),
      };

      const { addPeer, updatePeer } = useSyncStore.getState();
      act(() => {
        addPeer(peer);
        updatePeer('peer-1', { status: 'disconnected' });
      });

      const state = useSyncStore.getState();
      expect(state.peers[0]?.status).toBe('disconnected');
    });
  });

  describe('computed helpers', () => {
    it('should get connected peer count', () => {
      const peers: PeerInfo[] = [
        {
          deviceId: 'peer-1',
          deviceName: 'Peer 1',
          status: 'connected',
          lastSeen: Date.now(),
          lastSyncAt: Date.now(),
        },
        {
          deviceId: 'peer-2',
          deviceName: 'Peer 2',
          status: 'disconnected',
          lastSeen: Date.now(),
          lastSyncAt: null,
        },
        {
          deviceId: 'peer-3',
          deviceName: 'Peer 3',
          status: 'connected',
          lastSeen: Date.now(),
          lastSyncAt: Date.now(),
        },
      ];

      const { setPeers, getConnectedPeerCount } = useSyncStore.getState();
      act(() => {
        setPeers(peers);
      });

      expect(getConnectedPeerCount()).toBe(2);
    });

    it('should get sync status text for connected', () => {
      const peers: PeerInfo[] = [
        {
          deviceId: 'peer-1',
          deviceName: 'Peer 1',
          status: 'connected',
          lastSeen: Date.now(),
          lastSyncAt: Date.now(),
        },
      ];

      const { setStatus, setPeers, getSyncStatusText } = useSyncStore.getState();
      act(() => {
        setStatus('connected');
        setPeers(peers);
      });

      expect(getSyncStatusText()).toBe('1 device connected');
    });

    it('should get sync status text for multiple connected devices', () => {
      const peers: PeerInfo[] = [
        {
          deviceId: 'peer-1',
          deviceName: 'Peer 1',
          status: 'connected',
          lastSeen: Date.now(),
          lastSyncAt: Date.now(),
        },
        {
          deviceId: 'peer-2',
          deviceName: 'Peer 2',
          status: 'connected',
          lastSeen: Date.now(),
          lastSyncAt: Date.now(),
        },
      ];

      const { setStatus, setPeers, getSyncStatusText } = useSyncStore.getState();
      act(() => {
        setStatus('connected');
        setPeers(peers);
      });

      expect(getSyncStatusText()).toBe('2 devices connected');
    });

    it('should get sync status text for syncing', () => {
      const { setStatus, getSyncStatusText } = useSyncStore.getState();
      act(() => {
        setStatus('syncing');
      });

      expect(getSyncStatusText()).toBe('Syncing...');
    });

    it('should get sync status text for connecting', () => {
      const { setStatus, getSyncStatusText } = useSyncStore.getState();
      act(() => {
        setStatus('connecting');
      });

      expect(getSyncStatusText()).toBe('Connecting...');
    });

    it('should get sync status text for discovering', () => {
      const { setStatus, getSyncStatusText } = useSyncStore.getState();
      act(() => {
        setStatus('discovering');
      });

      expect(getSyncStatusText()).toBe('Discovering devices...');
    });

    it('should get sync status text for offline', () => {
      const { setStatus, getSyncStatusText } = useSyncStore.getState();
      act(() => {
        setStatus('offline');
      });

      expect(getSyncStatusText()).toBe('Offline');
    });

    it('should return true for isConnected when connected', () => {
      const { setStatus, isConnected } = useSyncStore.getState();
      act(() => {
        setStatus('connected');
      });

      expect(isConnected()).toBe(true);
    });

    it('should return true for isConnected when syncing', () => {
      const { setStatus, isConnected } = useSyncStore.getState();
      act(() => {
        setStatus('syncing');
      });

      expect(isConnected()).toBe(true);
    });

    it('should return false for isConnected when offline', () => {
      const { setStatus, isConnected } = useSyncStore.getState();
      act(() => {
        setStatus('offline');
      });

      expect(isConnected()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const peers: PeerInfo[] = [
        {
          deviceId: 'peer-1',
          deviceName: 'Peer 1',
          status: 'connected',
          lastSeen: Date.now(),
          lastSyncAt: Date.now(),
        },
      ];

      const { setStatus, setPeers, setError, setInitialized, reset } = useSyncStore.getState();
      act(() => {
        setStatus('connected');
        setPeers(peers);
        setError('Error');
        setInitialized(true);
      });

      act(() => {
        reset();
      });

      const state = useSyncStore.getState();
      expect(state.status).toBe('offline');
      expect(state.peers).toEqual([]);
      expect(state.discoveredPeers).toEqual([]);
      expect(state.peerCount).toBe(0);
      expect(state.lastSyncAt).toBeNull();
      expect(state.error).toBeNull();
      expect(state.isInitialized).toBe(false);
    });
  });
});
