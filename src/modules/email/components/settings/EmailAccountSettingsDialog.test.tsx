/**
 * EmailAccountSettingsDialog Component - Unit tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EmailAccountSettingsDialog } from './EmailAccountSettingsDialog';
import { useEmailSettings } from '../../hooks/useEmailSettings';

import type { EmailAccountSettings } from '../../types/EmailSettings.types';

// Mock the stores and hooks
const mockCloseDialog = vi.fn();
const mockCreateAccount = vi.fn().mockResolvedValue(undefined);
const mockUpdateAccount = vi.fn().mockResolvedValue(undefined);
const mockTestConnection = vi
  .fn()
  .mockResolvedValue({ incoming: { success: true }, outgoing: { success: true } });

vi.mock('../../stores/emailSettings.store', () => ({
  useEmailSettingsStore: vi.fn(() => ({
    isDialogOpen: true,
    editingAccount: null,
    closeDialog: mockCloseDialog,
  })),
}));

vi.mock('../../hooks/useEmailSettings', () => ({
  useEmailSettings: vi.fn(() => ({
    settings: null,
    isLoading: false,
    createAccount: mockCreateAccount,
    updateAccount: mockUpdateAccount,
    testConnection: mockTestConnection,
    isSaving: false,
    isTestingConnection: false,
    testResult: null,
    error: null,
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
    deleteAccount: vi.fn(),
    clearError: vi.fn(),
  })),
}));

describe('EmailAccountSettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dialog when isDialogOpen is true', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByText('Add Email Account')).toBeInTheDocument();
    });

    it('should render dialog description', () => {
      render(<EmailAccountSettingsDialog />);

      expect(
        screen.getByText('Configure your email account settings and server parameters')
      ).toBeInTheDocument();
    });

    it('should render Account Information section', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByText('Account Information')).toBeInTheDocument();
    });

    it('should render Email Address input', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByLabelText('Email Address *')).toBeInTheDocument();
    });

    it('should render Display Name input', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
    });

    it('should render Email Provider select', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByLabelText('Email Provider')).toBeInTheDocument();
    });

    it('should render Sync Interval input', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByLabelText('Sync Interval (minutes)')).toBeInTheDocument();
    });

    it('should render Incoming Server section', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByText(/Incoming Server/)).toBeInTheDocument();
    });

    it('should render Outgoing Server section', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByText('Outgoing Server (SMTP)')).toBeInTheDocument();
    });

    it('should render Cancel button', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should render Test Connection button', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
    });

    it('should render Create Account button for new account', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    const mockEditingAccount: EmailAccountSettings = {
      id: 'account-1',
      email: 'user@example.com',
      displayName: 'Test User',
      provider: 'gmail',
      incoming: {
        protocol: 'imap',
        host: 'imap.gmail.com',
        port: 993,
        encryption: 'ssl',
        authMethod: 'oauth2',
        username: 'user@example.com',
        password: 'secret',
        timeout: 30000,
        retry: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryOnConnectionError: true,
          retryOnTimeout: true,
        },
      },
      outgoing: {
        host: 'smtp.gmail.com',
        port: 587,
        encryption: 'tls',
        authMethod: 'oauth2',
        username: 'user@example.com',
        password: 'secret',
        timeout: 30000,
        retry: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryOnConnectionError: true,
          retryOnTimeout: true,
        },
        rateLimit: {
          maxRequests: 30,
          windowMs: 60000,
          enabled: true,
        },
      },
      syncInterval: 15,
      status: 'active',
      signature: undefined,
      lastError: undefined,
      lastSyncAt: undefined,
      deleteAfterDownload: undefined,
      connectionPool: undefined,
    };

    it('should show Edit Email Account title when editing', () => {
      vi.mocked(
        require('../../stores/emailSettings.store').useEmailSettingsStore
      ).mockReturnValueOnce({
        isDialogOpen: true,
        editingAccount: mockEditingAccount,
        closeDialog: mockCloseDialog,
      });

      render(<EmailAccountSettingsDialog />);

      expect(screen.getByText('Edit Email Account')).toBeInTheDocument();
    });

    it('should show Update Account button when editing', () => {
      vi.mocked(
        require('../../stores/emailSettings.store').useEmailSettingsStore
      ).mockReturnValueOnce({
        isDialogOpen: true,
        editingAccount: mockEditingAccount,
        closeDialog: mockCloseDialog,
      });

      render(<EmailAccountSettingsDialog />);

      expect(screen.getByRole('button', { name: /Update Account/i })).toBeInTheDocument();
    });

    it('should pre-fill form with account data when editing', () => {
      vi.mocked(
        require('../../stores/emailSettings.store').useEmailSettingsStore
      ).mockReturnValueOnce({
        isDialogOpen: true,
        editingAccount: mockEditingAccount,
        closeDialog: mockCloseDialog,
      });

      render(<EmailAccountSettingsDialog />);

      expect(screen.getByLabelText('Email Address *')).toHaveValue('user@example.com');
      expect(screen.getByLabelText('Display Name *')).toHaveValue('Test User');
    });

    it('should show password hint when editing', () => {
      vi.mocked(
        require('../../stores/emailSettings.store').useEmailSettingsStore
      ).mockReturnValueOnce({
        isDialogOpen: true,
        editingAccount: mockEditingAccount,
        closeDialog: mockCloseDialog,
      });

      render(<EmailAccountSettingsDialog />);

      expect(screen.getByText(/leave blank to keep current/i)).toBeInTheDocument();
    });
  });

  describe('provider presets', () => {
    it('should render provider select with options', () => {
      render(<EmailAccountSettingsDialog />);

      // Provider select should be present
      const providerSelect = screen.getByLabelText('Email Provider');
      expect(providerSelect).toBeInTheDocument();
    });
  });

  describe('advanced settings', () => {
    it('should show Advanced Settings toggle', () => {
      render(<EmailAccountSettingsDialog />);

      expect(screen.getByRole('button', { name: /Show Advanced Settings/i })).toBeInTheDocument();
    });

    it('should toggle advanced settings visibility', async () => {
      const user = userEvent.setup();
      render(<EmailAccountSettingsDialog />);

      await user.click(screen.getByRole('button', { name: /Show Advanced Settings/i }));

      expect(
        screen.getByLabelText(/Delete messages from server after downloading/i)
      ).toBeInTheDocument();
    });

    it('should show Hide Advanced Settings when expanded', async () => {
      const user = userEvent.setup();
      render(<EmailAccountSettingsDialog />);

      await user.click(screen.getByRole('button', { name: /Show Advanced Settings/i }));

      expect(screen.getByRole('button', { name: /Hide Advanced Settings/i })).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should show validation error for invalid email', async () => {
      const user = userEvent.setup();
      mockCreateAccount.mockRejectedValueOnce(new Error('Invalid email format'));

      render(<EmailAccountSettingsDialog />);

      const emailInput = screen.getByLabelText('Email Address *');
      await user.type(emailInput, 'invalid-email');

      const displayNameInput = screen.getByLabelText('Display Name *');
      await user.type(displayNameInput, 'Test');

      const incomingHostInput = screen.getByLabelText('Host *', { selector: '#incomingHost' });
      await user.type(incomingHostInput, 'imap.test.com');

      const submitButton = screen.getByRole('button', { name: /Create Account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });
  });

  describe('test connection', () => {
    it('should call testConnection when Test Connection is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailAccountSettingsDialog />);

      const emailInput = screen.getByLabelText('Email Address *');
      await user.type(emailInput, 'test@example.com');

      const incomingHostInput = screen.getByLabelText('Host *', { selector: '#incomingHost' });
      await user.type(incomingHostInput, 'imap.test.com');

      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      expect(mockTestConnection).toHaveBeenCalled();
    });

    it('should show Testing... while testing connection', () => {
      vi.mocked(useEmailSettings).mockReturnValue({
        settings: null,
        isLoading: false,
        createAccount: mockCreateAccount,
        updateAccount: mockUpdateAccount,
        testConnection: mockTestConnection,
        isSaving: false,
        isTestingConnection: true,
        testResult: null,
        error: null,
        loadSettings: vi.fn(),
        saveSettings: vi.fn(),
        deleteAccount: vi.fn(),
        clearError: vi.fn(),
      });

      render(<EmailAccountSettingsDialog />);

      expect(screen.getByText('Testing...', { selector: 'button' })).toBeInTheDocument();
    });

    it('should show test results when available', () => {
      vi.mocked(useEmailSettings).mockReturnValue({
        settings: null,
        isLoading: false,
        createAccount: mockCreateAccount,
        updateAccount: mockUpdateAccount,
        testConnection: mockTestConnection,
        isSaving: false,
        isTestingConnection: false,
        testResult: {
          success: true,
          incoming: { success: true, latency: 150 },
          outgoing: { success: true, latency: 200 },
        },
        error: null,
        loadSettings: vi.fn(),
        saveSettings: vi.fn(),
        deleteAccount: vi.fn(),
        clearError: vi.fn(),
      });

      render(<EmailAccountSettingsDialog />);

      expect(
        screen.getByText((content, element) => {
          return (
            content.includes('Connection Test Results') && element?.tagName.toLowerCase() === 'h4'
          );
        })
      ).toBeInTheDocument();
      expect(screen.getByText(/Success \(150ms\)/)).toBeInTheDocument();
      expect(screen.getByText(/Success \(200ms\)/)).toBeInTheDocument();
    });

    it('should show error in test results', () => {
      vi.mocked(useEmailSettings).mockReturnValue({
        settings: null,
        isLoading: false,
        createAccount: mockCreateAccount,
        updateAccount: mockUpdateAccount,
        testConnection: mockTestConnection,
        isSaving: false,
        isTestingConnection: false,
        testResult: {
          success: false,
          incoming: { success: false, error: 'Connection refused' },
          outgoing: { success: true, latency: 200 },
        },
        error: null,
        loadSettings: vi.fn(),
        saveSettings: vi.fn(),
        deleteAccount: vi.fn(),
        clearError: vi.fn(),
      });

      render(<EmailAccountSettingsDialog />);

      expect(screen.getByText('Connection refused')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('should call createAccount on submit for new account', async () => {
      const user = userEvent.setup();
      render(<EmailAccountSettingsDialog />);

      const emailInput = screen.getByLabelText('Email Address *');
      await user.type(emailInput, 'test@example.com');

      const displayNameInput = screen.getByLabelText('Display Name *');
      await user.type(displayNameInput, 'Test User');

      // Fill required server fields
      const incomingHostInput = screen.getByLabelText('Host *', { selector: '#incomingHost' });
      await user.type(incomingHostInput, 'imap.test.com');

      const incomingUsernameInput = screen.getByLabelText('Username *', {
        selector: '#incomingUsername',
      });
      await user.type(incomingUsernameInput, 'test@example.com');

      const incomingPasswordInputs = screen.getAllByLabelText(/^Password/);
      await user.type(incomingPasswordInputs[0]!, 'password123');

      await user.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(mockCreateAccount).toHaveBeenCalled();
      });
    });

    it('should show Saving... while saving', () => {
      vi.mocked(useEmailSettings).mockReturnValue({
        settings: null,
        isLoading: false,
        createAccount: mockCreateAccount,
        updateAccount: mockUpdateAccount,
        testConnection: mockTestConnection,
        isSaving: true,
        isTestingConnection: false,
        testResult: null,
        error: null,
        loadSettings: vi.fn(),
        saveSettings: vi.fn(),
        deleteAccount: vi.fn(),
        clearError: vi.fn(),
      });

      render(<EmailAccountSettingsDialog />);

      expect(screen.getByText('Saving...', { selector: 'button' })).toBeInTheDocument();
    });

    it('should close dialog after successful save', async () => {
      const user = userEvent.setup();
      render(<EmailAccountSettingsDialog />);

      const emailInput = screen.getByLabelText('Email Address *');
      await user.type(emailInput, 'test@example.com');

      const displayNameInput = screen.getByLabelText('Display Name *');
      await user.type(displayNameInput, 'Test User');

      const incomingHostInput = screen.getByLabelText('Host *', { selector: '#incomingHost' });
      await user.type(incomingHostInput, 'imap.test.com');

      const incomingUsernameInput = screen.getByLabelText('Username *', {
        selector: '#incomingUsername',
      });
      await user.type(incomingUsernameInput, 'test@example.com');

      const incomingPasswordInputs = screen.getAllByLabelText(/^Password/);
      await user.type(incomingPasswordInputs[0]!, 'password123');

      await user.click(screen.getByRole('button', { name: /Create Account/i }));

      await waitFor(() => {
        expect(mockCloseDialog).toHaveBeenCalled();
      });
    });
  });

  describe('cancel', () => {
    it('should call closeDialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailAccountSettingsDialog />);

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(mockCloseDialog).toHaveBeenCalled();
    });
  });

  describe('disabled states', () => {
    it('should disable buttons while saving', () => {
      vi.mocked(useEmailSettings).mockReturnValue({
        settings: null,
        isLoading: false,
        createAccount: mockCreateAccount,
        updateAccount: mockUpdateAccount,
        testConnection: mockTestConnection,
        isSaving: true,
        isTestingConnection: false,
        testResult: null,
        error: null,
        loadSettings: vi.fn(),
        saveSettings: vi.fn(),
        deleteAccount: vi.fn(),
        clearError: vi.fn(),
      });

      render(<EmailAccountSettingsDialog />);

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Test Connection/i })).toBeDisabled();
    });

    it('should disable buttons while testing connection', () => {
      vi.mocked(useEmailSettings).mockReturnValue({
        settings: null,
        isLoading: false,
        createAccount: mockCreateAccount,
        updateAccount: mockUpdateAccount,
        testConnection: mockTestConnection,
        isSaving: false,
        isTestingConnection: true,
        testResult: null,
        error: null,
        loadSettings: vi.fn(),
        saveSettings: vi.fn(),
        deleteAccount: vi.fn(),
        clearError: vi.fn(),
      });

      render(<EmailAccountSettingsDialog />);

      expect(screen.getByRole('button', { name: 'Create Account' })).toBeDisabled();
    });
  });
});
