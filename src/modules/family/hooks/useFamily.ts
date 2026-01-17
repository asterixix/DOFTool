/**
 * useFamily Hook - Main hook for family operations
 */

/* eslint-disable @typescript-eslint/no-base-to-string -- API response mapping with fallbacks */

import { useCallback, useEffect, useRef } from 'react';

import { trackModuleAction } from '@/hooks/useAnalytics';
import { getFamilyAPI } from '@/shared/utils/electronAPI';

import { useFamilyStore } from '../stores/family.store';

import type {
  PermissionRole,
  FamilyState,
  PermissionInfo,
  DeviceInfo,
} from '../types/Family.types';

interface UseFamilyReturn {
  // State
  family: FamilyState['family'];
  devices: DeviceInfo[];
  permissions: PermissionInfo[];
  isLoading: boolean;
  isCreating: boolean;
  isInviting: boolean;
  isJoining: boolean;
  error: string | null;
  pendingInvite: { token: string; role: PermissionRole } | null;

  // Computed
  hasFamily: boolean;
  isAdmin: boolean;
  currentDevice: DeviceInfo | undefined;

  // Actions
  loadFamily: () => Promise<void>;
  createFamily: (name: string) => Promise<void>;
  generateInvite: (role: PermissionRole) => Promise<void>;
  joinFamily: (token: string) => Promise<boolean>;
  removeDevice: (deviceId: string) => Promise<void>;
  setPermission: (memberId: string, role: PermissionRole) => Promise<void>;
  clearInvite: () => void;
  clearError: () => void;
}

export function useFamily(): UseFamilyReturn {
  // Get individual state slices to avoid unnecessary re-renders
  const family = useFamilyStore((state) => state.family);
  const devices = useFamilyStore((state) => state.devices);
  const permissions = useFamilyStore((state) => state.permissions);
  const isLoading = useFamilyStore((state) => state.isLoading);
  const isCreating = useFamilyStore((state) => state.isCreating);
  const isInviting = useFamilyStore((state) => state.isInviting);
  const isJoining = useFamilyStore((state) => state.isJoining);
  const error = useFamilyStore((state) => state.error);
  const pendingInvite = useFamilyStore((state) => state.pendingInvite);

  // Get actions (these are stable references)
  const setFamily = useFamilyStore((state) => state.setFamily);
  const setDevices = useFamilyStore((state) => state.setDevices);
  const setPermissions = useFamilyStore((state) => state.setPermissions);
  const setCurrentDeviceId = useFamilyStore((state) => state.setCurrentDeviceId);
  const setLoading = useFamilyStore((state) => state.setLoading);
  const setCreating = useFamilyStore((state) => state.setCreating);
  const setInviting = useFamilyStore((state) => state.setInviting);
  const setJoining = useFamilyStore((state) => state.setJoining);
  const setError = useFamilyStore((state) => state.setError);
  const setPendingInvite = useFamilyStore((state) => state.setPendingInvite);
  const hasFamily = useFamilyStore((state) => state.hasFamily);
  const isAdmin = useFamilyStore((state) => state.isAdmin);
  const getCurrentDevice = useFamilyStore((state) => state.getCurrentDevice);

  // Track if initial load has happened
  const hasLoadedRef = useRef(false);

  const loadFamily = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const familyAPI = getFamilyAPI();
      const result = await familyAPI.get();

      const r = result as Record<string, unknown>;
      setFamily(r['family'] as FamilyState['family']);
      setDevices(r['devices'] as DeviceInfo[]);
      setPermissions(
        (r['permissions'] as unknown[]).map((p: unknown) => {
          const perm = p as Record<string, unknown>;
          return {
            memberId: String(perm['memberId'] ?? ''),
            role: perm['role'] as PermissionRole,
            createdAt: Number(perm['createdAt'] ?? 0),
          };
        })
      );

      // Set current device ID
      const devices = r['devices'] as DeviceInfo[];
      const currentDevice = devices.find((d: DeviceInfo) => d.isCurrent);
      if (currentDevice) {
        setCurrentDeviceId(currentDevice.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load family';
      setError(message);
      console.error('Failed to load family:', err);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setFamily, setDevices, setPermissions, setCurrentDeviceId]);

  const createFamily = useCallback(
    async (name: string) => {
      if (!name.trim()) {
        setError('Family name is required');
        return;
      }

      try {
        setCreating(true);
        setError(null);

        const familyAPI = getFamilyAPI();
        const result = await familyAPI.create(name.trim());
        const r = result as Record<string, unknown>;
        setFamily(r['family'] as FamilyState['family']);
        setDevices(r['devices'] as DeviceInfo[]);
        setPermissions(
          (r['permissions'] as unknown[]).map((p: unknown) => {
            const perm = p as Record<string, unknown>;
            return {
              memberId: String(perm['memberId'] ?? ''),
              role: perm['role'] as PermissionRole,
              createdAt: Number(perm['createdAt'] ?? 0),
            };
          })
        );

        const currentDevice = (r['devices'] as DeviceInfo[]).find((d: DeviceInfo) => d.isCurrent);
        if (currentDevice) {
          setCurrentDeviceId(currentDevice.id);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        trackModuleAction('family', 'family_created');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create family';
        setError(message);
        console.error('Failed to create family:', err);
      } finally {
        setCreating(false);
      }
    },
    [setCreating, setError, setFamily, setDevices, setPermissions, setCurrentDeviceId]
  );

  const generateInvite = useCallback(
    async (role: PermissionRole) => {
      try {
        setInviting(true);
        setError(null);

        const familyAPI = getFamilyAPI();
        const result = await familyAPI.invite(role);
        setPendingInvite({
          token: result.token,
          role: result.role as PermissionRole,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate invite';
        setError(message);
        console.error('Failed to generate invite:', err);
      } finally {
        setInviting(false);
      }
    },
    [setInviting, setError, setPendingInvite]
  );

  const joinFamily = useCallback(
    async (token: string): Promise<boolean> => {
      if (!token.trim()) {
        setError('Invite token is required');
        return false;
      }

      try {
        setJoining(true);
        setError(null);

        const familyAPI = getFamilyAPI();
        const result = await familyAPI.join(token.trim());

        if (result.success) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          trackModuleAction('family', 'family_joined');
          // Reload family data after joining
          await loadFamily();
          return true;
        } else {
          setError('Failed to join family - invalid or expired token');
          return false;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to join family';
        setError(message);
        console.error('Failed to join family:', err);
        return false;
      } finally {
        setJoining(false);
      }
    },
    [setJoining, setError, loadFamily]
  );

  const removeDevice = useCallback(
    async (deviceId: string) => {
      try {
        setError(null);
        const familyAPI = getFamilyAPI();
        const newDevices = await familyAPI.removeDevice(deviceId);
        setDevices(newDevices as DeviceInfo[]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        trackModuleAction('family', 'device_removed');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove device';
        setError(message);
        console.error('Failed to remove device:', err);
      }
    },
    [setError, setDevices]
  );

  const setPermission = useCallback(
    async (memberId: string, role: PermissionRole) => {
      try {
        setError(null);
        const familyAPI = getFamilyAPI();
        await familyAPI.setPermission(memberId, role);

        // Reload to get updated permissions
        const familyData = await familyAPI.get();
        const fd = familyData as Record<string, unknown>;
        setPermissions(
          (fd['permissions'] as unknown[]).map((p: unknown) => {
            const perm = p as Record<string, unknown>;
            return {
              memberId: String(perm['memberId'] ?? ''),
              role: perm['role'] as PermissionRole,
              createdAt: Number(perm['createdAt'] ?? 0),
            };
          })
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set permission';
        setError(message);
        console.error('Failed to set permission:', err);
      }
    },
    [setError, setPermissions]
  );

  const clearInvite = useCallback(() => {
    setPendingInvite(null);
  }, [setPendingInvite]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Load family on mount (only once)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      void loadFamily();
    }
  }, [loadFamily]);

  return {
    // State
    family,
    devices,
    permissions,
    isLoading,
    isCreating,
    isInviting,
    isJoining,
    error,
    pendingInvite,

    // Computed
    hasFamily: hasFamily(),
    isAdmin: isAdmin(),
    currentDevice: getCurrentDevice(),

    // Actions
    loadFamily,
    createFamily,
    generateInvite,
    joinFamily,
    removeDevice,
    setPermission,
    clearInvite,
    clearError,
  };
}
