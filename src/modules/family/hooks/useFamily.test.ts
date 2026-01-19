import { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { trackModuleAction } from '@/hooks/useAnalytics';
import { getFamilyAPI } from '@/shared/utils/electronAPI';

import { useFamily } from './useFamily';
import { useFamilyStore } from '../stores/family.store';

import type { DeviceInfo, FamilyInfo, InvitationInfo, PermissionInfo } from '../types/Family.types';

// Mock dependencies
vi.mock('@/shared/utils/electronAPI', () => ({
  getFamilyAPI: vi.fn(),
}));

vi.mock('../stores/family.store', () => ({
  useFamilyStore: vi.fn(),
}));

vi.mock('@/hooks/useAnalytics', () => ({
  trackModuleAction: vi.fn(),
}));

describe('useFamily', () => {
  const mockGetFamilyAPI = getFamilyAPI as ReturnType<typeof vi.fn>;
  const mockUseFamilyStore = useFamilyStore as unknown as ReturnType<typeof vi.fn>;
  const mockFamilyAPI = {
    get: vi.fn(),
    create: vi.fn(),
    invite: vi.fn(),
    join: vi.fn(),
    removeDevice: vi.fn(),
    setPermission: vi.fn(),
  };

  interface MockFamilyStore {
    family: FamilyInfo | null;
    devices: DeviceInfo[];
    permissions: PermissionInfo[];
    isLoading: boolean;
    isCreating: boolean;
    isInviting: boolean;
    isJoining: boolean;
    error: string | null;
    pendingInvite: InvitationInfo | null;
    setFamily: ReturnType<typeof vi.fn>;
    setDevices: ReturnType<typeof vi.fn>;
    setPermissions: ReturnType<typeof vi.fn>;
    setCurrentDeviceId: ReturnType<typeof vi.fn>;
    setLoading: ReturnType<typeof vi.fn>;
    setCreating: ReturnType<typeof vi.fn>;
    setInviting: ReturnType<typeof vi.fn>;
    setJoining: ReturnType<typeof vi.fn>;
    setError: ReturnType<typeof vi.fn>;
    setPendingInvite: ReturnType<typeof vi.fn>;
    hasFamily: ReturnType<typeof vi.fn>;
    isAdmin: ReturnType<typeof vi.fn>;
    getCurrentDevice: ReturnType<typeof vi.fn>;
  }

  const mockStore: MockFamilyStore = {
    family: null,
    devices: [],
    permissions: [],
    isLoading: false,
    isCreating: false,
    isInviting: false,
    isJoining: false,
    error: null,
    pendingInvite: null,
    setFamily: vi.fn(),
    setDevices: vi.fn(),
    setPermissions: vi.fn(),
    setCurrentDeviceId: vi.fn(),
    setLoading: vi.fn(),
    setCreating: vi.fn(),
    setInviting: vi.fn(),
    setJoining: vi.fn(),
    setError: vi.fn(),
    setPendingInvite: vi.fn(),
    hasFamily: vi.fn(() => false),
    isAdmin: vi.fn(() => false),
    getCurrentDevice: vi.fn(() => undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFamilyAPI.mockReturnValue(mockFamilyAPI);
    mockUseFamilyStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useFamily());

    expect(result.current.family).toBeNull();
    expect(result.current.devices).toEqual([]);
    expect(result.current.permissions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load family on mount', async () => {
    const mockFamilyData = {
      family: {
        id: 'family-1',
        name: 'Test Family',
        adminDeviceId: 'device-1',
      },
      devices: [{ id: 'device-1', name: 'Device 1', isCurrent: true }],
      permissions: [{ memberId: 'device-1', role: 'admin' as const, createdAt: Date.now() }],
    };

    mockFamilyAPI.get.mockResolvedValue(mockFamilyData);

    renderHook(() => useFamily());

    await waitFor(() => {
      expect(mockFamilyAPI.get).toHaveBeenCalled();
      expect(mockStore.setFamily).toHaveBeenCalled();
      expect(mockStore.setDevices).toHaveBeenCalled();
    });
  });

  it('should load family data', async () => {
    const mockFamilyData = {
      family: {
        id: 'family-1',
        name: 'Test Family',
        adminDeviceId: 'device-1',
      },
      devices: [{ id: 'device-1', name: 'Device 1', isCurrent: true }],
      permissions: [{ memberId: 'device-1', role: 'admin' as const, createdAt: Date.now() }],
    };

    mockFamilyAPI.get.mockResolvedValue(mockFamilyData);

    const { result } = renderHook(() => useFamily());

    await act(async () => {
      await result.current.loadFamily();
    });

    expect(mockStore.setLoading).toHaveBeenCalledWith(true);
    expect(mockStore.setFamily).toHaveBeenCalled();
    expect(mockStore.setDevices).toHaveBeenCalled();
    expect(mockStore.setLoading).toHaveBeenCalledWith(false);
  });

  it('should handle load family errors', async () => {
    mockFamilyAPI.get.mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useFamily());

    await act(async () => {
      await result.current.loadFamily();
    });

    expect(mockStore.setError).toHaveBeenCalledWith('Failed to load');
    expect(mockStore.setLoading).toHaveBeenCalledWith(false);
  });

  it('should create family', async () => {
    const mockFamilyData = {
      family: {
        id: 'family-1',
        name: 'New Family',
        adminDeviceId: 'device-1',
      },
      devices: [{ id: 'device-1', name: 'Device 1', isCurrent: true }],
      permissions: [{ memberId: 'device-1', role: 'admin' as const, createdAt: Date.now() }],
    };

    mockFamilyAPI.create.mockResolvedValue(mockFamilyData);

    const { result } = renderHook(() => useFamily());

    await act(async () => {
      await result.current.createFamily('New Family');
    });

    expect(mockFamilyAPI.create).toHaveBeenCalledWith('New Family');
    expect(mockStore.setCreating).toHaveBeenCalledWith(true);
    expect(mockStore.setFamily).toHaveBeenCalled();
    expect(trackModuleAction).toHaveBeenCalledWith('family', 'family_created');
    expect(mockStore.setCreating).toHaveBeenCalledWith(false);
  });

  it('should not create family with empty name', async () => {
    const { result } = renderHook(() => useFamily());

    await act(async () => {
      await result.current.createFamily('');
    });

    expect(mockFamilyAPI.create).not.toHaveBeenCalled();
    expect(mockStore.setError).toHaveBeenCalledWith('Family name is required');
  });

  it('should trim family name when creating', async () => {
    mockFamilyAPI.create.mockResolvedValue({
      family: { id: 'family-1', name: 'Test Family', adminDeviceId: 'device-1' },
      devices: [],
      permissions: [],
    });

    const { result } = renderHook(() => useFamily());

    await act(async () => {
      await result.current.createFamily('  Test Family  ');
    });

    expect(mockFamilyAPI.create).toHaveBeenCalledWith('Test Family');
  });

  it('should generate invite', async () => {
    const inviteResult = {
      token: 'invite-token-123',
      role: 'member' as const,
    };

    mockFamilyAPI.invite.mockResolvedValue(inviteResult);

    const { result } = renderHook(() => useFamily());

    await act(async () => {
      await result.current.generateInvite('member');
    });

    expect(mockFamilyAPI.invite).toHaveBeenCalledWith('member');
    expect(mockStore.setInviting).toHaveBeenCalledWith(true);
    expect(mockStore.setPendingInvite).toHaveBeenCalledWith(inviteResult);
    expect(mockStore.setInviting).toHaveBeenCalledWith(false);
  });

  it('should join family', async () => {
    mockFamilyAPI.join.mockResolvedValue({ success: true });
    mockFamilyAPI.get.mockResolvedValue({
      family: { id: 'family-1', name: 'Test Family', adminDeviceId: 'device-1' },
      devices: [],
      permissions: [],
    });

    const { result } = renderHook(() => useFamily());

    await act(async () => {
      const success = await result.current.joinFamily('invite-token');
      expect(success).toBe(true);
    });

    expect(mockFamilyAPI.join).toHaveBeenCalledWith('invite-token');
    expect(mockStore.setJoining).toHaveBeenCalledWith(true);
    expect(trackModuleAction).toHaveBeenCalledWith('family', 'family_joined');
    expect(mockStore.setJoining).toHaveBeenCalledWith(false);
  });

  it('should not join family with empty token', async () => {
    const { result } = renderHook(() => useFamily());

    await act(async () => {
      const success = await result.current.joinFamily('');
      expect(success).toBe(false);
    });

    expect(mockFamilyAPI.join).not.toHaveBeenCalled();
    expect(mockStore.setError).toHaveBeenCalledWith('Invite token is required');
  });

  it('should remove device', async () => {
    const updatedDevices = [{ id: 'device-2', name: 'Device 2', isCurrent: false }];

    mockFamilyAPI.removeDevice.mockResolvedValue(updatedDevices);

    const { result } = renderHook(() => useFamily());

    await act(async () => {
      await result.current.removeDevice('device-1');
    });

    expect(mockFamilyAPI.removeDevice).toHaveBeenCalledWith('device-1');
    expect(mockStore.setDevices).toHaveBeenCalledWith(updatedDevices);
    expect(trackModuleAction).toHaveBeenCalledWith('family', 'device_removed');
  });

  it('should set permission', async () => {
    mockFamilyAPI.setPermission.mockResolvedValue(undefined);
    mockFamilyAPI.get.mockResolvedValue({
      family: { id: 'family-1', name: 'Test Family', adminDeviceId: 'device-1' },
      devices: [],
      permissions: [{ memberId: 'device-1', role: 'admin' as const, createdAt: Date.now() }],
    });

    const { result } = renderHook(() => useFamily());

    await act(async () => {
      await result.current.setPermission('device-1', 'admin');
    });

    expect(mockFamilyAPI.setPermission).toHaveBeenCalledWith('device-1', 'admin');
    expect(mockFamilyAPI.get).toHaveBeenCalled(); // Reloads permissions
  });

  it('should clear invite', () => {
    const { result } = renderHook(() => useFamily());

    act(() => {
      result.current.clearInvite();
    });

    expect(mockStore.setPendingInvite).toHaveBeenCalledWith(null);
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useFamily());

    act(() => {
      result.current.clearError();
    });

    expect(mockStore.setError).toHaveBeenCalledWith(null);
  });

  it('should return computed values', () => {
    mockStore.hasFamily.mockReturnValue(true);
    mockStore.isAdmin.mockReturnValue(true);
    mockStore.getCurrentDevice.mockReturnValue({
      id: 'device-1',
      name: 'Device 1',
      addedAt: Date.now(),
      lastSeen: Date.now(),
      isCurrent: true,
    });

    const { result } = renderHook(() => useFamily());

    expect(result.current.hasFamily).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.currentDevice).toBeDefined();
  });
});
