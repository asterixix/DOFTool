/**
 * EmailAccountSettingsList Component - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EmailAccountSettingsList } from './EmailAccountSettingsList';

import type { EmailAccountSettings } from '../../types/EmailSettings.types';

describe('EmailAccountSettingsList', () => {
  const mockAccounts: EmailAccountSettings[] = [
    {
      id: 'account-1',
      email: 'user@example.com',
      displayName: 'Test User',
      provider: 'gmail',
      incoming: {
        protocol: 'imap',
        host: 'imap.gmail.com',
        port: 993,
        encryption: 'ssl',
        authMethod: 'password',
        username: 'test@example.com',
        password: 'encrypted',
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
        authMethod: 'password',
        username: 'test@example.com',
        password: 'encrypted',
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
    },
    {
      id: 'account-2',
      email: 'work@example.com',
      displayName: 'Work Account',
      provider: 'outlook',
      incoming: {
        protocol: 'imap',
        host: 'outlook.office365.com',
        port: 993,
        encryption: 'ssl',
        authMethod: 'oauth2',
        username: 'work@example.com',
        password: undefined,
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
        host: 'smtp.office365.com',
        port: 587,
        encryption: 'tls',
        authMethod: 'oauth2',
        username: 'work@example.com',
        password: 'encrypted',
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
      status: 'error',
      lastError: 'Authentication failed',
      signature: undefined,
      lastSyncAt: undefined,
      deleteAfterDownload: undefined,
      connectionPool: undefined,
    },
    {
      id: 'account-3',
      email: 'disabled@example.com',
      displayName: 'Disabled Account',
      provider: 'custom',
      incoming: {
        protocol: 'imap',
        host: 'mail.example.com',
        port: 993,
        encryption: 'ssl',
        authMethod: 'password',
        username: 'disabled@example.com',
        password: 'encrypted',
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
        host: 'mail.example.com',
        port: 587,
        encryption: 'tls',
        authMethod: 'password',
        username: 'disabled@example.com',
        password: 'encrypted',
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
      status: 'disabled',
      lastSyncAt: Date.now() - 86400000,
      signature: undefined,
      lastError: undefined,
      deleteAfterDownload: undefined,
      connectionPool: undefined,
    },
  ];

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnTest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render account cards', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Work Account')).toBeInTheDocument();
      expect(screen.getByText('Disabled Account')).toBeInTheDocument();
    });

    it('should display account email addresses', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('work@example.com')).toBeInTheDocument();
      expect(screen.getByText('disabled@example.com')).toBeInTheDocument();
    });

    it('should display provider badge', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(screen.getByText('gmail')).toBeInTheDocument();
      expect(screen.getByText('outlook')).toBeInTheDocument();
      expect(screen.getByText('custom')).toBeInTheDocument();
    });

    it('should display protocol badge', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      const imapBadges = screen.getAllByText('IMAP');
      expect(imapBadges.length).toBe(3);
    });

    it('should render Mail icon for each account', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      const mailIcons = document.querySelectorAll('.lucide-mail');
      expect(mailIcons.length).toBe(3);
    });
  });

  describe('status badges', () => {
    it('should display Active badge for active accounts', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should display Error badge for accounts with errors', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should display Disabled badge for disabled accounts', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('should show success icon for active accounts', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      const checkIcon = document.querySelector('.lucide-check-circle-2');
      expect(checkIcon).toBeInTheDocument();
    });

    it('should show error icon for error accounts', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      const errorIcon = document.querySelector('.lucide-x-circle');
      expect(errorIcon).toBeInTheDocument();
    });

    it('should show alert icon for disabled accounts', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      const alertIcon = document.querySelector('.lucide-alert-circle');
      expect(alertIcon).toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('should display error message for accounts with lastError', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    });

    it('should not display error section for accounts without errors', () => {
      const accountsWithoutError = mockAccounts.filter((a) => !a.lastError);
      render(<EmailAccountSettingsList accounts={accountsWithoutError} />);

      expect(screen.queryByText('Error:')).not.toBeInTheDocument();
    });
  });

  describe('last sync display', () => {
    it('should display last sync time for synced accounts', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(screen.getByText(/Last synced:/)).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('should render Test button when onTest is provided', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} onTest={mockOnTest} />);

      const testButtons = screen.getAllByRole('button', { name: 'Test' });
      expect(testButtons.length).toBe(3);
    });

    it('should not render Test button when onTest is not provided', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(screen.queryByRole('button', { name: 'Test' })).not.toBeInTheDocument();
    });

    it('should render Edit button when onEdit is provided', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} onEdit={mockOnEdit} />);

      const editIcons = document.querySelectorAll('.lucide-settings-2');
      expect(editIcons.length).toBe(3);
    });

    it('should not render Edit button when onEdit is not provided', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(document.querySelector('.lucide-settings-2')).not.toBeInTheDocument();
    });

    it('should render Delete button when onDelete is provided', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} onDelete={mockOnDelete} />);

      const deleteIcons = document.querySelectorAll('.lucide-trash-2');
      expect(deleteIcons.length).toBe(3);
    });

    it('should not render Delete button when onDelete is not provided', () => {
      render(<EmailAccountSettingsList accounts={mockAccounts} />);

      expect(document.querySelector('.lucide-trash-2')).not.toBeInTheDocument();
    });
  });

  describe('action callbacks', () => {
    it('should call onTest with account id when Test is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailAccountSettingsList accounts={mockAccounts} onTest={mockOnTest} />);

      const testButtons = screen.getAllByRole('button', { name: 'Test' });
      await user.click(testButtons[0]!);

      expect(mockOnTest).toHaveBeenCalledWith('account-1');
    });

    it('should call onEdit with account when Edit is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailAccountSettingsList accounts={mockAccounts} onEdit={mockOnEdit} />);

      const editButtons = document.querySelectorAll('.lucide-settings-2');
      await user.click(editButtons[0]!.parentElement!);

      expect(mockOnEdit).toHaveBeenCalledWith(mockAccounts[0]);
    });

    it('should call onDelete with account id when Delete is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailAccountSettingsList accounts={mockAccounts} onDelete={mockOnDelete} />);

      const deleteButtons = document.querySelectorAll('.lucide-trash-2');
      await user.click(deleteButtons[0]!.parentElement!);

      expect(mockOnDelete).toHaveBeenCalledWith('account-1');
    });
  });

  describe('empty state', () => {
    it('should render nothing when accounts array is empty', () => {
      const { container } = render(<EmailAccountSettingsList accounts={[]} />);

      expect(container.firstChild?.childNodes.length).toBe(0);
    });
  });
});
