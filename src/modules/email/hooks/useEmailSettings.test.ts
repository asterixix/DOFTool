import { act } from 'react';

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  DEFAULT_CONNECTION_POOL_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  DEFAULT_RETRY_CONFIG,
} from '../types/EmailSettings.types';

import { useEmailSettings } from './useEmailSettings';
import { useEmailSettingsStore } from '../stores/emailSettings.store';

import type {
  CreateEmailAccountSettingsInput,
  EmailSettings,
  TestConnectionInput,
} from '../types/EmailSettings.types';

// Mock stores
vi.mock('../stores/emailSettings.store', () => ({
  useEmailSettingsStore: vi.fn(),
}));

// Mock window.electronAPI
const mockEmailSettingsAPI = {
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  testConnection: vi.fn(),
};

beforeEach(() => {
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    emailSettings: mockEmailSettingsAPI,
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useEmailSettings', () => {
  const mockUseEmailSettingsStore = useEmailSettingsStore as unknown as ReturnType<typeof vi.fn>;

  const createSettings = (overrides: Partial<EmailSettings> = {}): EmailSettings => ({
    defaultSyncInterval: 15,
    defaultTimeout: 30000,
    defaultRetry: DEFAULT_RETRY_CONFIG,
    defaultRateLimit: DEFAULT_RATE_LIMIT_CONFIG,
    connectionPool: DEFAULT_CONNECTION_POOL_CONFIG,
    enableLogging: false,
    logLevel: 'info',
    maxMessageSize: 10_000_000,
    enableCaching: false,
    cacheTtl: 60000,
    accounts: [],
    ...overrides,
  });

  const mockStore = {
    settings: null,
    isLoading: false,
    isSaving: false,
    isTestingConnection: false,
    testResult: null,
    error: null,
    setSettings: vi.fn(),
    setLoading: vi.fn(),
    setSaving: vi.fn(),
    setTestingConnection: vi.fn(),
    setTestResult: vi.fn(),
    setError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEmailSettingsStore.mockReturnValue(mockStore);
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useEmailSettings());

    expect(result.current.settings).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isTestingConnection).toBe(false);
    expect(result.current.testResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should load settings', async () => {
    const mockSettings = createSettings();

    mockEmailSettingsAPI.getSettings.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => useEmailSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    expect(mockEmailSettingsAPI.getSettings).toHaveBeenCalled();
    expect(mockStore.setSettings).toHaveBeenCalledWith(mockSettings);
    expect(mockStore.setLoading).toHaveBeenCalledWith(false);
  });

  it('should handle load settings errors', async () => {
    mockEmailSettingsAPI.getSettings.mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useEmailSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    expect(mockStore.setError).toHaveBeenCalledWith('Failed to load');
    expect(mockStore.setLoading).toHaveBeenCalledWith(false);
  });

  it('should save settings', async () => {
    const updates: Partial<EmailSettings> = { defaultSyncInterval: 30 };
    const updatedSettings = createSettings({ defaultSyncInterval: 30 });

    mockEmailSettingsAPI.updateSettings.mockResolvedValue(updatedSettings);

    const { result } = renderHook(() => useEmailSettings());

    await act(async () => {
      await result.current.saveSettings(updates);
    });

    expect(mockEmailSettingsAPI.updateSettings).toHaveBeenCalledWith(updates);
    expect(mockStore.setSettings).toHaveBeenCalledWith(updatedSettings);
    expect(mockStore.setSaving).toHaveBeenCalledWith(false);
  });

  it('should handle save settings errors', async () => {
    mockEmailSettingsAPI.updateSettings.mockRejectedValue(new Error('Failed to save'));

    const { result } = renderHook(() => useEmailSettings());

    await act(async () => {
      await expect(result.current.saveSettings({})).rejects.toThrow();
    });

    expect(mockStore.setError).toHaveBeenCalledWith('Failed to save');
    expect(mockStore.setSaving).toHaveBeenCalledWith(false);
  });

  it('should create account', async () => {
    const input: CreateEmailAccountSettingsInput = {
      email: 'test@example.com',
      displayName: 'Test',
      provider: 'custom',
      incoming: {
        protocol: 'imap',
        host: 'imap.example.com',
        port: 993,
        encryption: 'ssl',
        authMethod: 'password',
        username: 'test@example.com',
        password: 'password',
        timeout: 30000,
      },
      outgoing: {
        host: 'smtp.example.com',
        port: 465,
        encryption: 'ssl',
        authMethod: 'password',
        username: 'test@example.com',
        password: 'password',
        timeout: 30000,
      },
    };

    mockEmailSettingsAPI.createAccount.mockResolvedValue({ id: 'account-1' });
    mockEmailSettingsAPI.getSettings.mockResolvedValue({
      accounts: [{ id: 'account-1', ...input }],
      defaultAccountId: null,
    });

    const { result } = renderHook(() => useEmailSettings());

    await act(async () => {
      const accountId = await result.current.createAccount(input);
      expect(accountId).toBe('account-1');
    });

    expect(mockEmailSettingsAPI.createAccount).toHaveBeenCalledWith(input);
    expect(mockEmailSettingsAPI.getSettings).toHaveBeenCalled(); // Reloads settings
  });

  it('should update account', async () => {
    const input = {
      id: 'account-1',
      displayName: 'Updated',
    };

    mockEmailSettingsAPI.updateAccount.mockResolvedValue(undefined);
    mockEmailSettingsAPI.getSettings.mockResolvedValue({
      accounts: [],
      defaultAccountId: null,
    });

    const { result } = renderHook(() => useEmailSettings());

    await act(async () => {
      await result.current.updateAccount(input);
    });

    expect(mockEmailSettingsAPI.updateAccount).toHaveBeenCalledWith(input);
    expect(mockEmailSettingsAPI.getSettings).toHaveBeenCalled(); // Reloads settings
  });

  it('should delete account', async () => {
    mockEmailSettingsAPI.deleteAccount.mockResolvedValue(undefined);
    mockEmailSettingsAPI.getSettings.mockResolvedValue({
      accounts: [],
      defaultAccountId: null,
    });

    const { result } = renderHook(() => useEmailSettings());

    await act(async () => {
      await result.current.deleteAccount('account-1');
    });

    expect(mockEmailSettingsAPI.deleteAccount).toHaveBeenCalledWith('account-1');
    expect(mockEmailSettingsAPI.getSettings).toHaveBeenCalled(); // Reloads settings
  });

  it('should test connection', async () => {
    const input: TestConnectionInput = {
      incoming: {
        protocol: 'imap',
        host: 'imap.example.com',
        port: 993,
        encryption: 'ssl',
        authMethod: 'password',
        username: 'test@example.com',
        password: 'password',
        timeout: 30000,
      },
      outgoing: {
        host: 'smtp.example.com',
        port: 465,
        encryption: 'ssl',
        authMethod: 'password',
        username: 'test@example.com',
        password: 'password',
        timeout: 30000,
      },
      testType: 'both',
    };

    const testResult = {
      success: true,
      incoming: { success: true, latency: 100 },
      outgoing: { success: true, latency: 150 },
    };

    mockEmailSettingsAPI.testConnection.mockResolvedValue(testResult);

    const { result } = renderHook(() => useEmailSettings());

    await act(async () => {
      await result.current.testConnection(input);
    });

    expect(mockEmailSettingsAPI.testConnection).toHaveBeenCalledWith(input);
    expect(mockStore.setTestResult).toHaveBeenCalledWith(testResult);
    expect(mockStore.setTestingConnection).toHaveBeenCalledWith(false);
  });

  it('should handle test connection errors', async () => {
    const input: TestConnectionInput = {
      incoming: {
        protocol: 'imap',
        host: 'imap.example.com',
        port: 993,
        encryption: 'ssl',
        authMethod: 'password',
        username: 'test@example.com',
        password: 'password',
        timeout: 30000,
      },
      outgoing: {
        host: 'smtp.example.com',
        port: 465,
        encryption: 'ssl',
        authMethod: 'password',
        username: 'test@example.com',
        password: 'password',
        timeout: 30000,
      },
      testType: 'both',
    };

    mockEmailSettingsAPI.testConnection.mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useEmailSettings());

    await act(async () => {
      await result.current.testConnection(input);
    });

    expect(mockStore.setError).toHaveBeenCalledWith('Connection failed');
    expect(mockStore.setTestResult).toHaveBeenCalledWith({
      success: false,
      incoming: { success: false, error: 'Connection failed' },
      outgoing: { success: false, error: 'Connection failed' },
    });
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useEmailSettings());

    act(() => {
      result.current.clearError();
    });

    expect(mockStore.setError).toHaveBeenCalledWith(null);
  });

  it('should handle error when API is not available', async () => {
    (window as unknown as { electronAPI: unknown }).electronAPI = {};

    const { result } = renderHook(() => useEmailSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    // The hook catches errors and sets them in state instead of throwing
    expect(mockStore.setError).toHaveBeenCalledWith('Email settings API not available');
  });
});
