/**
 * Email Store - Zustand state management for email module
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type {
  EmailAccount,
  EmailMessage,
  EmailFolder,
  Conversation,
  InternalMessage,
  ThreadInfo,
  EmailView,
  MessageListView,
  ComposerMode,
  EmailFilter,
  EmailSort,
} from '../types/Email.types';

interface EmailStore {
  // ============================================================================
  // State - Email Accounts
  // ============================================================================
  accounts: EmailAccount[];
  selectedAccountId: string | null;
  isLoadingAccounts: boolean;

  // ============================================================================
  // State - Messages
  // ============================================================================
  messages: EmailMessage[];
  threads: ThreadInfo[];
  expandedThreads: Set<string>; // Thread IDs that are expanded
  selectedMessageId: string | null;
  selectedThreadId: string | null;
  isLoadingMessages: boolean;

  // ============================================================================
  // State - Folders
  // ============================================================================
  folders: EmailFolder[];
  selectedFolderId: string | null;
  currentView: EmailView;
  isLoadingFolders: boolean;

  // ============================================================================
  // State - Internal Messaging
  // ============================================================================
  conversations: Conversation[];
  internalMessages: InternalMessage[];
  selectedConversationId: string | null;
  isLoadingConversations: boolean;
  isLoadingInternalMessages: boolean;

  // ============================================================================
  // State - UI & Filters
  // ============================================================================
  messageListView: MessageListView;
  filter: EmailFilter;
  sort: EmailSort;
  searchQuery: string;

  // ============================================================================
  // State - Composer
  // ============================================================================
  isComposerOpen: boolean;
  composerMode: ComposerMode;
  draftMessage: EmailMessage | null;
  replyToMessage: EmailMessage | null;

  // ============================================================================
  // State - Loading & Errors
  // ============================================================================
  isSaving: boolean;
  isSyncing: boolean;
  error: string | null;

  // ============================================================================
  // State - Dialogs
  // ============================================================================
  isAccountSettingsOpen: boolean;
  editingAccount: EmailAccount | null;
  isShareDialogOpen: boolean;
  sharingAccount: EmailAccount | null;

  // ============================================================================
  // Actions - Accounts
  // ============================================================================
  setAccounts: (accounts: EmailAccount[]) => void;
  setSelectedAccountId: (id: string | null) => void;
  setLoadingAccounts: (loading: boolean) => void;

  // ============================================================================
  // Actions - Messages
  // ============================================================================
  setMessages: (messages: EmailMessage[]) => void;
  setThreads: (threads: ThreadInfo[]) => void;
  toggleThreadExpansion: (threadId: string) => void;
  setSelectedMessageId: (id: string | null) => void;
  setSelectedThreadId: (id: string | null) => void;
  setLoadingMessages: (loading: boolean) => void;

  // ============================================================================
  // Actions - Folders
  // ============================================================================
  setFolders: (folders: EmailFolder[]) => void;
  setSelectedFolderId: (id: string | null) => void;
  setCurrentView: (view: EmailView) => void;
  setLoadingFolders: (loading: boolean) => void;

  // ============================================================================
  // Actions - Internal Messaging
  // ============================================================================
  setConversations: (conversations: Conversation[]) => void;
  setInternalMessages: (messages: InternalMessage[]) => void;
  setSelectedConversationId: (id: string | null) => void;
  setLoadingConversations: (loading: boolean) => void;
  setLoadingInternalMessages: (loading: boolean) => void;

  // ============================================================================
  // Actions - UI & Filters
  // ============================================================================
  setMessageListView: (view: MessageListView) => void;
  setFilter: (filter: Partial<EmailFilter>) => void;
  setSort: (sort: EmailSort) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;

  // ============================================================================
  // Actions - Composer
  // ============================================================================
  openComposer: (mode?: ComposerMode, message?: EmailMessage | null) => void;
  closeComposer: () => void;
  setDraftMessage: (message: EmailMessage | null) => void;

  // ============================================================================
  // Actions - Loading & Errors
  // ============================================================================
  setSaving: (saving: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;

  // ============================================================================
  // Actions - Dialogs
  // ============================================================================
  openAccountSettings: (account?: EmailAccount | null) => void;
  closeAccountSettings: () => void;
  openShareDialog: (account: EmailAccount | null) => void;
  closeShareDialog: () => void;

  // ============================================================================
  // Computed Helpers - Accounts
  // ============================================================================
  getAccountById: (id: string) => EmailAccount | undefined;
  getSelectedAccount: () => EmailAccount | undefined;

  // ============================================================================
  // Computed Helpers - Messages
  // ============================================================================
  getMessageById: (id: string) => EmailMessage | undefined;
  getThreadById: (id: string) => ThreadInfo | undefined;
  getFilteredMessages: () => EmailMessage[];
  getFilteredThreads: () => ThreadInfo[];
  getUnreadCount: (accountId?: string) => number;

  // ============================================================================
  // Computed Helpers - Folders
  // ============================================================================
  getFolderById: (id: string) => EmailFolder | undefined;
  getSelectedFolder: () => EmailFolder | undefined;
  getFoldersByAccount: (accountId: string) => EmailFolder[];

  // ============================================================================
  // Computed Helpers - Internal Messaging
  // ============================================================================
  getConversationById: (id: string) => Conversation | undefined;
  getMessagesByConversation: (conversationId: string) => InternalMessage[];
  getUnreadConversations: () => Conversation[];

  // ============================================================================
  // Reset
  // ============================================================================
  reset: () => void;
}

const initialState = {
  // Accounts
  accounts: [],
  selectedAccountId: null,
  isLoadingAccounts: false,

  // Messages
  messages: [],
  threads: [],
  expandedThreads: new Set<string>(),
  selectedMessageId: null,
  selectedThreadId: null,
  isLoadingMessages: false,

  // Folders
  folders: [],
  selectedFolderId: null,
  currentView: 'inbox' as EmailView,
  isLoadingFolders: false,

  // Internal Messaging
  conversations: [],
  internalMessages: [],
  selectedConversationId: null,
  isLoadingConversations: false,
  isLoadingInternalMessages: false,

  // UI & Filters
  messageListView: 'thread' as MessageListView,
  filter: {},
  sort: { field: 'date' as const, order: 'desc' as const },
  searchQuery: '',

  // Composer
  isComposerOpen: false,
  composerMode: 'new' as ComposerMode,
  draftMessage: null,
  replyToMessage: null,

  // Loading & Errors
  isSaving: false,
  isSyncing: false,
  error: null,

  // Dialogs
  isAccountSettingsOpen: false,
  editingAccount: null,
  isShareDialogOpen: false,
  sharingAccount: null,
};

export const useEmailStore = create<EmailStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ============================================================================
    // Action Implementations - Accounts
    // ============================================================================
    setAccounts: (accounts) => set({ accounts }),
    setSelectedAccountId: (selectedAccountId) => set({ selectedAccountId }),
    setLoadingAccounts: (isLoadingAccounts) => set({ isLoadingAccounts }),

    // ============================================================================
    // Action Implementations - Messages
    // ============================================================================
    setMessages: (messages) => set({ messages }),
    setThreads: (threads) => set({ threads }),
    toggleThreadExpansion: (threadId) =>
      set((state) => {
        const expandedThreads = new Set(state.expandedThreads);
        if (expandedThreads.has(threadId)) {
          expandedThreads.delete(threadId);
        } else {
          expandedThreads.add(threadId);
        }
        return { expandedThreads };
      }),
    setSelectedMessageId: (selectedMessageId) => set({ selectedMessageId }),
    setSelectedThreadId: (selectedThreadId) => set({ selectedThreadId }),
    setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),

    // ============================================================================
    // Action Implementations - Folders
    // ============================================================================
    setFolders: (folders) => set({ folders }),
    setSelectedFolderId: (selectedFolderId) => set({ selectedFolderId }),
    setCurrentView: (currentView) => set({ currentView }),
    setLoadingFolders: (isLoadingFolders) => set({ isLoadingFolders }),

    // ============================================================================
    // Action Implementations - Internal Messaging
    // ============================================================================
    setConversations: (conversations) => set({ conversations }),
    setInternalMessages: (internalMessages) => set({ internalMessages }),
    setSelectedConversationId: (selectedConversationId) => set({ selectedConversationId }),
    setLoadingConversations: (isLoadingConversations) => set({ isLoadingConversations }),
    setLoadingInternalMessages: (isLoadingInternalMessages) => set({ isLoadingInternalMessages }),

    // ============================================================================
    // Action Implementations - UI & Filters
    // ============================================================================
    setMessageListView: (messageListView) => set({ messageListView }),
    setFilter: (filter) => set((state) => ({ filter: { ...state.filter, ...filter } })),
    setSort: (sort) => set({ sort }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    clearFilters: () => set({ filter: {}, searchQuery: '' }),

    // ============================================================================
    // Action Implementations - Composer
    // ============================================================================
    openComposer: (mode = 'new', message = null) =>
      set({
        isComposerOpen: true,
        composerMode: mode,
        replyToMessage: mode === 'reply' || mode === 'forward' ? message : null,
        draftMessage: mode === 'draft' ? message : null,
      }),
    closeComposer: () =>
      set({
        isComposerOpen: false,
        composerMode: 'new',
        replyToMessage: null,
        draftMessage: null,
      }),
    setDraftMessage: (draftMessage) => set({ draftMessage }),

    // ============================================================================
    // Action Implementations - Loading & Errors
    // ============================================================================
    setSaving: (isSaving) => set({ isSaving }),
    setSyncing: (isSyncing) => set({ isSyncing }),
    setError: (error) => set({ error }),

    // ============================================================================
    // Action Implementations - Dialogs
    // ============================================================================
    openAccountSettings: (account = null) =>
      set({ isAccountSettingsOpen: true, editingAccount: account }),
    closeAccountSettings: () => set({ isAccountSettingsOpen: false, editingAccount: null }),
    openShareDialog: (account) => set({ isShareDialogOpen: true, sharingAccount: account }),
    closeShareDialog: () => set({ isShareDialogOpen: false, sharingAccount: null }),

    // ============================================================================
    // Computed Helper Implementations - Accounts
    // ============================================================================
    getAccountById: (id) => get().accounts.find((a) => a.id === id),
    getSelectedAccount: () => {
      const { selectedAccountId, accounts } = get();
      return accounts.find((a) => a.id === selectedAccountId);
    },

    // ============================================================================
    // Computed Helper Implementations - Messages
    // ============================================================================
    getMessageById: (id) => get().messages.find((m) => m.id === id),
    getThreadById: (id) => get().threads.find((t) => t.threadId === id),
    getFilteredMessages: () => {
      const { messages, filter, sort, searchQuery } = get();
      let filtered = [...messages];

      // Apply filters
      if (filter.read !== undefined) {
        filtered = filtered.filter((m) => m.read === filter.read);
      }
      if (filter.starred !== undefined) {
        filtered = filtered.filter((m) => m.starred === filter.starred);
      }
      if (filter.hasAttachments !== undefined) {
        filtered = filtered.filter((m) => m.attachments.length > 0 === filter.hasAttachments);
      }
      if (filter.labels && filter.labels.length > 0) {
        filtered = filtered.filter((m) => filter.labels?.some((label) => m.labels.includes(label)));
      }
      if (filter.from) {
        const fromFilter = filter.from.toLowerCase();
        filtered = filtered.filter((m) => m.from.address.toLowerCase().includes(fromFilter));
      }
      if (filter.dateRange) {
        const { start, end } = filter.dateRange;
        filtered = filtered.filter((m) => m.date >= start && m.date <= end);
      }

      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.subject.toLowerCase().includes(query) ||
            m.from.address.toLowerCase().includes(query) ||
            m.snippet.toLowerCase().includes(query)
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let comparison = 0;
        switch (sort.field) {
          case 'date':
            comparison = a.date - b.date;
            break;
          case 'sender':
            comparison = a.from.address.localeCompare(b.from.address);
            break;
          case 'subject':
            comparison = a.subject.localeCompare(b.subject);
            break;
          case 'size':
            comparison = a.size - b.size;
            break;
        }
        return sort.order === 'asc' ? comparison : -comparison;
      });

      return filtered;
    },
    getFilteredThreads: () => {
      const { threads, filter, sort, searchQuery } = get();
      let filtered = [...threads];

      // Apply filters (to threads)
      if (filter.read !== undefined) {
        filtered = filtered.filter((t) => (t.unreadCount === 0) !== filter.read);
      }
      if (filter.starred !== undefined) {
        filtered = filtered.filter((t) => t.starred === filter.starred);
      }
      if (filter.hasAttachments !== undefined) {
        filtered = filtered.filter((t) => t.hasAttachments === filter.hasAttachments);
      }
      if (filter.labels && filter.labels.length > 0) {
        filtered = filtered.filter((t) => filter.labels?.some((label) => t.labels.includes(label)));
      }

      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.subject.toLowerCase().includes(query) ||
            t.participants.some((p) => p.address.toLowerCase().includes(query))
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        const comparison = a.latestDate - b.latestDate;
        return sort.order === 'asc' ? comparison : -comparison;
      });

      return filtered;
    },
    getUnreadCount: (accountId) => {
      const { messages } = get();
      return messages.filter((m) => !m.read && (!accountId || m.accountId === accountId)).length;
    },

    // ============================================================================
    // Computed Helper Implementations - Folders
    // ============================================================================
    getFolderById: (id) => get().folders.find((f) => f.id === id),
    getSelectedFolder: () => {
      const { selectedFolderId, folders } = get();
      return folders.find((f) => f.id === selectedFolderId);
    },
    getFoldersByAccount: (accountId) => {
      const { folders } = get();
      return folders.filter((f) => f.accountId === accountId);
    },

    // ============================================================================
    // Computed Helper Implementations - Internal Messaging
    // ============================================================================
    getConversationById: (id) => get().conversations.find((c) => c.id === id),
    getMessagesByConversation: (conversationId) => {
      const { internalMessages } = get();
      return internalMessages.filter((m) => m.conversationId === conversationId);
    },
    getUnreadConversations: () => {
      const { conversations } = get();
      // TODO: Implement proper unread logic based on readStatus
      return conversations.filter((c) => c.lastMessage !== undefined);
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

export const selectAccounts = (state: EmailStore): EmailAccount[] => state.accounts;
export const selectSelectedAccountId = (state: EmailStore): string | null =>
  state.selectedAccountId;
export const selectMessages = (state: EmailStore): EmailMessage[] => state.messages;
export const selectThreads = (state: EmailStore): ThreadInfo[] => state.threads;
export const selectCurrentView = (state: EmailStore): EmailView => state.currentView;
export const selectIsLoadingAccounts = (state: EmailStore): boolean => state.isLoadingAccounts;
export const selectIsLoadingMessages = (state: EmailStore): boolean => state.isLoadingMessages;
export const selectIsSaving = (state: EmailStore): boolean => state.isSaving;
export const selectError = (state: EmailStore): string | null => state.error;
export const selectIsComposerOpen = (state: EmailStore): boolean => state.isComposerOpen;
export const selectComposerMode = (state: EmailStore): ComposerMode => state.composerMode;
export const selectIsAccountSettingsOpen = (state: EmailStore): boolean =>
  state.isAccountSettingsOpen;
export const selectEditingAccount = (state: EmailStore): EmailAccount | null =>
  state.editingAccount;
