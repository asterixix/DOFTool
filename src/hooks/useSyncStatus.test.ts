import { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useSync } from '@/modules/sync';

import { useSyncStatus } from './useSyncStatus';

// Mock useSync hook
vi.mock('@/modules/sync', () => ({
  useSync: vi.fn(),
}));

describe('useSyncStatus', () => {
  const mockUseSync = useSync as ReturnType<typeof vi.fn>;
  const mockRefreshStatus = vi.fn();
  const mockRefreshPeers = vi.fn();
  const mockForceSync = vi.fn();
  const mockStartSync = vi.fn();
  const mockStopSync = vi.fn();

  const defaultSyncResult = {
    status: 'connected' as const,
    peers: [
      { id: 'peer-1', name: 'Peer 1', status: 'connected' as const },
      { id: 'peer-2', name: 'Peer 2', status: 'disconnected' as const },
    ],
    discoveredPeers: [{ id: 'peer-3', name: 'Peer 3', address: '192.168.1.1' }],
    peerCount: 2,
    lastSyncAt: Date.now(),
    error: null,
    isConnected: true,
    statusText: 'Connected',
    isInitialized: true,
    refreshStatus: mockRefreshStatus,
    refreshPeers: mockRefreshPeers,
    forceSync: mockForceSync,
    startSync: mockStartSync,
    stopSync: mockStopSync,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseSync.mockReturnValue(defaultSyncResult);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return sync status from useSync', () => {
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.status).toBe('connected');
    expect(result.current.peers).toEqual(defaultSyncResult.peers);
    expect(result.current.discoveredPeers).toEqual(defaultSyncResult.discoveredPeers);
    expect(result.current.error).toBeNull();
    expect(result.current.isConnected).toBe(true);
  });

  it('should calculate connected peer count', () => {
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.connectedPeerCount).toBe(1); // Only peer-1 is connected
    expect(result.current.totalPeerCount).toBe(2);
    expect(result.current.discoveredPeerCount).toBe(1);
  });

  it('should calculate status flags', () => {
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.isDiscovering).toBe(false);
    expect(result.current.isOffline).toBe(false);
  });

  it('should set isConnecting when status is connecting', () => {
    mockUseSync.mockReturnValue({
      ...defaultSyncResult,
      status: 'connecting' as const,
    });

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.isConnecting).toBe(true);
  });

  it('should set isSyncing when status is syncing', () => {
    mockUseSync.mockReturnValue({
      ...defaultSyncResult,
      status: 'syncing' as const,
    });

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.isSyncing).toBe(true);
  });

  it('should set isDiscovering when status is discovering', () => {
    mockUseSync.mockReturnValue({
      ...defaultSyncResult,
      status: 'discovering' as const,
    });

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.isDiscovering).toBe(true);
  });

  it('should set isOffline when status is offline', () => {
    mockUseSync.mockReturnValue({
      ...defaultSyncResult,
      status: 'offline' as const,
    });

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.isOffline).toBe(true);
  });

  it.skip('should auto-refresh status when familyId is provided', async () => {
    const { result } = renderHook(() => useSyncStatus({ familyId: 'family-1', autoConnect: true }));

    await waitFor(() => {
      expect(mockRefreshStatus).toHaveBeenCalled();
      expect(mockRefreshPeers).toHaveBeenCalled();
    });
  });

  it('should not auto-refresh when autoConnect is false', () => {
    renderHook(() => useSyncStatus({ familyId: 'family-1', autoConnect: false }));

    expect(mockRefreshStatus).not.toHaveBeenCalled();
    expect(mockRefreshPeers).not.toHaveBeenCalled();
  });

  it('should not auto-refresh when familyId is not provided', () => {
    renderHook(() => useSyncStatus({ autoConnect: true }));

    expect(mockRefreshStatus).not.toHaveBeenCalled();
    expect(mockRefreshPeers).not.toHaveBeenCalled();
  });

  it.skip('should refresh status periodically when not offline', async () => {
    renderHook(() => useSyncStatus());

    // Fast-forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(mockRefreshStatus).toHaveBeenCalled();
      expect(mockRefreshPeers).toHaveBeenCalled();
    });
  });

  it('should not refresh periodically when offline', () => {
    mockUseSync.mockReturnValue({
      ...defaultSyncResult,
      status: 'offline' as const,
    });

    renderHook(() => useSyncStatus());

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockRefreshStatus).not.toHaveBeenCalled();
    expect(mockRefreshPeers).not.toHaveBeenCalled();
  });

  it('should provide refreshStatus function', () => {
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      result.current.refreshStatus();
    });

    expect(mockRefreshStatus).toHaveBeenCalled();
  });

  it('should provide refreshPeers function', () => {
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      result.current.refreshPeers();
    });

    expect(mockRefreshPeers).toHaveBeenCalled();
  });

  it('should provide forceSync function', () => {
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      result.current.forceSync();
    });

    expect(mockForceSync).toHaveBeenCalled();
  });

  it('should provide startSync function', () => {
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      result.current.startSync();
    });

    expect(mockStartSync).toHaveBeenCalled();
  });

  it('should provide stopSync function', () => {
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      result.current.stopSync();
    });

    expect(mockStopSync).toHaveBeenCalled();
  });

  it('should cleanup interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useSyncStatus());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
