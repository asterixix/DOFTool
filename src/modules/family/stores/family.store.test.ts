import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useFamilyStore } from './family.store';

import type { FamilyInfo, DeviceInfo, PermissionInfo } from '../types/Family.types';

describe('family.store', () => {
  beforeEach(() => {
    const { reset } = useFamilyStore.getState();
    act(() => {
      reset();
    });
  });

  describe('initial state', () => {
    it('should have null family initially', () => {
      const state = useFamilyStore.getState();
      expect(state.family).toBeNull();
    });

    it('should have empty devices array initially', () => {
      const state = useFamilyStore.getState();
      expect(state.devices).toEqual([]);
    });

    it('should have empty permissions array initially', () => {
      const state = useFamilyStore.getState();
      expect(state.permissions).toEqual([]);
    });

    it('should have false loading states initially', () => {
      const state = useFamilyStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isCreating).toBe(false);
      expect(state.isInviting).toBe(false);
      expect(state.isJoining).toBe(false);
    });

    it('should have null error initially', () => {
      const state = useFamilyStore.getState();
      expect(state.error).toBeNull();
    });

    it('should have null pendingInvite initially', () => {
      const state = useFamilyStore.getState();
      expect(state.pendingInvite).toBeNull();
    });
  });

  describe('setters', () => {
    it('should set family', () => {
      const family: FamilyInfo = {
        id: 'family-1',
        name: 'Test Family',
        adminDeviceId: 'device-1',
        createdAt: Date.now(),
      };

      const { setFamily } = useFamilyStore.getState();
      act(() => {
        setFamily(family);
      });

      expect(useFamilyStore.getState().family).toEqual(family);
    });

    it('should set devices', () => {
      const devices: DeviceInfo[] = [
        {
          id: 'device-1',
          name: 'Device 1',
          addedAt: Date.now(),
          lastSeen: Date.now(),
          isCurrent: true,
        },
        {
          id: 'device-2',
          name: 'Device 2',
          addedAt: Date.now(),
          lastSeen: Date.now(),
          isCurrent: false,
        },
      ];

      const { setDevices } = useFamilyStore.getState();
      act(() => {
        setDevices(devices);
      });

      expect(useFamilyStore.getState().devices).toEqual(devices);
    });

    it('should set permissions', () => {
      const permissions: PermissionInfo[] = [
        { memberId: 'device-1', role: 'admin', createdAt: Date.now() },
        { memberId: 'device-2', role: 'member', createdAt: Date.now() },
      ];

      const { setPermissions } = useFamilyStore.getState();
      act(() => {
        setPermissions(permissions);
      });

      expect(useFamilyStore.getState().permissions).toEqual(permissions);
    });

    it('should set current device ID', () => {
      const { setCurrentDeviceId } = useFamilyStore.getState();
      act(() => {
        setCurrentDeviceId('device-1');
      });

      expect(useFamilyStore.getState().currentDeviceId).toBe('device-1');
    });

    it('should set loading states', () => {
      const { setLoading, setCreating, setInviting, setJoining } = useFamilyStore.getState();
      act(() => {
        setLoading(true);
        setCreating(true);
        setInviting(true);
        setJoining(true);
      });

      const state = useFamilyStore.getState();
      expect(state.isLoading).toBe(true);
      expect(state.isCreating).toBe(true);
      expect(state.isInviting).toBe(true);
      expect(state.isJoining).toBe(true);
    });

    it('should set error', () => {
      const { setError } = useFamilyStore.getState();
      act(() => {
        setError('Test error');
      });

      expect(useFamilyStore.getState().error).toBe('Test error');
    });

    it('should clear error', () => {
      const { setError } = useFamilyStore.getState();
      act(() => {
        setError('Test error');
        setError(null);
      });

      expect(useFamilyStore.getState().error).toBeNull();
    });

    it('should set pending invite', () => {
      const invite = { token: 'invite-token', role: 'member' as const };
      const { setPendingInvite } = useFamilyStore.getState();
      act(() => {
        setPendingInvite(invite);
      });

      expect(useFamilyStore.getState().pendingInvite).toEqual(invite);
    });
  });

  describe('computed helpers', () => {
    it('should return false for hasFamily when family is null', () => {
      const { hasFamily } = useFamilyStore.getState();
      expect(hasFamily()).toBe(false);
    });

    it('should return true for hasFamily when family exists', () => {
      const family: FamilyInfo = {
        id: 'family-1',
        name: 'Test Family',
        adminDeviceId: 'device-1',
        createdAt: Date.now(),
      };

      const { setFamily, hasFamily } = useFamilyStore.getState();
      act(() => {
        setFamily(family);
      });

      expect(hasFamily()).toBe(true);
    });

    it('should return false for isAdmin when no family', () => {
      const { isAdmin } = useFamilyStore.getState();
      expect(isAdmin()).toBe(false);
    });

    it('should return true for isAdmin when current device is admin device', () => {
      const family: FamilyInfo = {
        id: 'family-1',
        name: 'Test Family',
        adminDeviceId: 'device-1',
        createdAt: Date.now(),
      };

      const { setFamily, setCurrentDeviceId, isAdmin } = useFamilyStore.getState();
      act(() => {
        setFamily(family);
        setCurrentDeviceId('device-1');
      });

      expect(isAdmin()).toBe(true);
    });

    it('should return true for isAdmin when device has admin permission', () => {
      const family: FamilyInfo = {
        id: 'family-1',
        name: 'Test Family',
        adminDeviceId: 'device-1',
        createdAt: Date.now(),
      };

      const permissions: PermissionInfo[] = [
        { memberId: 'device-2', role: 'admin', createdAt: Date.now() },
      ];

      const { setFamily, setCurrentDeviceId, setPermissions, isAdmin } = useFamilyStore.getState();
      act(() => {
        setFamily(family);
        setCurrentDeviceId('device-2');
        setPermissions(permissions);
      });

      expect(isAdmin()).toBe(true);
    });

    it('should return current device', () => {
      const devices: DeviceInfo[] = [
        {
          id: 'device-1',
          name: 'Device 1',
          addedAt: Date.now(),
          lastSeen: Date.now(),
          isCurrent: true,
        },
        {
          id: 'device-2',
          name: 'Device 2',
          addedAt: Date.now(),
          lastSeen: Date.now(),
          isCurrent: false,
        },
      ];

      const { setDevices, setCurrentDeviceId, getCurrentDevice } = useFamilyStore.getState();
      act(() => {
        setDevices(devices);
        setCurrentDeviceId('device-1');
      });

      const currentDevice = getCurrentDevice();
      expect(currentDevice).toEqual(devices[0]);
    });

    it('should return undefined when current device not found', () => {
      const devices: DeviceInfo[] = [
        {
          id: 'device-2',
          name: 'Device 2',
          addedAt: Date.now(),
          lastSeen: Date.now(),
          isCurrent: false,
        },
      ];

      const { setDevices, setCurrentDeviceId, getCurrentDevice } = useFamilyStore.getState();
      act(() => {
        setDevices(devices);
        setCurrentDeviceId('device-1');
      });

      const currentDevice = getCurrentDevice();
      expect(currentDevice).toBeUndefined();
    });

    it('should get device permission', () => {
      const permissions: PermissionInfo[] = [
        { memberId: 'device-1', role: 'admin', createdAt: Date.now() },
        { memberId: 'device-2', role: 'member', createdAt: Date.now() },
      ];

      const { setPermissions, getDevicePermission } = useFamilyStore.getState();
      act(() => {
        setPermissions(permissions);
      });

      const permission = getDevicePermission('device-1');
      expect(permission).toEqual(permissions[0]);
    });

    it('should return undefined for device permission when not found', () => {
      const permissions: PermissionInfo[] = [
        { memberId: 'device-1', role: 'admin', createdAt: Date.now() },
      ];

      const { setPermissions, getDevicePermission } = useFamilyStore.getState();
      act(() => {
        setPermissions(permissions);
      });

      const permission = getDevicePermission('device-2');
      expect(permission).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const family: FamilyInfo = {
        id: 'family-1',
        name: 'Test Family',
        adminDeviceId: 'device-1',
        createdAt: Date.now(),
      };

      const { setFamily, setDevices, setPermissions, setError, reset } = useFamilyStore.getState();
      act(() => {
        setFamily(family);
        setDevices([
          {
            id: 'device-1',
            name: 'Device 1',
            addedAt: Date.now(),
            lastSeen: Date.now(),
            isCurrent: true,
          },
        ]);
        setPermissions([{ memberId: 'device-1', role: 'admin', createdAt: Date.now() }]);
        setError('Error');
      });

      act(() => {
        reset();
      });

      const state = useFamilyStore.getState();
      expect(state.family).toBeNull();
      expect(state.devices).toEqual([]);
      expect(state.permissions).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });
});
