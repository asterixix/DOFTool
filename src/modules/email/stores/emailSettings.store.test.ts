import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useEmailSettingsStore } from './emailSettings.store';

import {
  DEFAULT_CONNECTION_POOL_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  DEFAULT_RETRY_CONFIG,
} from '../types/EmailSettings.types';

import type { EmailSettings, EmailAccountSettings } from '../types/EmailSettings.types';

const createAccount = (overrides: Partial<EmailAccountSettings> = {}): EmailAccountSettings => ({
  id: 'account-1',
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
    retry: DEFAULT_RETRY_CONFIG,
  },
  outgoing: {
    host: 'smtp.example.com',
    port: 465,
    encryption: 'ssl',
    authMethod: 'password',
    username: 'test@example.com',
    password: 'password',
    timeout: 30000,
    retry: DEFAULT_RETRY_CONFIG,
    rateLimit: DEFAULT_RATE_LIMIT_CONFIG,
  },
  syncInterval: 15,
  signature: undefined,
  status: 'active',
  lastError: undefined,
  lastSyncAt: undefined,
  deleteAfterDownload: undefined,
  connectionPool: undefined,
  ...overrides,
});

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

describe('emailSettings.store', () => {
  beforeEach(() => {
    const { reset } = useEmailSettingsStore.getState();
    act(() => {
      reset();
    });
  });

  describe('initial state', () => {
    it('should have null settings initially', () => {
      const state = useEmailSettingsStore.getState();
      expect(state.settings).toBeNull();
    });

    it('should have false loading states initially', () => {
      const state = useEmailSettingsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.isTestingConnection).toBe(false);
    });

    it('should have null testResult initially', () => {
      const state = useEmailSettingsStore.getState();
      expect(state.testResult).toBeNull();
    });

    it('should have null error initially', () => {
      const state = useEmailSettingsStore.getState();
      expect(state.error).toBeNull();
    });

    it('should have null selectedAccountId initially', () => {
      const state = useEmailSettingsStore.getState();
      expect(state.selectedAccountId).toBeNull();
    });

    it('should have false isDialogOpen initially', () => {
      const state = useEmailSettingsStore.getState();
      expect(state.isDialogOpen).toBe(false);
    });

    it('should have null editingAccount initially', () => {
      const state = useEmailSettingsStore.getState();
      expect(state.editingAccount).toBeNull();
    });
  });

  describe('setters', () => {
    it('should set settings', () => {
      const settings: EmailSettings = createSettings();

      const { setSettings } = useEmailSettingsStore.getState();
      act(() => {
        setSettings(settings);
      });

      expect(useEmailSettingsStore.getState().settings).toEqual(settings);
    });

    it('should set loading', () => {
      const { setLoading } = useEmailSettingsStore.getState();
      act(() => {
        setLoading(true);
      });

      expect(useEmailSettingsStore.getState().isLoading).toBe(true);
    });

    it('should set saving', () => {
      const { setSaving } = useEmailSettingsStore.getState();
      act(() => {
        setSaving(true);
      });

      expect(useEmailSettingsStore.getState().isSaving).toBe(true);
    });

    it('should set testing connection', () => {
      const { setTestingConnection } = useEmailSettingsStore.getState();
      act(() => {
        setTestingConnection(true);
      });

      expect(useEmailSettingsStore.getState().isTestingConnection).toBe(true);
    });

    it('should set test result', () => {
      const testResult = {
        success: true,
        incoming: { success: true, latency: 100 },
        outgoing: { success: true, latency: 150 },
      };

      const { setTestResult } = useEmailSettingsStore.getState();
      act(() => {
        setTestResult(testResult);
      });

      expect(useEmailSettingsStore.getState().testResult).toEqual(testResult);
    });

    it('should set error', () => {
      const { setError } = useEmailSettingsStore.getState();
      act(() => {
        setError('Error message');
      });

      expect(useEmailSettingsStore.getState().error).toBe('Error message');
    });

    it('should set selected account id', () => {
      const { setSelectedAccountId } = useEmailSettingsStore.getState();
      act(() => {
        setSelectedAccountId('account-1');
      });

      expect(useEmailSettingsStore.getState().selectedAccountId).toBe('account-1');
    });
  });

  describe('dialog actions', () => {
    it('should open dialog', () => {
      const account = createAccount();

      const { openDialog } = useEmailSettingsStore.getState();
      act(() => {
        openDialog(account);
      });

      const state = useEmailSettingsStore.getState();
      expect(state.isDialogOpen).toBe(true);
      expect(state.editingAccount).toEqual(account);
    });

    it('should open dialog without account', () => {
      const { openDialog } = useEmailSettingsStore.getState();
      act(() => {
        openDialog();
      });

      const state = useEmailSettingsStore.getState();
      expect(state.isDialogOpen).toBe(true);
      expect(state.editingAccount).toBeNull();
    });

    it('should close dialog', () => {
      const { openDialog, closeDialog } = useEmailSettingsStore.getState();
      act(() => {
        openDialog();
        closeDialog();
      });

      const state = useEmailSettingsStore.getState();
      expect(state.isDialogOpen).toBe(false);
      expect(state.editingAccount).toBeNull();
    });
  });

  describe('computed helpers', () => {
    it('should get account by id', () => {
      const account = createAccount();

      const settings: EmailSettings = createSettings({ accounts: [account] });

      const { setSettings, getAccountById } = useEmailSettingsStore.getState();
      act(() => {
        setSettings(settings);
      });

      const foundAccount = getAccountById('account-1');
      expect(foundAccount).toEqual(account);
    });

    it('should return undefined for non-existent account', () => {
      const settings: EmailSettings = createSettings({ accounts: [] });

      const { setSettings, getAccountById } = useEmailSettingsStore.getState();
      act(() => {
        setSettings(settings);
      });

      const foundAccount = getAccountById('non-existent');
      expect(foundAccount).toBeUndefined();
    });

    it('should get selected account', () => {
      const account = createAccount();

      const settings: EmailSettings = createSettings({ accounts: [account] });

      const { setSettings, setSelectedAccountId, getSelectedAccount } =
        useEmailSettingsStore.getState();
      act(() => {
        setSettings(settings);
        setSelectedAccountId('account-1');
      });

      const selectedAccount = getSelectedAccount();
      expect(selectedAccount).toEqual(account);
    });

    it('should return undefined for selected account when no account selected', () => {
      const settings: EmailSettings = createSettings({ accounts: [] });

      const { setSettings, getSelectedAccount } = useEmailSettingsStore.getState();
      act(() => {
        setSettings(settings);
      });

      const selectedAccount = getSelectedAccount();
      expect(selectedAccount).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const settings: EmailSettings = createSettings({ accounts: [] });

      const { setSettings, setError, setLoading, setSelectedAccountId, openDialog, reset } =
        useEmailSettingsStore.getState();
      act(() => {
        setSettings(settings);
        setError('Error');
        setLoading(true);
        setSelectedAccountId('account-1');
        openDialog();
        reset();
      });

      const state = useEmailSettingsStore.getState();
      expect(state.settings).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.selectedAccountId).toBeNull();
      expect(state.isDialogOpen).toBe(false);
      expect(state.editingAccount).toBeNull();
    });
  });
});
