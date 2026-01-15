/**
 * useEmail Hook - Main hook for email operations
 * Follows pattern from useCalendar.ts
 */

/* eslint-disable @typescript-eslint/no-base-to-string -- API response mapping with fallbacks */

import { useCallback, useEffect, useRef } from 'react';

import { getEmailAPI } from '@/shared/utils/electronAPI';

import { useEmailStore } from '../stores/email.store';

import type {
  EmailAccount,
  EmailMessage,
  EmailFolder,
  Conversation,
  InternalMessage,
  CreateAccountInput,
  UpdateAccountInput,
  SendEmailInput,
  CreateConversationInput,
  SendInternalMessageInput,
  EmailView,
  MessageListView,
  EmailFilter,
  EmailSort,
  ThreadInfo,
} from '../types/Email.types';

interface UseEmailReturn {
  // ============================================================================
  // State - Email Accounts
  // ============================================================================
  accounts: EmailAccount[];
  selectedAccountId: string | null;
  selectedAccount: EmailAccount | undefined;
  isLoadingAccounts: boolean;

  // ============================================================================
  // State - Messages
  // ============================================================================
  messages: EmailMessage[];
  threads: ThreadInfo[];
  filteredMessages: EmailMessage[];
  filteredThreads: ThreadInfo[];
  selectedMessageId: string | null;
  selectedMessage: EmailMessage | undefined;
  setSelectedMessageId: (id: string | null) => void;
  isLoadingMessages: boolean;
  unreadCount: number;

  // ============================================================================
  // State - Folders
  // ============================================================================
  folders: EmailFolder[];
  selectedFolderId: string | null;
  selectedFolder: EmailFolder | undefined;
  currentView: EmailView;
  isLoadingFolders: boolean;

  // ============================================================================
  // State - Internal Messaging
  // ============================================================================
  conversations: Conversation[];
  internalMessages: InternalMessage[];
  selectedConversationId: string | null;
  selectedConversation: Conversation | undefined;
  conversationMessages: InternalMessage[];
  isLoadingConversations: boolean;
  isLoadingInternalMessages: boolean;

  // ============================================================================
  // State - UI & Filters
  // ============================================================================
  messageListView: MessageListView;
  filter: EmailFilter;
  sort: EmailSort;
  searchQuery: string;
  isComposerOpen: boolean;
  isSaving: boolean;
  isSyncing: boolean;
  error: string | null;

  // ============================================================================
  // Actions - Email Accounts
  // ============================================================================
  loadAccounts: () => Promise<void>;
  createAccount: (input: CreateAccountInput) => Promise<EmailAccount | null>;
  updateAccount: (input: UpdateAccountInput) => Promise<EmailAccount | null>;
  deleteAccount: (accountId: string) => Promise<boolean>;
  setSelectedAccountId: (accountId: string | null) => void;

  // ============================================================================
  // Actions - Messages
  // ============================================================================
  loadMessages: (accountId: string, folder?: string) => Promise<void>;
  sendEmail: (input: SendEmailInput) => Promise<boolean>;
  markAsRead: (messageId: string, read: boolean) => Promise<boolean>;
  markAsStarred: (messageId: string, starred: boolean) => Promise<boolean>;
  moveMessage: (messageId: string, targetFolder: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;

  // ============================================================================
  // Actions - Folders
  // ============================================================================
  loadFolders: (accountId: string) => Promise<void>;
  setCurrentView: (view: EmailView) => void;
  setSelectedFolderId: (folderId: string | null) => void;

  // ============================================================================
  // Actions - Internal Messaging
  // ============================================================================
  loadConversations: () => Promise<void>;
  loadInternalMessages: (conversationId: string) => Promise<void>;
  createConversation: (input: CreateConversationInput) => Promise<Conversation | null>;
  sendInternalMessage: (input: SendInternalMessageInput) => Promise<boolean>;

  // ============================================================================
  // Actions - UI & Filters
  // ============================================================================
  setMessageListView: (view: MessageListView) => void;
  setFilter: (filter: Partial<EmailFilter>) => void;
  setSort: (sort: EmailSort) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  openComposer: (mode?: 'new' | 'reply' | 'forward', message?: EmailMessage) => void;
  closeComposer: () => void;

  // ============================================================================
  // Actions - Account Management
  // ============================================================================
  openAccountSettings: (account?: EmailAccount) => void;
  closeAccountSettings: () => void;
  syncAccount: (accountId: string) => Promise<boolean>;

  // ============================================================================
  // Helpers
  // ============================================================================
  clearError: () => void;
}

export function useEmail(): UseEmailReturn {
  // ============================================================================
  // Store Selectors
  // ============================================================================
  const accounts: EmailAccount[] = useEmailStore((state) => state.accounts);
  const selectedAccountId: string | null = useEmailStore((state) => state.selectedAccountId);
  const isLoadingAccounts: boolean = useEmailStore((state) => state.isLoadingAccounts);

  const messages: EmailMessage[] = useEmailStore((state) => state.messages);
  const threads: ThreadInfo[] = useEmailStore((state) => state.threads);
  const selectedMessageId: string | null = useEmailStore((state) => state.selectedMessageId);
  const isLoadingMessages: boolean = useEmailStore((state) => state.isLoadingMessages);

  const folders: EmailFolder[] = useEmailStore((state) => state.folders);
  const selectedFolderId: string | null = useEmailStore((state) => state.selectedFolderId);
  const currentView: EmailView = useEmailStore((state) => state.currentView);
  const isLoadingFolders: boolean = useEmailStore((state) => state.isLoadingFolders);

  const conversations: Conversation[] = useEmailStore((state) => state.conversations);
  const internalMessages: InternalMessage[] = useEmailStore((state) => state.internalMessages);
  const selectedConversationId: string | null = useEmailStore(
    (state) => state.selectedConversationId
  );
  const isLoadingConversations: boolean = useEmailStore((state) => state.isLoadingConversations);
  const isLoadingInternalMessages: boolean = useEmailStore(
    (state) => state.isLoadingInternalMessages
  );

  const messageListView: MessageListView = useEmailStore((state) => state.messageListView);
  const filter: EmailFilter = useEmailStore((state) => state.filter);
  const sort: EmailSort = useEmailStore((state) => state.sort);
  const searchQuery: string = useEmailStore((state) => state.searchQuery);
  const isComposerOpen: boolean = useEmailStore((state) => state.isComposerOpen);
  const isSaving: boolean = useEmailStore((state) => state.isSaving);
  const isSyncing: boolean = useEmailStore((state) => state.isSyncing);
  const error: string | null = useEmailStore((state) => state.error);

  // ============================================================================
  // Store Actions
  // ============================================================================
  const setAccounts: (accounts: EmailAccount[]) => void = useEmailStore(
    (state) => state.setAccounts
  );
  const storeSetSelectedAccountId: (id: string | null) => void = useEmailStore(
    (state) => state.setSelectedAccountId
  );
  const setLoadingAccounts: (loading: boolean) => void = useEmailStore(
    (state) => state.setLoadingAccounts
  );

  const setMessages: (messages: EmailMessage[]) => void = useEmailStore(
    (state) => state.setMessages
  );
  const storeSetSelectedMessageId: (id: string | null) => void = useEmailStore(
    (state) => state.setSelectedMessageId
  );
  const setLoadingMessages: (loading: boolean) => void = useEmailStore(
    (state) => state.setLoadingMessages
  );

  const setFolders: (folders: EmailFolder[]) => void = useEmailStore((state) => state.setFolders);
  const storeSetSelectedFolderId: (id: string | null) => void = useEmailStore(
    (state) => state.setSelectedFolderId
  );
  const storeSetCurrentView: (view: EmailView) => void = useEmailStore(
    (state) => state.setCurrentView
  );
  const setLoadingFolders: (loading: boolean) => void = useEmailStore(
    (state) => state.setLoadingFolders
  );

  const setConversations: (conversations: Conversation[]) => void = useEmailStore(
    (state) => state.setConversations
  );
  const setInternalMessages: (messages: InternalMessage[]) => void = useEmailStore(
    (state) => state.setInternalMessages
  );
  const setLoadingConversations: (loading: boolean) => void = useEmailStore(
    (state) => state.setLoadingConversations
  );
  const setLoadingInternalMessages: (loading: boolean) => void = useEmailStore(
    (state) => state.setLoadingInternalMessages
  );

  const storeSetMessageListView: (view: MessageListView) => void = useEmailStore(
    (state) => state.setMessageListView
  );
  const storeSetFilter: (filter: Partial<EmailFilter>) => void = useEmailStore(
    (state) => state.setFilter
  );
  const storeSetSort: (sort: EmailSort) => void = useEmailStore((state) => state.setSort);
  const storeSetSearchQuery: (query: string) => void = useEmailStore(
    (state) => state.setSearchQuery
  );
  const storeClearFilters: () => void = useEmailStore((state) => state.clearFilters);
  const storeOpenComposer: (
    mode?: 'new' | 'reply' | 'forward',
    message?: EmailMessage | null
  ) => void = useEmailStore((state) => state.openComposer);
  const storeCloseComposer: () => void = useEmailStore((state) => state.closeComposer);
  const storeOpenAccountSettings: (account?: EmailAccount | null) => void = useEmailStore(
    (state) => state.openAccountSettings
  );
  const storeCloseAccountSettings: () => void = useEmailStore(
    (state) => state.closeAccountSettings
  );

  const setSaving: (saving: boolean) => void = useEmailStore((state) => state.setSaving);
  const setSyncing: (syncing: boolean) => void = useEmailStore((state) => state.setSyncing);
  const setError: (error: string | null) => void = useEmailStore((state) => state.setError);

  const getAccountById: (id: string) => EmailAccount | undefined = useEmailStore(
    (state) => state.getAccountById
  );
  const getMessageById: (id: string) => EmailMessage | undefined = useEmailStore(
    (state) => state.getMessageById
  );
  const getFolderById: (id: string) => EmailFolder | undefined = useEmailStore(
    (state) => state.getFolderById
  );
  const getConversationById: (id: string) => Conversation | undefined = useEmailStore(
    (state) => state.getConversationById
  );
  const getFilteredMessages: () => EmailMessage[] = useEmailStore(
    (state) => state.getFilteredMessages
  );
  const getFilteredThreads: () => ThreadInfo[] = useEmailStore((state) => state.getFilteredThreads);
  const getUnreadCount: (accountId?: string) => number = useEmailStore(
    (state) => state.getUnreadCount
  );
  const getMessagesByConversation: (conversationId: string) => InternalMessage[] = useEmailStore(
    (state) => state.getMessagesByConversation
  );

  const hasLoadedRef = useRef(false);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const selectedAccount = selectedAccountId ? getAccountById(selectedAccountId) : undefined;
  const selectedMessage = selectedMessageId ? getMessageById(selectedMessageId) : undefined;
  const selectedFolder = selectedFolderId ? getFolderById(selectedFolderId) : undefined;
  const selectedConversation = selectedConversationId
    ? getConversationById(selectedConversationId)
    : undefined;
  const filteredMessages = getFilteredMessages();
  const filteredThreads = getFilteredThreads();
  const unreadCount = getUnreadCount(selectedAccountId ?? undefined);
  const conversationMessages = selectedConversationId
    ? getMessagesByConversation(selectedConversationId)
    : [];

  // ============================================================================
  // Email Account Operations
  // ============================================================================
  const loadAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      setError(null);

      const emailAPI = getEmailAPI();
      const result = await emailAPI.getAccounts();
      setAccounts(result as EmailAccount[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load email accounts';
      setError(message);
      console.error('Failed to load email accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, [setLoadingAccounts, setError, setAccounts]);

  const createAccount = useCallback(
    async (input: CreateAccountInput): Promise<EmailAccount | null> => {
      try {
        setSaving(true);
        setError(null);

        const emailAPI = getEmailAPI();
        const result = await emailAPI.addAccount(input);
        await loadAccounts();

        return result as EmailAccount | null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create email account';
        setError(message);
        console.error('Failed to create email account:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadAccounts]
  );

  const updateAccount = useCallback(
    async (input: UpdateAccountInput): Promise<EmailAccount | null> => {
      try {
        setSaving(true);
        setError(null);

        // TODO: Implement updateAccount IPC
        // const emailAPI = getEmailAPI();
        // await emailAPI.updateAccount(input);
        await loadAccounts();

        return getAccountById(input.id) ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update email account';
        setError(message);
        console.error('Failed to update email account:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadAccounts, getAccountById]
  );

  const deleteAccount = useCallback(
    async (accountId: string): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        const emailAPI = getEmailAPI();
        await emailAPI.removeAccount(accountId);
        await loadAccounts();

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete email account';
        setError(message);
        console.error('Failed to delete email account:', err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, loadAccounts]
  );

  // ============================================================================
  // Email Message Operations
  // ============================================================================
  const loadMessages = useCallback(
    async (accountId: string, folder = 'INBOX'): Promise<void> => {
      try {
        setLoadingMessages(true);
        setError(null);

        const emailAPI = getEmailAPI();
        const result = await emailAPI.fetchMessages(accountId, folder);
        setMessages(result as EmailMessage[]);

        // TODO: Build threads from messages using threading.ts utility
        // const threadsResult = buildThreads(result);
        // setThreads(threadsResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load messages';
        setError(message);
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [setLoadingMessages, setError, setMessages]
  );

  const syncAccount = useCallback(
    async (accountId: string): Promise<boolean> => {
      try {
        setSyncing(true);
        setError(null);

        // Trigger background sync
        const folder = selectedFolder?.path ?? 'INBOX';
        await loadMessages(accountId, folder);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync email account';
        setError(message);
        console.error('Failed to sync email account:', err);
        return false;
      } finally {
        setSyncing(false);
      }
    },
    [setSyncing, setError, selectedFolder, loadMessages]
  );

  const sendEmail = useCallback(
    async (input: SendEmailInput): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        const emailAPI = getEmailAPI();
        await emailAPI.sendMessage(input.accountId, input);
        storeCloseComposer();

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send email';
        setError(message);
        console.error('Failed to send email:', err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError, storeCloseComposer]
  );

  const markAsRead = useCallback(
    async (messageId: string, read: boolean): Promise<boolean> => {
      try {
        // Update local state optimistically first
        const updatedMessages = messages.map((m) => (m.id === messageId ? { ...m, read } : m));
        setMessages(updatedMessages);

        // Find the message to get account and folder info
        const msg = messages.find((m) => m.id === messageId);
        if (msg) {
          const emailAPI = getEmailAPI();
          await emailAPI.markAsRead(msg.accountId, msg.uid, read);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update message';
        setError(message);
        console.error('Failed to mark message as read:', err);
        return false;
      }
    },
    [messages, setMessages, setError]
  );

  const markAsStarred = useCallback(
    async (messageId: string, starred: boolean): Promise<boolean> => {
      try {
        // Update local state optimistically first
        const updatedMessages = messages.map((m) => (m.id === messageId ? { ...m, starred } : m));
        setMessages(updatedMessages);

        // Find the message to get account info
        const msg = messages.find((m) => m.id === messageId);
        if (msg) {
          const emailAPI = getEmailAPI();
          await emailAPI.markAsStarred(msg.accountId, msg.uid, starred);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update message';
        setError(message);
        console.error('Failed to mark message as starred:', err);
        return false;
      }
    },
    [messages, setMessages, setError]
  );

  const moveMessage = useCallback(
    async (messageId: string, targetFolder: string): Promise<boolean> => {
      try {
        // Find the message to get account and folder info
        const msg = messages.find((m) => m.id === messageId);
        if (!msg) {
          return false;
        }

        // Remove from current view optimistically
        const updatedMessages = messages.filter((m) => m.id !== messageId);
        setMessages(updatedMessages);

        // Call IPC to move message
        const emailAPI = getEmailAPI();
        await emailAPI.moveMessage(msg.accountId, msg.uid, msg.folder, targetFolder);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to move message';
        setError(message);
        console.error('Failed to move message:', err);
        return false;
      }
    },
    [messages, setMessages, setError]
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      try {
        // Find the message to get account and folder info
        const msg = messages.find((m) => m.id === messageId);
        if (!msg) {
          return false;
        }

        // Remove from local state optimistically
        const updatedMessages = messages.filter((m) => m.id !== messageId);
        setMessages(updatedMessages);

        // Call IPC to delete message
        const emailAPI = getEmailAPI();
        await emailAPI.deleteMessage(msg.accountId, msg.uid, msg.folder);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete message';
        setError(message);
        console.error('Failed to delete message:', err);
        return false;
      }
    },
    [messages, setMessages, setError]
  );

  // ============================================================================
  // Folder Operations
  // ============================================================================
  const loadFolders = useCallback(
    async (accountId: string): Promise<void> => {
      try {
        setLoadingFolders(true);
        setError(null);

        const emailAPI = getEmailAPI();
        const result = await emailAPI.getFolders(accountId);

        // Transform result to EmailFolder[] with proper typing
        const folders: EmailFolder[] = (result as Array<Record<string, unknown>>).map((folder) => {
          const base = {
            id: String(folder['path'] ?? ''),
            accountId,
            path: String(folder['path'] ?? ''),
            name: String(folder['name'] ?? ''),
            type: (folder['type'] as EmailFolder['type']) ?? 'custom',
            totalMessages: Number(folder['totalMessages'] ?? 0),
            unreadMessages: Number(folder['unreadMessages'] ?? 0),
            selectable: Boolean(folder['selectable'] ?? true),
          };

          // Only add parent if it exists (exactOptionalPropertyTypes)
          if (folder['parent']) {
            return { ...base, parent: String(folder['parent']) };
          }
          return base;
        });

        setFolders(folders);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load folders';
        setError(message);
        console.error('Failed to load folders:', err);
      } finally {
        setLoadingFolders(false);
      }
    },
    [setLoadingFolders, setError, setFolders]
  );

  // ============================================================================
  // Internal Messaging Operations
  // ============================================================================
  const loadConversations = useCallback(async (): Promise<void> => {
    try {
      setLoadingConversations(true);
      setError(null);

      // TODO: Implement getConversations IPC
      // const result = await window.electronAPI.email.getConversations();
      // setConversations(result);

      // Temporary mock - await to satisfy async requirement
      await Promise.resolve();
      setConversations([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(message);
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [setLoadingConversations, setError, setConversations]);

  const loadInternalMessages = useCallback(
    async (_conversationId: string): Promise<void> => {
      try {
        setLoadingInternalMessages(true);
        setError(null);

        // TODO: Implement getInternalMessages IPC
        // const result = await window.electronAPI.email.getInternalMessages(_conversationId);
        // setInternalMessages(result);

        // Temporary mock - await to satisfy async requirement
        await Promise.resolve();
        setInternalMessages([]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load messages';
        setError(message);
        console.error('Failed to load internal messages:', err);
      } finally {
        setLoadingInternalMessages(false);
      }
    },
    [setLoadingInternalMessages, setError, setInternalMessages]
  );

  const createConversation = useCallback(
    (_input: CreateConversationInput): Promise<Conversation | null> => {
      try {
        setSaving(true);
        setError(null);

        // TODO: Implement createConversation IPC
        // const result = await window.electronAPI.email.createConversation(_input);
        // await loadConversations();

        return Promise.resolve(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create conversation';
        setError(message);
        console.error('Failed to create conversation:', err);
        return Promise.resolve(null);
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError]
  );

  const sendInternalMessage = useCallback(
    (_input: SendInternalMessageInput): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        // TODO: Implement sendInternalMessage IPC
        // await window.electronAPI.email.sendInternalMessage(_input);
        // await loadInternalMessages(_input.conversationId);

        return Promise.resolve(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        console.error('Failed to send internal message:', err);
        return Promise.resolve(false);
      } finally {
        setSaving(false);
      }
    },
    [setSaving, setError]
  );

  // ============================================================================
  // Initial Load
  // ============================================================================
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      void loadAccounts();
    }
  }, [loadAccounts]);

  // Load folders when account changes
  useEffect(() => {
    if (selectedAccountId) {
      void loadFolders(selectedAccountId);
    }
  }, [selectedAccountId, loadFolders]);

  // Load messages when account/folder changes
  useEffect(() => {
    if (selectedAccountId && selectedFolder) {
      void loadMessages(selectedAccountId, selectedFolder.path);
    }
  }, [selectedAccountId, selectedFolder, loadMessages]);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================
  return {
    // State - Email Accounts
    accounts,
    selectedAccountId,
    selectedAccount,
    isLoadingAccounts,

    // State - Messages
    messages,
    threads,
    filteredMessages,
    filteredThreads,
    selectedMessageId,
    selectedMessage,
    isLoadingMessages,
    unreadCount,

    // State - Folders
    folders,
    selectedFolderId,
    selectedFolder,
    currentView,
    isLoadingFolders,

    // State - Internal Messaging
    conversations,
    internalMessages,
    selectedConversationId,
    selectedConversation,
    conversationMessages,
    isLoadingConversations,
    isLoadingInternalMessages,

    // State - UI & Filters
    messageListView,
    filter,
    sort,
    searchQuery,
    isComposerOpen,
    isSaving,
    isSyncing,
    error,

    // Actions - Email Accounts
    loadAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    setSelectedAccountId: storeSetSelectedAccountId,

    // Actions - Messages
    loadMessages,
    sendEmail,
    markAsRead,
    markAsStarred,
    moveMessage,
    deleteMessage,
    setSelectedMessageId: storeSetSelectedMessageId,

    // Actions - Folders
    loadFolders,
    setCurrentView: storeSetCurrentView,
    setSelectedFolderId: storeSetSelectedFolderId,

    // Actions - Internal Messaging
    loadConversations,
    loadInternalMessages,
    createConversation,
    sendInternalMessage,

    // Actions - UI & Filters
    setMessageListView: storeSetMessageListView,
    setFilter: storeSetFilter,
    setSort: storeSetSort,
    setSearchQuery: storeSetSearchQuery,
    clearFilters: storeClearFilters,
    openComposer: storeOpenComposer,
    closeComposer: storeCloseComposer,

    // Actions - Account Management
    openAccountSettings: storeOpenAccountSettings,
    closeAccountSettings: storeCloseAccountSettings,
    syncAccount,

    // Helpers
    clearError: () => setError(null),
  };
}
