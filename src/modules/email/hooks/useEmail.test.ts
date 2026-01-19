import { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getEmailAPI } from '@/shared/utils/electronAPI';

import { useEmail } from './useEmail';
import { useEmailStore } from '../stores/email.store';

// Mock dependencies
vi.mock('@/shared/utils/electronAPI', () => ({
  getEmailAPI: vi.fn(),
}));

vi.mock('../stores/email.store', () => ({
  useEmailStore: vi.fn(),
}));

describe('useEmail', () => {
  const mockGetEmailAPI = getEmailAPI as ReturnType<typeof vi.fn>;
  const mockUseEmailStore = useEmailStore as unknown as ReturnType<typeof vi.fn>;
  const mockEmailAPI = {
    getAccounts: vi.fn(),
    addAccount: vi.fn(),
    updateAccount: vi.fn(),
    removeAccount: vi.fn(),
    fetchMessages: vi.fn(),
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
    markAsStarred: vi.fn(),
    moveMessage: vi.fn(),
    deleteMessage: vi.fn(),
    getFolders: vi.fn(),
    getConversations: vi.fn(),
    getInternalMessages: vi.fn(),
    createConversation: vi.fn(),
    sendInternalMessage: vi.fn(),
    syncAccount: vi.fn(),
  };

  const mockStore = {
    accounts: [],
    selectedAccountId: null as string | null,
    isLoadingAccounts: false,
    messages: [] as any[],
    threads: [],
    expandedThreads: new Set<string>(),
    selectedMessageId: null,
    selectedThreadId: null,
    isLoadingMessages: false,
    folders: [],
    selectedFolderId: null as string | null,
    currentView: 'inbox' as const,
    isLoadingFolders: false,
    conversations: [],
    internalMessages: [],
    selectedConversationId: null,
    isLoadingConversations: false,
    isLoadingInternalMessages: false,
    messageListView: 'thread' as const,
    filter: {},
    sort: { field: 'date' as const, order: 'desc' as const },
    searchQuery: '',
    isComposerOpen: false,
    composerMode: 'new' as const,
    draftMessage: null,
    replyToMessage: null,
    isSaving: false,
    isSyncing: false,
    error: null,
    isAccountSettingsOpen: false,
    editingAccount: null,
    isShareDialogOpen: false,
    sharingAccount: null,
    setAccounts: vi.fn(),
    setSelectedAccountId: vi.fn(),
    setLoadingAccounts: vi.fn(),
    setMessages: vi.fn(),
    setThreads: vi.fn(),
    toggleThreadExpansion: vi.fn(),
    setSelectedMessageId: vi.fn(),
    setSelectedThreadId: vi.fn(),
    setLoadingMessages: vi.fn(),
    setFolders: vi.fn(),
    setSelectedFolderId: vi.fn(),
    setCurrentView: vi.fn(),
    setLoadingFolders: vi.fn(),
    setConversations: vi.fn(),
    setInternalMessages: vi.fn(),
    setSelectedConversationId: vi.fn(),
    setLoadingConversations: vi.fn(),
    setLoadingInternalMessages: vi.fn(),
    setMessageListView: vi.fn(),
    setFilter: vi.fn(),
    setSort: vi.fn(),
    setSearchQuery: vi.fn(),
    clearFilters: vi.fn(),
    openComposer: vi.fn(),
    closeComposer: vi.fn(),
    setDraftMessage: vi.fn(),
    setSaving: vi.fn(),
    setSyncing: vi.fn(),
    setError: vi.fn(),
    openAccountSettings: vi.fn(),
    closeAccountSettings: vi.fn(),
    openShareDialog: vi.fn(),
    closeShareDialog: vi.fn(),
    getAccountById: vi.fn(() => undefined),
    getSelectedAccount: vi.fn(() => undefined),
    getMessageById: vi.fn(() => undefined),
    getThreadById: vi.fn(() => undefined),
    getFilteredMessages: vi.fn(() => [] as any[]),
    getFilteredThreads: vi.fn(() => []),
    getUnreadCount: vi.fn(() => 0),
    getFolderById: vi.fn(() => undefined),
    getSelectedFolder: vi.fn(() => undefined),
    getFoldersByAccount: vi.fn(() => []),
    getConversationById: vi.fn(() => undefined),
    getMessagesByConversation: vi.fn(() => []),
    getUnreadConversations: vi.fn(() => []),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEmailAPI.mockReturnValue(mockEmailAPI);
    mockUseEmailStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useEmail());

    expect(result.current.accounts).toEqual([]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.currentView).toBe('inbox');
    expect(result.current.isLoadingAccounts).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('loadAccounts', () => {
    it('should load accounts', async () => {
      const mockAccounts = [
        {
          id: 'account-1',
          email: 'test@example.com',
          displayName: 'Test',
          provider: 'custom',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      mockEmailAPI.getAccounts.mockResolvedValue(mockAccounts);

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        await result.current.loadAccounts();
      });

      expect(mockEmailAPI.getAccounts).toHaveBeenCalled();
      expect(mockStore.setLoadingAccounts).toHaveBeenCalledWith(true);
      expect(mockStore.setAccounts).toHaveBeenCalled();
      expect(mockStore.setLoadingAccounts).toHaveBeenCalledWith(false);
    });

    it('should handle load errors', async () => {
      mockEmailAPI.getAccounts.mockRejectedValue(new Error('Failed to load'));

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        await result.current.loadAccounts();
      });

      expect(mockStore.setError).toHaveBeenCalled();
      expect(mockStore.setLoadingAccounts).toHaveBeenCalledWith(false);
    });
  });

  describe('createAccount', () => {
    it('should create account', async () => {
      const input = {
        email: 'new@example.com',
        displayName: 'New Account',
        type: 'imap' as const,
        imapConfig: {
          host: 'imap.example.com',
          port: 993,
          tls: true,
          username: 'new@example.com',
          password: 'password',
        },
        smtpConfig: {
          host: 'smtp.example.com',
          port: 465,
          tls: true,
          username: 'new@example.com',
          password: 'password',
        },
      };

      const mockResult = {
        id: 'account-1',
        email: 'new@example.com',
        displayName: 'New Account',
        provider: 'custom',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockEmailAPI.addAccount.mockResolvedValue(mockResult);
      mockEmailAPI.getAccounts.mockResolvedValue([mockResult]);

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        const created = await result.current.createAccount(input);
        expect(created).toBeDefined();
      });

      expect(mockEmailAPI.addAccount).toHaveBeenCalled();
      expect(mockStore.setSaving).toHaveBeenCalledWith(true);
      expect(mockEmailAPI.getAccounts).toHaveBeenCalled(); // Reloads accounts
      expect(mockStore.setSaving).toHaveBeenCalledWith(false);
    });

    it('should handle create errors', async () => {
      mockEmailAPI.addAccount.mockRejectedValue(new Error('Failed to create'));

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        const created = await result.current.createAccount({
          email: 'test@example.com',
          displayName: 'Test',
          type: 'imap' as const,
          imapConfig: {
            host: 'imap.example.com',
            port: 993,
            tls: true,
            username: 'test@example.com',
            password: 'password',
          },
          smtpConfig: {
            host: 'smtp.example.com',
            port: 465,
            tls: true,
            username: 'test@example.com',
            password: 'password',
          },
        });
        expect(created).toBeNull();
      });

      expect(mockStore.setError).toHaveBeenCalled();
      expect(mockStore.setSaving).toHaveBeenCalledWith(false);
    });
  });

  describe('loadMessages', () => {
    it('should load messages', async () => {
      mockStore.selectedAccountId = 'account-1';
      mockStore.selectedFolderId = 'inbox';
      mockEmailAPI.fetchMessages.mockResolvedValue([]);

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        await result.current.loadMessages('account-1', 'inbox');
      });

      expect(mockEmailAPI.fetchMessages).toHaveBeenCalledWith('account-1', 'inbox');
      expect(mockStore.setLoadingMessages).toHaveBeenCalledWith(true);
      expect(mockStore.setMessages).toHaveBeenCalled();
      expect(mockStore.setLoadingMessages).toHaveBeenCalledWith(false);
    });

    it('should handle load errors', async () => {
      mockEmailAPI.fetchMessages.mockRejectedValue(new Error('Failed to load'));

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        await result.current.loadMessages('account-1');
      });

      expect(mockStore.setError).toHaveBeenCalled();
      expect(mockStore.setLoadingMessages).toHaveBeenCalledWith(false);
    });
  });

  describe('sendEmail', () => {
    it('should send email', async () => {
      const input = {
        accountId: 'account-1',
        to: [{ name: 'Recipient', address: 'recipient@example.com' }],
        subject: 'Test Subject',
        textBody: 'Test Body',
      };

      mockEmailAPI.sendMessage.mockResolvedValue(undefined);

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        const success = await result.current.sendEmail(input);
        expect(success).toBe(true);
      });

      expect(mockEmailAPI.sendMessage).toHaveBeenCalled();
      expect(mockStore.setSaving).toHaveBeenCalledWith(true);
      expect(mockStore.closeComposer).toHaveBeenCalled();
      expect(mockStore.setSaving).toHaveBeenCalledWith(false);
    });

    it('should handle send errors', async () => {
      mockEmailAPI.sendMessage.mockRejectedValue(new Error('Failed to send'));

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        const success = await result.current.sendEmail({
          accountId: 'account-1',
          to: [],
          subject: 'Test',
          textBody: 'Test',
        });
        expect(success).toBe(false);
      });

      expect(mockStore.setError).toHaveBeenCalled();
      expect(mockStore.setSaving).toHaveBeenCalledWith(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      // Set up a message in the store for markAsRead to find
      mockStore.messages = [
        {
          id: 'msg-1',
          accountId: 'account-1',
          familyId: 'family-1',
          uid: 1234,
          messageId: 'msg-id-1',
          threadId: 'thread-1',
          folder: 'INBOX',
          from: { address: 'test@example.com' },
          to: [],
          subject: 'Test',
          date: Date.now(),
          size: 1024,
          snippet: 'Test message',
          read: false,
          starred: false,
          draft: false,
          attachments: [],
        },
      ];
      mockEmailAPI.markAsRead.mockResolvedValue(undefined);

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        const success = await result.current.markAsRead('msg-1', true);
        expect(success).toBe(true);
      });

      // markAsRead calls API with accountId, uid, read
      expect(mockEmailAPI.markAsRead).toHaveBeenCalledWith('account-1', 1234, true);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message', async () => {
      // Set up a message in the store for deleteMessage to find
      mockStore.messages = [
        {
          id: 'msg-1',
          accountId: 'account-1',
          familyId: 'family-1',
          uid: 1234,
          messageId: 'msg-id-1',
          threadId: 'thread-1',
          folder: 'INBOX',
          from: { address: 'test@example.com' },
          to: [],
          subject: 'Test',
          date: Date.now(),
          size: 1024,
          snippet: 'Test message',
          read: false,
          starred: false,
          draft: false,
          attachments: [],
        },
      ];
      mockEmailAPI.deleteMessage.mockResolvedValue(undefined);

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        const success = await result.current.deleteMessage('msg-1');
        expect(success).toBe(true);
      });

      // deleteMessage calls API with accountId, uid, folder
      expect(mockEmailAPI.deleteMessage).toHaveBeenCalledWith('account-1', 1234, 'INBOX');
    });
  });

  describe('loadFolders', () => {
    it('should load folders', async () => {
      mockEmailAPI.getFolders.mockResolvedValue([]);

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        await result.current.loadFolders('account-1');
      });

      expect(mockEmailAPI.getFolders).toHaveBeenCalledWith('account-1');
      expect(mockStore.setLoadingFolders).toHaveBeenCalledWith(true);
      expect(mockStore.setFolders).toHaveBeenCalled();
      expect(mockStore.setLoadingFolders).toHaveBeenCalledWith(false);
    });
  });

  describe('loadConversations', () => {
    it('should load conversations', async () => {
      const { result } = renderHook(() => useEmail());

      await act(async () => {
        await result.current.loadConversations();
      });

      // Current implementation is a stub that doesn't call API
      // but it does set loading states and conversations
      expect(mockStore.setLoadingConversations).toHaveBeenCalledWith(true);
      expect(mockStore.setConversations).toHaveBeenCalledWith([]);
      expect(mockStore.setLoadingConversations).toHaveBeenCalledWith(false);
    });
  });

  describe('sendInternalMessage', () => {
    it('should send internal message', async () => {
      const input = {
        conversationId: 'conv-1',
        content: 'Test message',
      };

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        const success = await result.current.sendInternalMessage(input);
        expect(success).toBe(true);
      });

      // Current implementation is a stub - just sets saving state
      expect(mockStore.setSaving).toHaveBeenCalledWith(true);
      expect(mockStore.setSaving).toHaveBeenCalledWith(false);
    });
  });

  describe('syncAccount', () => {
    it('should sync account', async () => {
      // syncAccount calls loadMessages internally
      mockEmailAPI.fetchMessages.mockResolvedValue([]);

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        const success = await result.current.syncAccount('account-1');
        expect(success).toBe(true);
      });

      // syncAccount sets syncing state and calls loadMessages
      expect(mockStore.setSyncing).toHaveBeenCalledWith(true);
      expect(mockStore.setSyncing).toHaveBeenCalledWith(false);
    });
  });

  describe('composer', () => {
    it('should open composer', () => {
      const { result } = renderHook(() => useEmail());

      act(() => {
        result.current.openComposer();
      });

      expect(mockStore.openComposer).toHaveBeenCalled();
    });

    it('should close composer', () => {
      const { result } = renderHook(() => useEmail());

      act(() => {
        result.current.closeComposer();
      });

      expect(mockStore.closeComposer).toHaveBeenCalled();
    });
  });

  describe('filters', () => {
    it('should set filter', () => {
      const { result } = renderHook(() => useEmail());

      act(() => {
        result.current.setFilter({ read: false });
      });

      expect(mockStore.setFilter).toHaveBeenCalledWith({ read: false });
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useEmail());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockStore.clearFilters).toHaveBeenCalled();
    });

    it('should set search query', () => {
      const { result } = renderHook(() => useEmail());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(mockStore.setSearchQuery).toHaveBeenCalledWith('test query');
    });
  });

  describe('computed values', () => {
    it('should return filtered messages', () => {
      mockStore.getFilteredMessages.mockReturnValue([
        {
          id: 'msg-1',
          accountId: 'account-1',
          familyId: 'family-1',
          uid: 1,
          messageId: '<msg-1@example.com>',
          threadId: 'thread-1',
          folder: 'inbox',
          from: { name: 'Sender', address: 'sender@example.com' },
          to: [{ name: 'Recipient', address: 'recipient@example.com' }],
          subject: 'Test',
          snippet: 'Test',
          date: Date.now(),
          size: 1000,
          read: false,
          starred: false,
          draft: false,
          labels: [],
          attachments: [],
          flags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      const { result } = renderHook(() => useEmail());

      expect(result.current.filteredMessages).toHaveLength(1);
    });

    it('should return unread count', () => {
      mockStore.getUnreadCount.mockReturnValue(5);

      const { result } = renderHook(() => useEmail());

      expect(result.current.unreadCount).toBe(5);
    });
  });

  describe('loads accounts on mount', () => {
    it('should load accounts on mount', async () => {
      mockEmailAPI.getAccounts.mockResolvedValue([]);

      renderHook(() => useEmail());

      await waitFor(() => {
        expect(mockEmailAPI.getAccounts).toHaveBeenCalled();
      });
    });
  });
});
