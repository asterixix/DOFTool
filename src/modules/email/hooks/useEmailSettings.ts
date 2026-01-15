/**
 * Email Settings Hook - Manages email settings operations
 */

import { useCallback } from 'react';

import { useEmailSettingsStore } from '../stores/emailSettings.store';

import type {
  CreateEmailAccountSettingsInput,
  UpdateEmailAccountSettingsInput,
  TestConnectionInput,
  EmailSettings,
} from '../types/EmailSettings.types';

// Email settings API interface
interface EmailSettingsAPI {
  getSettings: () => Promise<EmailSettings>;
  updateSettings: (settings: Partial<EmailSettings>) => Promise<EmailSettings>;
  createAccount: (input: CreateEmailAccountSettingsInput) => Promise<{ id: string }>;
  updateAccount: (input: UpdateEmailAccountSettingsInput) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  testConnection: (input: TestConnectionInput) => Promise<{
    success: boolean;
    incoming?: { success: boolean; error?: string; latency?: number };
    outgoing?: { success: boolean; error?: string; latency?: number };
  }>;
}

/**
 * Get typed access to email settings API
 */
function getEmailSettingsAPI(): EmailSettingsAPI {
  if (!window.electronAPI?.emailSettings) {
    throw new Error('Email settings API not available');
  }
  return window.electronAPI.emailSettings as EmailSettingsAPI;
}

export function useEmailSettings(): {
  settings: EmailSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  isTestingConnection: boolean;
  testResult: {
    success: boolean;
    incoming?: { success: boolean; error?: string; latency?: number };
    outgoing?: { success: boolean; error?: string; latency?: number };
  } | null;
  error: string | null;
  loadSettings: () => Promise<void>;
  saveSettings: (updates: Partial<EmailSettings>) => Promise<void>;
  createAccount: (input: CreateEmailAccountSettingsInput) => Promise<string>;
  updateAccount: (input: UpdateEmailAccountSettingsInput) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  testConnection: (input: TestConnectionInput) => Promise<void>;
  clearError: () => void;
} {
  const {
    settings,
    isLoading,
    isSaving,
    isTestingConnection,
    testResult,
    error,
    setSettings,
    setLoading,
    setSaving,
    setTestingConnection,
    setTestResult,
    setError,
  } = useEmailSettingsStore();

  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const api = getEmailSettingsAPI();
      const loadedSettings = await api.getSettings();
      setSettings(loadedSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load email settings';
      setError(errorMessage);
      console.error('Failed to load email settings:', err);
    } finally {
      setLoading(false);
    }
  }, [setSettings, setLoading, setError]);

  const saveSettings = useCallback(
    async (updates: Partial<EmailSettings>): Promise<void> => {
      try {
        setSaving(true);
        setError(null);
        const api = getEmailSettingsAPI();
        const updatedSettings = await api.updateSettings(updates);
        setSettings(updatedSettings);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save email settings';
        setError(errorMessage);
        console.error('Failed to save email settings:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [setSettings, setSaving, setError]
  );

  const createAccount = useCallback(
    async (input: CreateEmailAccountSettingsInput): Promise<string> => {
      try {
        setSaving(true);
        setError(null);
        const api = getEmailSettingsAPI();
        const result = await api.createAccount(input);
        await loadSettings(); // Reload settings after creating account
        return result.id;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create email account';
        setError(errorMessage);
        console.error('Failed to create email account:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadSettings]
  );

  const updateAccount = useCallback(
    async (input: UpdateEmailAccountSettingsInput): Promise<void> => {
      try {
        setSaving(true);
        setError(null);
        const api = getEmailSettingsAPI();
        await api.updateAccount(input);
        await loadSettings(); // Reload settings after updating account
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update email account';
        setError(errorMessage);
        console.error('Failed to update email account:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadSettings]
  );

  const deleteAccount = useCallback(
    async (id: string): Promise<void> => {
      try {
        setSaving(true);
        setError(null);
        const api = getEmailSettingsAPI();
        await api.deleteAccount(id);
        await loadSettings(); // Reload settings after deleting account
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete email account';
        setError(errorMessage);
        console.error('Failed to delete email account:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadSettings]
  );

  const testConnection = useCallback(
    async (input: TestConnectionInput): Promise<void> => {
      try {
        setTestingConnection(true);
        setError(null);
        setTestResult(null);
        const api = getEmailSettingsAPI();
        const result = await api.testConnection(input);
        setTestResult(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
        setError(errorMessage);
        console.error('Failed to test connection:', err);
        setTestResult({
          success: false,
          incoming: { success: false, error: errorMessage },
          outgoing: { success: false, error: errorMessage },
        });
      } finally {
        setTestingConnection(false);
      }
    },
    [setTestingConnection, setError, setTestResult]
  );

  const clearError = useCallback((): void => {
    setError(null);
  }, [setError]);

  return {
    settings,
    isLoading,
    isSaving,
    isTestingConnection,
    testResult,
    error,
    loadSettings,
    saveSettings,
    createAccount,
    updateAccount,
    deleteAccount,
    testConnection,
    clearError,
  };
}
