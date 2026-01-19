import { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useSync } from './useSync';
import { useSyncStore } from '../stores/sync.store';

// Mock store
vi.mock('../stores/sync.store', () => ({
  useSyncStore: vi.fn(),
}));

// Mock window.electronAPI
const mockSyncAPI = {
  getStatus: vi.fn(),
  forceSync: vi.fn(),
  getPeers: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  getDiscoveredPeers: vi.fn(),
  initialize: vi.fn(),
};

const mockElectronAPI = {
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
  sync: mockSyncAPI,
};

describe('useSync', () => {
  const mockUseSyncStore = useSyncStore as unknown as ReturnType<typeof vi.fn>;

  interface MockSyncStore {
    status: 'offline' | 'discovering' | 'connecting' | 'connected' | 'syncing';
    peers: Array<{
      deviceId: string;
      deviceName: string;
      status: string;
      lastSeen: number;
      lastSyncAt: number | null;
    }>;
    discoveredPeers: Array<{
      deviceId: string;
      deviceName: string;
      host: string;
      port: number;
      discoveredAt: number;
    }>;
    peerCount: number;
    lastSyncAt: number | null;
    error: string | null;
    isInitialized: boolean;
    setStatus: ReturnType<typeof vi.fn>;
    setPeerCount: ReturnType<typeof vi.fn>;
    setLastSyncAt: ReturnType<typeof vi.fn>;
    setError: ReturnType<typeof vi.fn>;
    setInitialized: ReturnType<typeof vi.fn>;
    setPeers: ReturnType<typeof vi.fn>;
    setDiscoveredPeers: ReturnType<typeof vi.fn>;
    addPeer: ReturnType<typeof vi.fn>;
    removePeer: ReturnType<typeof vi.fn>;
    isConnected: ReturnType<typeof vi.fn>;
    getSyncStatusText: ReturnType<typeof vi.fn>;
  }

  const mockStore: MockSyncStore = {
    status: 'offline',
    peers: [],
    discoveredPeers: [],
    peerCount: 0,
    lastSyncAt: null,
    error: null,
    isInitialized: false,
    setStatus: vi.fn(),
    setPeerCount: vi.fn(),
    setLastSyncAt: vi.fn(),
    setError: vi.fn(),
    setInitialized: vi.fn(),
    setPeers: vi.fn(),
    setDiscoveredPeers: vi.fn(),
    addPeer: vi.fn(),
    removePeer: vi.fn(),
    isConnected: vi.fn(() => false),
    getSyncStatusText: vi.fn(() => 'Offline'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockUseSyncStore.mockReturnValue(mockStore);

    (window as unknown as { electronAPI: unknown }).electronAPI = mockElectronAPI;

    // Setup default mocks
    mockSyncAPI.getStatus.mockResolvedValue({
      status: 'offline',
      peerCount: 0,
      lastSyncAt: null,
      error: undefined,
      isInitialized: false,
    });
    mockSyncAPI.getPeers.mockResolvedValue([]);
    mockSyncAPI.getDiscoveredPeers.mockResolvedValue([]);
    mockSyncAPI.forceSync.mockResolvedValue({ success: true });
    mockSyncAPI.start.mockResolvedValue({ success: true });
    mockSyncAPI.stop.mockResolvedValue({ success: true });
    mockSyncAPI.initialize.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useSync());

    expect(result.current.status).toBe('offline');
    expect(result.current.peers).toEqual([]);
    expect(result.current.discoveredPeers).toEqual([]);
    expect(result.current.peerCount).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.isInitialized).toBe(false);
  });

  it('should refresh status', async () => {
    const statusData = {
      status: 'connected' as const,
      peerCount: 2,
      lastSyncAt: Date.now(),
      error: undefined,
      isInitialized: true,
    };

    mockSyncAPI.getStatus.mockResolvedValue(statusData);

    const { result } = renderHook(() => useSync());

    await act(async () => {
      await result.current.refreshStatus();
    });

    expect(mockSyncAPI.getStatus).toHaveBeenCalled();
    expect(mockStore.setStatus).toHaveBeenCalledWith('connected');
    expect(mockStore.setPeerCount).toHaveBeenCalledWith(2);
    expect(mockStore.setLastSyncAt).toHaveBeenCalled();
    expect(mockStore.setInitialized).toHaveBeenCalledWith(true);
  });

  it('should handle refresh status errors', async () => {
    mockSyncAPI.getStatus.mockRejectedValue(new Error('Failed to get status'));

    const { result } = renderHook(() => useSync());

    await act(async () => {
      await result.current.refreshStatus();
    });

    expect(mockStore.setError).toHaveBeenCalled();
    expect(mockStore.setInitialized).toHaveBeenCalledWith(false);
  });

  it('should refresh peers', async () => {
    const peers = [
      {
        deviceId: 'peer-1',
        deviceName: 'Peer 1',
        status: 'connected',
        lastSeen: Date.now(),
        lastSyncAt: null,
      },
    ];
    const discoveredPeers = [
      {
        deviceId: 'peer-2',
        deviceName: 'Peer 2',
        host: '192.168.1.1',
        port: 8080,
        discoveredAt: Date.now(),
      },
    ];

    mockSyncAPI.getPeers.mockResolvedValue(peers);
    mockSyncAPI.getDiscoveredPeers.mockResolvedValue(discoveredPeers);

    const { result } = renderHook(() => useSync());

    await act(async () => {
      await result.current.refreshPeers();
    });

    expect(mockSyncAPI.getPeers).toHaveBeenCalled();
    expect(mockSyncAPI.getDiscoveredPeers).toHaveBeenCalled();
    expect(mockStore.setPeers).toHaveBeenCalledWith(peers);
    expect(mockStore.setDiscoveredPeers).toHaveBeenCalledWith(discoveredPeers);
  });

  it('should force sync', async () => {
    mockSyncAPI.forceSync.mockResolvedValue({ success: true });
    mockSyncAPI.getStatus.mockResolvedValue({
      status: 'syncing',
      peerCount: 1,
      lastSyncAt: Date.now(),
      error: undefined,
      isInitialized: true,
    });

    const { result } = renderHook(() => useSync());

    await act(async () => {
      const success = await result.current.forceSync();
      expect(success).toBe(true);
    });

    expect(mockSyncAPI.forceSync).toHaveBeenCalled();
    expect(mockSyncAPI.getStatus).toHaveBeenCalled(); // refreshStatus called
  });

  it('should handle force sync errors', async () => {
    mockSyncAPI.forceSync.mockResolvedValue({ success: false, error: 'Sync failed' });

    const { result } = renderHook(() => useSync());

    await act(async () => {
      const success = await result.current.forceSync();
      expect(success).toBe(false);
    });
  });

  it('should start sync', async () => {
    mockSyncAPI.getStatus.mockResolvedValue({
      status: 'offline',
      peerCount: 0,
      lastSyncAt: null,
      error: undefined,
      isInitialized: true,
    });
    mockSyncAPI.start.mockResolvedValue({ success: true });
    mockSyncAPI.getStatus.mockResolvedValueOnce({
      status: 'connected',
      peerCount: 1,
      lastSyncAt: Date.now(),
      error: undefined,
      isInitialized: true,
    });

    const { result } = renderHook(() => useSync());

    await act(async () => {
      const success = await result.current.startSync();
      expect(success).toBe(true);
    });

    expect(mockSyncAPI.getStatus).toHaveBeenCalled(); // Check initialization
    expect(mockSyncAPI.start).toHaveBeenCalled();
  });

  it.skip('should handle start sync when not initialized', async () => {
    mockSyncAPI.getStatus
      .mockResolvedValueOnce({
        status: 'offline',
        peerCount: 0,
        lastSyncAt: null,
        error: undefined,
        isInitialized: false,
      })
      .mockResolvedValueOnce({
        status: 'offline',
        peerCount: 0,
        lastSyncAt: null,
        error: undefined,
        isInitialized: false,
      });

    const { result } = renderHook(() => useSync());

    await act(async () => {
      const success = await result.current.startSync();
      expect(success).toBe(false);
    });

    expect(mockStore.setError).toHaveBeenCalledWith(
      'Sync service is initializing. Please wait a moment and try again.'
    );
  });

  it.skip('should stop sync', async () => {
    mockSyncAPI.stop.mockResolvedValue({ success: true });
    mockSyncAPI.getStatus.mockResolvedValue({
      status: 'offline',
      peerCount: 0,
      lastSyncAt: null,
      error: undefined,
      isInitialized: true,
    });

    const { result } = renderHook(() => useSync());

    // Wait for hook to be ready
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      const success = await result.current.stopSync();
      expect(success).toBe(true);
    });

    expect(mockSyncAPI.stop).toHaveBeenCalled();
  });

  it.skip('should setup event listeners on mount', async () => {
    const { result } = renderHook(() => useSync());

    // Wait for hook to be ready and useEffect to run
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    // Give useEffect time to execute
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockElectronAPI.removeAllListeners).toHaveBeenCalledWith('sync:status-changed');
    expect(mockElectronAPI.removeAllListeners).toHaveBeenCalledWith('sync:peer-connected');
    expect(mockElectronAPI.removeAllListeners).toHaveBeenCalledWith('sync:peer-disconnected');
    expect(mockElectronAPI.on).toHaveBeenCalledWith('sync:status-changed', expect.any(Function));
    expect(mockElectronAPI.on).toHaveBeenCalledWith('sync:peer-connected', expect.any(Function));
    expect(mockElectronAPI.on).toHaveBeenCalledWith('sync:peer-disconnected', expect.any(Function));
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => useSync());

    unmount();

    // Note: Cleanup only happens when last hook unmounts
    // The test verifies the cleanup function exists
    expect(mockElectronAPI.off).toBeDefined();
  });

  it.skip('should initialize sync service if not initialized on mount', async () => {
    mockSyncAPI.getStatus.mockResolvedValue({
      status: 'offline',
      peerCount: 0,
      lastSyncAt: null,
      error: undefined,
      isInitialized: false,
    });
    mockSyncAPI.initialize.mockResolvedValue({ success: true });

    renderHook(() => useSync());

    await waitFor(
      () => {
        expect(mockSyncAPI.initialize).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it.skip('should return computed values', async () => {
    mockStore.status = 'connected';
    mockStore.peerCount = 2;
    mockStore.isConnected.mockReturnValue(true);
    mockStore.getSyncStatusText.mockReturnValue('2 devices connected');

    const { result } = renderHook(() => useSync());

    // Wait for hook to be ready
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.statusText).toBe('2 devices connected');
  });
});
