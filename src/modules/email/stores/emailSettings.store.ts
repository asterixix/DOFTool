/**
 * Email Settings Store - Zustand state management for email settings
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type {
  EmailSettings,
  EmailAccountSettings,
  TestConnectionResult,
} from '../types/EmailSettings.types';

interface EmailSettingsStore {
  // ============================================================================
  // State
  // ============================================================================
  settings: EmailSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  isTestingConnection: boolean;
  testResult: TestConnectionResult | null;
  error: string | null;
  selectedAccountId: string | null;
  isDialogOpen: boolean;
  editingAccount: EmailAccountSettings | null;

  // ============================================================================
  // Actions
  // ============================================================================
  setSettings: (settings: EmailSettings | null) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setTestingConnection: (testing: boolean) => void;
  setTestResult: (result: TestConnectionResult | null) => void;
  setError: (error: string | null) => void;
  setSelectedAccountId: (accountId: string | null) => void;
  openDialog: (account?: EmailAccountSettings | null) => void;
  closeDialog: () => void;

  // ============================================================================
  // Computed Helpers
  // ============================================================================
  getAccountById: (id: string) => EmailAccountSettings | undefined;
  getSelectedAccount: () => EmailAccountSettings | undefined;

  // ============================================================================
  // Reset
  // ============================================================================
  reset: () => void;
}

const initialState = {
  settings: null,
  isLoading: false,
  isSaving: false,
  isTestingConnection: false,
  testResult: null,
  error: null,
  selectedAccountId: null,
  isDialogOpen: false,
  editingAccount: null,
};

export const useEmailSettingsStore = create<EmailSettingsStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ============================================================================
    // Action Implementations
    // ============================================================================
    setSettings: (settings) => set({ settings }),
    setLoading: (isLoading) => set({ isLoading }),
    setSaving: (isSaving) => set({ isSaving }),
    setTestingConnection: (isTestingConnection) => set({ isTestingConnection }),
    setTestResult: (testResult) => set({ testResult }),
    setError: (error) => set({ error }),
    setSelectedAccountId: (selectedAccountId) => set({ selectedAccountId }),
    openDialog: (editingAccount = null) => set({ isDialogOpen: true, editingAccount }),
    closeDialog: () => set({ isDialogOpen: false, editingAccount: null }),

    // ============================================================================
    // Computed Helper Implementations
    // ============================================================================
    getAccountById: (id) => {
      const { settings } = get();
      return settings?.accounts.find((account) => account.id === id);
    },
    getSelectedAccount: () => {
      const { settings, selectedAccountId } = get();
      if (!settings || !selectedAccountId) {
        return undefined;
      }
      return settings.accounts.find((account) => account.id === selectedAccountId);
    },

    // ============================================================================
    // Reset
    // ============================================================================
    reset: () => set(initialState),
  }))
);

// ============================================================================
// Selector Hooks for Optimized Re-renders
// ============================================================================

export const selectEmailSettings = (state: EmailSettingsStore): EmailSettings | null =>
  state.settings;
export const selectIsLoadingEmailSettings = (state: EmailSettingsStore): boolean => state.isLoading;
export const selectIsSavingEmailSettings = (state: EmailSettingsStore): boolean => state.isSaving;
export const selectEmailSettingsError = (state: EmailSettingsStore): string | null => state.error;
