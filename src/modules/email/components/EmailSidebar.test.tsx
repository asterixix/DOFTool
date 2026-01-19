/**
 * EmailSidebar Component - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EmailSidebar } from './EmailSidebar';

import type { EmailAccount, EmailFolder } from '../types/Email.types';

describe('EmailSidebar', () => {
  const mockAccounts: EmailAccount[] = [
    {
      id: 'account-1',
      familyId: 'family-1',
      ownerId: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      type: 'imap',
      sharedWithMembers: [],
      allowedDeviceIds: [],
      status: 'active',
      syncInterval: 15,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'account-2',
      familyId: 'family-1',
      ownerId: 'user-1',
      email: 'work@example.com',
      displayName: 'Work Account',
      type: 'imap',
      sharedWithMembers: [],
      allowedDeviceIds: [],
      status: 'active',
      syncInterval: 15,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const mockFolders: EmailFolder[] = [
    {
      id: 'folder-1',
      accountId: 'account-1',
      path: 'INBOX',
      name: 'Inbox',
      type: 'inbox',
      totalMessages: 100,
      unreadMessages: 5,
      selectable: true,
    },
    {
      id: 'folder-2',
      accountId: 'account-1',
      path: 'Sent',
      name: 'Sent',
      type: 'sent',
      totalMessages: 50,
      unreadMessages: 0,
      selectable: true,
    },
    {
      id: 'folder-3',
      accountId: 'account-1',
      path: 'Drafts',
      name: 'Drafts',
      type: 'drafts',
      totalMessages: 3,
      unreadMessages: 0,
      selectable: true,
    },
    {
      id: 'folder-4',
      accountId: 'account-1',
      path: 'Trash',
      name: 'Trash',
      type: 'trash',
      totalMessages: 10,
      unreadMessages: 0,
      selectable: true,
    },
  ];

  const mockOnAccountChange = vi.fn();
  const mockOnFolderSelect = vi.fn();
  const mockOnCompose = vi.fn();
  const mockOnSync = vi.fn();
  const mockOnManageAccounts = vi.fn();
  const mockOnManageFolders = vi.fn();

  const defaultProps = {
    accounts: mockAccounts,
    selectedAccountId: 'account-1',
    folders: mockFolders,
    selectedFolder: 'INBOX',
    onAccountChange: mockOnAccountChange,
    onFolderSelect: mockOnFolderSelect,
    onCompose: mockOnCompose,
    onSync: mockOnSync,
    onManageAccounts: mockOnManageAccounts,
    onManageFolders: mockOnManageFolders,
    isSyncing: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render account selector', () => {
      render(<EmailSidebar {...defaultProps} />);

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should render Compose button', () => {
      render(<EmailSidebar {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Compose/i })).toBeInTheDocument();
    });

    it('should render Manage accounts button', () => {
      render(<EmailSidebar {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Manage accounts/i })).toBeInTheDocument();
    });

    it('should render Sync button', () => {
      render(<EmailSidebar {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Sync now/i })).toBeInTheDocument();
    });

    it('should render folders list', () => {
      render(<EmailSidebar {...defaultProps} />);

      expect(screen.getByText('Inbox')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
      expect(screen.getByText('Drafts')).toBeInTheDocument();
      expect(screen.getByText('Trash')).toBeInTheDocument();
    });

    it('should render Family Messages section', () => {
      render(<EmailSidebar {...defaultProps} />);

      expect(screen.getByText('Family Messages')).toBeInTheDocument();
    });
  });

  describe('unread badges', () => {
    it('should display unread count badge for folders with unread messages', () => {
      render(<EmailSidebar {...defaultProps} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not display badge for folders without unread messages', () => {
      render(<EmailSidebar {...defaultProps} />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should display 999+ for very high unread counts', () => {
      const foldersWithHighUnread: EmailFolder[] = [
        {
          id: 'folder-1',
          accountId: 'account-1',
          path: 'INBOX',
          name: 'Inbox',
          type: 'inbox',
          totalMessages: 2000,
          unreadMessages: 1500,
          selectable: true,
        },
      ];

      render(<EmailSidebar {...defaultProps} folders={foldersWithHighUnread} />);

      expect(screen.getByText('999+')).toBeInTheDocument();
    });
  });

  describe('folder selection', () => {
    it('should highlight selected folder', () => {
      const { container } = render(<EmailSidebar {...defaultProps} selectedFolder="INBOX" />);

      const inboxFolder = container.querySelector('[class*="bg-accent"]');
      expect(inboxFolder).toBeInTheDocument();
    });

    it('should call onFolderSelect when folder is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailSidebar {...defaultProps} />);

      await user.click(screen.getByText('Sent'));

      expect(mockOnFolderSelect).toHaveBeenCalledWith('Sent');
    });

    it('should call onFolderSelect for Family Messages', async () => {
      const user = userEvent.setup();
      render(<EmailSidebar {...defaultProps} />);

      await user.click(screen.getByText('Family Messages'));

      expect(mockOnFolderSelect).toHaveBeenCalledWith('internal');
    });
  });

  describe('compose button', () => {
    it('should call onCompose when clicked', async () => {
      const user = userEvent.setup();
      render(<EmailSidebar {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Compose/i }));

      expect(mockOnCompose).toHaveBeenCalled();
    });
  });

  describe('sync button', () => {
    it('should call onSync when clicked', async () => {
      const user = userEvent.setup();
      render(<EmailSidebar {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Sync now/i }));

      expect(mockOnSync).toHaveBeenCalled();
    });

    it('should be disabled when syncing', () => {
      render(<EmailSidebar {...defaultProps} isSyncing={true} />);

      expect(screen.getByRole('button', { name: /Syncing.../i })).toBeDisabled();
    });

    it('should be disabled when no account selected', () => {
      render(<EmailSidebar {...defaultProps} selectedAccountId={null} />);

      expect(screen.getByRole('button', { name: /Sync now/i })).toBeDisabled();
    });

    it('should show Syncing... text when syncing', () => {
      render(<EmailSidebar {...defaultProps} isSyncing={true} />);

      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('should animate refresh icon when syncing', () => {
      render(<EmailSidebar {...defaultProps} isSyncing={true} />);

      const refreshIcon = document.querySelector('.animate-spin');
      expect(refreshIcon).toBeInTheDocument();
    });
  });

  describe('manage accounts', () => {
    it('should call onManageAccounts when manage accounts button is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailSidebar {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /Manage accounts/i }));

      expect(mockOnManageAccounts).toHaveBeenCalled();
    });
  });

  describe('manage folders', () => {
    it('should show Manage Folders button when onManageFolders and account are present', () => {
      render(<EmailSidebar {...defaultProps} />);

      expect(screen.getByText('Manage Folders')).toBeInTheDocument();
    });

    it('should not show Manage Folders button when no account selected', () => {
      render(<EmailSidebar {...defaultProps} selectedAccountId={null} />);

      expect(screen.queryByText('Manage Folders')).not.toBeInTheDocument();
    });

    it('should not show Manage Folders button when onManageFolders is not provided', () => {
      const { onManageFolders, ...propsWithoutManageFolders } = defaultProps;
      render(<EmailSidebar {...propsWithoutManageFolders} />);

      expect(screen.queryByText('Manage Folders')).not.toBeInTheDocument();
    });

    it('should call onManageFolders when clicked', async () => {
      const user = userEvent.setup();
      render(<EmailSidebar {...defaultProps} />);

      await user.click(screen.getByText('Manage Folders'));

      expect(mockOnManageFolders).toHaveBeenCalled();
    });
  });

  describe('nested folders', () => {
    it('should render expand/collapse buttons for folders with children', () => {
      const nestedFolders: EmailFolder[] = [
        {
          id: 'folder-1',
          accountId: 'account-1',
          path: 'Work',
          name: 'Work',
          type: 'custom',
          totalMessages: 10,
          unreadMessages: 0,
          selectable: true,
        },
        {
          id: 'folder-2',
          accountId: 'account-1',
          path: 'Work/Projects',
          name: 'Projects',
          parent: 'Work',
          type: 'custom',
          totalMessages: 5,
          unreadMessages: 0,
          selectable: true,
        },
      ];

      render(<EmailSidebar {...defaultProps} folders={nestedFolders} />);

      const expandButton = screen.getByRole('button', { name: /Expand folder/i });
      expect(expandButton).toBeInTheDocument();
    });

    it('should toggle nested folders visibility when expand button is clicked', async () => {
      const user = userEvent.setup();
      const nestedFolders: EmailFolder[] = [
        {
          id: 'folder-1',
          accountId: 'account-1',
          path: 'Work',
          name: 'Work',
          type: 'custom',
          totalMessages: 10,
          unreadMessages: 0,
          selectable: true,
        },
        {
          id: 'folder-2',
          accountId: 'account-1',
          path: 'Work/Projects',
          name: 'Projects',
          parent: 'Work',
          type: 'custom',
          totalMessages: 5,
          unreadMessages: 0,
          selectable: true,
        },
      ];

      render(<EmailSidebar {...defaultProps} folders={nestedFolders} />);

      const expandButton = screen.getByRole('button', { name: /Expand folder/i });
      await user.click(expandButton);

      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  describe('folder sorting', () => {
    it('should sort folders with known types first', () => {
      const unsortedFolders: EmailFolder[] = [
        {
          id: 'folder-4',
          accountId: 'account-1',
          path: 'Custom',
          name: 'Custom',
          type: 'custom',
          totalMessages: 0,
          unreadMessages: 0,
          selectable: true,
        },
        {
          id: 'folder-1',
          accountId: 'account-1',
          path: 'INBOX',
          name: 'Inbox',
          type: 'inbox',
          totalMessages: 0,
          unreadMessages: 0,
          selectable: true,
        },
      ];

      const { container } = render(<EmailSidebar {...defaultProps} folders={unsortedFolders} />);

      const buttons = container.querySelectorAll('button');
      const folderButtons = Array.from(buttons).filter(
        (btn) => btn.textContent?.includes('Inbox') || btn.textContent?.includes('Custom')
      );

      expect(folderButtons[0]?.textContent).toContain('Inbox');
    });
  });

  describe('empty state', () => {
    it('should render correctly with no accounts', () => {
      render(<EmailSidebar {...defaultProps} accounts={[]} selectedAccountId={null} />);

      expect(screen.getByRole('button', { name: /Compose/i })).toBeInTheDocument();
    });

    it('should render correctly with no folders', () => {
      render(<EmailSidebar {...defaultProps} folders={[]} />);

      expect(screen.getByRole('button', { name: /Compose/i })).toBeInTheDocument();
      expect(screen.getByText('Family Messages')).toBeInTheDocument();
    });
  });
});
