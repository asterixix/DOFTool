/**
 * Family Store - Zustand state management for family module
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { FamilyInfo, DeviceInfo, PermissionInfo, PermissionRole } from '../types/Family.types';

interface FamilyStore {
  // State
  family: FamilyInfo | null;
  devices: DeviceInfo[];
  permissions: PermissionInfo[];
  currentDeviceId: string | null;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isInviting: boolean;
  isJoining: boolean;

  // Error state
  error: string | null;

  // Invite state
  pendingInvite: { token: string; role: PermissionRole } | null;

  // Actions
  setFamily: (family: FamilyInfo | null) => void;
  setDevices: (devices: DeviceInfo[]) => void;
  setPermissions: (permissions: PermissionInfo[]) => void;
  setCurrentDeviceId: (deviceId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setCreating: (creating: boolean) => void;
  setInviting: (inviting: boolean) => void;
  setJoining: (joining: boolean) => void;
  setError: (error: string | null) => void;
  setPendingInvite: (invite: { token: string; role: PermissionRole } | null) => void;

  // Computed helpers
  hasFamily: () => boolean;
  isAdmin: () => boolean;
  getCurrentDevice: () => DeviceInfo | undefined;
  getDevicePermission: (deviceId: string) => PermissionInfo | undefined;

  // Reset
  reset: () => void;
}

const initialState = {
  family: null,
  devices: [],
  permissions: [],
  currentDeviceId: null,
  isLoading: false,
  isCreating: false,
  isInviting: false,
  isJoining: false,
  error: null,
  pendingInvite: null,
};

export const useFamilyStore = create<FamilyStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Setters
    setFamily: (family) => set({ family }),
    setDevices: (devices) => set({ devices }),
    setPermissions: (permissions) => set({ permissions }),
    setCurrentDeviceId: (currentDeviceId) => set({ currentDeviceId }),
    setLoading: (isLoading) => set({ isLoading }),
    setCreating: (isCreating) => set({ isCreating }),
    setInviting: (isInviting) => set({ isInviting }),
    setJoining: (isJoining) => set({ isJoining }),
    setError: (error) => set({ error }),
    setPendingInvite: (pendingInvite) => set({ pendingInvite }),

    // Computed helpers
    hasFamily: () => get().family !== null,

    isAdmin: () => {
      const { family, currentDeviceId, permissions } = get();
      if (!family || !currentDeviceId) {
        return false;
      }

      // Check if current device is the admin device
      if (family.adminDeviceId === currentDeviceId) {
        return true;
      }

      // Check if current device has admin permission
      const permission = permissions.find((p) => p.memberId === currentDeviceId);
      return permission?.role === 'admin';
    },

    getCurrentDevice: () => {
      const { devices } = get();
      return devices.find((d) => d.isCurrent);
    },

    getDevicePermission: (deviceId: string) => {
      const { permissions } = get();
      return permissions.find((p) => p.memberId === deviceId);
    },

    // Reset store to initial state
    reset: () => set(initialState),
  }))
);

// Selector hooks for optimized re-renders
export const selectFamily = (state: FamilyStore): FamilyInfo | null => state.family;
export const selectDevices = (state: FamilyStore): DeviceInfo[] => state.devices;
export const selectPermissions = (state: FamilyStore): PermissionInfo[] => state.permissions;
export const selectIsLoading = (state: FamilyStore): boolean => state.isLoading;
export const selectError = (state: FamilyStore): string | null => state.error;
export const selectPendingInvite = (
  state: FamilyStore
): { token: string; role: PermissionRole } | null => state.pendingInvite;
