/**
 * EmailClient Component - Unit tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { EmailClient } from './EmailClient';

import type { EmailAccount, EmailFolder, EmailMessage } from '../types/Email.types';

// Mock data
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
];

const mockMessages: EmailMessage[] = [
  {
    id: 'msg-1',
    accountId: 'account-1',
    familyId: 'family-1',
    uid: 12345,
    messageId: '<msg-1@example.com>',
    threadId: 'thread-1',
    folder: 'INBOX',
    from: { name: 'John Doe', address: 'john@example.com' },
    to: [{ address: 'me@example.com' }],
    subject: 'Test Email',
    textBody: 'Email body content.',
    snippet: 'Email body...',
    date: Date.now() - 3600000,
    size: 5000,
    read: false,
    starred: false,
    draft: false,
    labels: [],
    attachments: [],
    flags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// Mock useEmail hook
const mockSyncAccount = vi.fn().mockResolvedValue(undefined);
const mockDeleteMessage = vi.fn().mockResolvedValue(undefined);
const mockArchiveMessage = vi.fn().mockResolvedValue(undefined);
const mockToggleStar = vi.fn().mockResolvedValue(undefined);
const mockToggleRead = vi.fn().mockResolvedValue(undefined);
const mockSendMessage = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useEmail', () => ({
  useEmail: vi.fn(() => ({
    accounts: mockAccounts,
    folders: mockFolders,
    messages: mockMessages,
    threads: [],
    isLoading: false,
    isSyncing: false,
    error: null,
    selectedAccountId: 'account-1',
    selectedFolderId: 'folder-1',
    selectedMessageId: 'msg-1',
    setSelectedAccountId: vi.fn(),
    setSelectedFolderId: vi.fn(),
    setSelectedMessageId: vi.fn(),
    loadMessages: vi.fn().mockResolvedValue(undefined),
    refreshFolders: vi.fn().mockResolvedValue(undefined),
    createFolder: vi.fn().mockResolvedValue(undefined),
    syncAccount: mockSyncAccount,
    deleteMessage: mockDeleteMessage,
    archiveMessage: mockArchiveMessage,
    toggleStar: mockToggleStar,
    toggleRead: mockToggleRead,
    sendMessage: mockSendMessage,
    markAsRead: mockToggleRead,
    markAsStarred: mockToggleStar,
    moveMessage: vi.fn().mockResolvedValue(undefined),
    createAccount: vi.fn().mockResolvedValue(null),
    updateAccount: vi.fn().mockResolvedValue(null),
    deleteAccount: vi.fn().mockResolvedValue(false),
    sendEmail: mockSendMessage,
    loadFolders: vi.fn().mockResolvedValue(undefined),
    setCurrentView: vi.fn(),
    loadConversations: vi.fn().mockResolvedValue(undefined),
    loadInternalMessages: vi.fn().mockResolvedValue(undefined),
    createConversation: vi.fn().mockResolvedValue(null),
    sendInternalMessage: vi.fn().mockResolvedValue(false),
  })),
}));

// Mock email preferences store
vi.mock('../stores/emailPreferences.store', () => ({
  useEmailPreferencesStore: vi.fn((selector) =>
    selector({
      preferences: {
        display: {
          threadMode: 'individual',
          showSnippets: true,
          previewPane: 'right',
        },
        compose: {
          windowMode: 'dialog',
        },
      },
    })
  ),
}));

// Mock ResizeObserver for resizable panels
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

describe('EmailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderEmailClient = () => {
    return render(
      <MemoryRouter>
        <EmailClient />
      </MemoryRouter>
    );
  };

  describe('rendering', () => {
    it('should render the email client interface', () => {
      renderEmailClient();

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should render the sidebar', () => {
      renderEmailClient();

      expect(screen.getByRole('button', { name: /Compose/i })).toBeInTheDocument();
    });

    it('should render folder list', () => {
      renderEmailClient();

      expect(screen.getByText('Inbox')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
    });

    it('should render message list', () => {
      renderEmailClient();

      expect(screen.getByText('Test Email')).toBeInTheDocument();
    });

    it('should render message view placeholder when no message selected', () => {
      renderEmailClient();

      expect(screen.getByText('Select a message to read')).toBeInTheDocument();
    });
  });

  describe('account selection', () => {
    it('should display selected account email', () => {
      renderEmailClient();

      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  describe('folder navigation', () => {
    it('should select folder when clicked', async () => {
      const user = userEvent.setup();
      renderEmailClient();

      await user.click(screen.getByText('Sent'));

      // The folder should be visually selected
      const sentFolder = screen.getByText('Sent').closest('button');
      expect(sentFolder).toHaveClass('bg-accent');
    });

    it('should display unread count for inbox', () => {
      renderEmailClient();

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('message selection', () => {
    it('should select message when clicked', async () => {
      const user = userEvent.setup();
      renderEmailClient();

      const messageRow = screen.getByText('Test Email').closest('[role="option"]');
      if (messageRow) {
        await user.click(messageRow);
      }

      // Message should be displayed in view
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('compose functionality', () => {
    it('should open composer when Compose is clicked', async () => {
      const user = userEvent.setup();
      renderEmailClient();

      await user.click(screen.getByRole('button', { name: /Compose/i }));

      await waitFor(() => {
        expect(screen.getByText('New Message')).toBeInTheDocument();
      });
    });
  });

  describe('sync functionality', () => {
    it('should call syncAccount when Sync is clicked', async () => {
      const user = userEvent.setup();
      renderEmailClient();

      await user.click(screen.getByRole('button', { name: /Sync now/i }));

      expect(mockSyncAccount).toHaveBeenCalledWith('account-1');
    });

    it('should show syncing state', () => {
      vi.mocked(require('../hooks/useEmail').useEmail).mockReturnValueOnce({
        accounts: mockAccounts,
        folders: mockFolders,
        messages: mockMessages,
        threads: [],
        isLoading: false,
        isSyncing: true,
        error: null,
        syncAccount: mockSyncAccount,
        deleteMessage: mockDeleteMessage,
        archiveMessage: mockArchiveMessage,
        toggleStar: mockToggleStar,
        toggleRead: mockToggleRead,
        sendMessage: mockSendMessage,
      });

      renderEmailClient();

      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });
  });

  describe('message actions', () => {
    it('should toggle star when star is clicked', async () => {
      const user = userEvent.setup();
      renderEmailClient();

      const starButton = document.querySelector('.lucide-star')?.parentElement;
      if (starButton) {
        await user.click(starButton);
      }

      await waitFor(() => {
        expect(mockToggleStar).toHaveBeenCalledWith('msg-1');
      });
    });
  });

  describe('reply functionality', () => {
    it('should open composer in reply mode when Reply is clicked', async () => {
      const user = userEvent.setup();
      renderEmailClient();

      // First select a message
      const messageRow = screen.getByText('Test Email').closest('[role="option"]');
      if (messageRow) {
        await user.click(messageRow);
      }

      await waitFor(() => {
        expect(screen.getByTitle('Reply')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Reply'));

      await waitFor(() => {
        expect(screen.getByText('Reply')).toBeInTheDocument();
      });
    });
  });

  describe('forward functionality', () => {
    it('should open composer in forward mode when Forward is clicked', async () => {
      const user = userEvent.setup();
      renderEmailClient();

      // First select a message
      const messageRow = screen.getByText('Test Email').closest('[role="option"]');
      if (messageRow) {
        await user.click(messageRow);
      }

      await waitFor(() => {
        expect(screen.getByTitle('Forward')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Forward'));

      await waitFor(() => {
        expect(screen.getByText('Forward')).toBeInTheDocument();
      });
    });
  });

  describe('delete functionality', () => {
    it('should call deleteMessage when Delete is clicked', async () => {
      const user = userEvent.setup();
      renderEmailClient();

      // First select a message
      const messageRow = screen.getByText('Test Email').closest('[role="option"]');
      if (messageRow) {
        await user.click(messageRow);
      }

      await waitFor(() => {
        expect(screen.getByTitle('Delete')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Delete'));

      await waitFor(() => {
        expect(mockDeleteMessage).toHaveBeenCalledWith('msg-1');
      });
    });
  });

  describe('archive functionality', () => {
    it('should call archiveMessage when Archive is clicked', async () => {
      const user = userEvent.setup();
      renderEmailClient();

      // First select a message
      const messageRow = screen.getByText('Test Email').closest('[role="option"]');
      if (messageRow) {
        await user.click(messageRow);
      }

      await waitFor(() => {
        expect(screen.getByTitle('Archive')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Archive'));

      await waitFor(() => {
        expect(mockArchiveMessage).toHaveBeenCalledWith('msg-1');
      });
    });
  });

  describe('loading state', () => {
    it('should show loading state', () => {
      vi.mocked(require('../hooks/useEmail').useEmail).mockReturnValueOnce({
        accounts: mockAccounts,
        folders: mockFolders,
        messages: [],
        threads: [],
        isLoading: true,
        isSyncing: false,
        error: null,
        syncAccount: mockSyncAccount,
        deleteMessage: mockDeleteMessage,
        archiveMessage: mockArchiveMessage,
        toggleStar: mockToggleStar,
        toggleRead: mockToggleRead,
        sendMessage: mockSendMessage,
      });

      renderEmailClient();

      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no messages', () => {
      vi.mocked(require('../hooks/useEmail').useEmail).mockReturnValueOnce({
        accounts: mockAccounts,
        folders: mockFolders,
        messages: [],
        threads: [],
        isLoading: false,
        isSyncing: false,
        error: null,
        syncAccount: mockSyncAccount,
        deleteMessage: mockDeleteMessage,
        archiveMessage: mockArchiveMessage,
        toggleStar: mockToggleStar,
        toggleRead: mockToggleRead,
        sendMessage: mockSendMessage,
      });

      renderEmailClient();

      expect(screen.getByText('No messages')).toBeInTheDocument();
    });
  });

  describe('folder manager', () => {
    it('should open folder manager when Manage Folders is clicked', async () => {
      const user = userEvent.setup();
      renderEmailClient();

      await user.click(screen.getByText('Manage Folders'));

      await waitFor(() => {
        expect(screen.getByText('Manage Folders')).toBeInTheDocument();
      });
    });
  });

  describe('responsive layout', () => {
    it('should render resizable panels', () => {
      const { container } = renderEmailClient();

      // Check for panel structure
      const panels = container.querySelectorAll('[data-panel]');
      expect(panels.length).toBeGreaterThan(0);
    });
  });

  describe('keyboard navigation', () => {
    it('should focus search on Ctrl+K', async () => {
      renderEmailClient();

      const searchInput = screen.getByPlaceholderText('Search emails (Ctrl+K)');

      // Simulate Ctrl+K
      await userEvent.keyboard('{Control>}k{/Control}');

      expect(document.activeElement).toBe(searchInput);
    });
  });
});
