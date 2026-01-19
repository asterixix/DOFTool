import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useEmailStore } from './email.store';

import type { EmailAccount, EmailMessage } from '../types/Email.types';

const createAccount = (overrides: Partial<EmailAccount> = {}): EmailAccount => ({
  id: 'account-1',
  familyId: 'family-1',
  ownerId: 'user-1',
  email: 'test@example.com',
  displayName: 'Test',
  type: 'imap',
  sharedWithMembers: [],
  allowedDeviceIds: [],
  status: 'active',
  syncInterval: 15,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('email.store', () => {
  beforeEach(() => {
    const { reset } = useEmailStore.getState();
    act(() => {
      reset();
    });
  });

  describe('initial state', () => {
    it('should have empty accounts array initially', () => {
      const state = useEmailStore.getState();
      expect(state.accounts).toEqual([]);
    });

    it('should have empty messages array initially', () => {
      const state = useEmailStore.getState();
      expect(state.messages).toEqual([]);
    });

    it('should have inbox view initially', () => {
      const state = useEmailStore.getState();
      expect(state.currentView).toBe('inbox');
    });

    it('should have false loading states initially', () => {
      const state = useEmailStore.getState();
      expect(state.isLoadingAccounts).toBe(false);
      expect(state.isLoadingMessages).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.isSyncing).toBe(false);
    });
  });

  describe('account setters', () => {
    it('should set accounts', () => {
      const accounts: EmailAccount[] = [createAccount()];

      const { setAccounts } = useEmailStore.getState();
      act(() => {
        setAccounts(accounts);
      });

      expect(useEmailStore.getState().accounts).toEqual(accounts);
    });

    it('should set selected account id', () => {
      const { setSelectedAccountId } = useEmailStore.getState();
      act(() => {
        setSelectedAccountId('account-1');
      });

      expect(useEmailStore.getState().selectedAccountId).toBe('account-1');
    });
  });

  describe('message setters', () => {
    it('should set messages', () => {
      const messages: EmailMessage[] = [
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
          subject: 'Test Subject',
          snippet: 'Test snippet',
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
      ];

      const { setMessages } = useEmailStore.getState();
      act(() => {
        setMessages(messages);
      });

      expect(useEmailStore.getState().messages).toEqual(messages);
    });

    it('should toggle thread expansion', () => {
      const { toggleThreadExpansion } = useEmailStore.getState();
      act(() => {
        toggleThreadExpansion('thread-1');
      });

      const state = useEmailStore.getState();
      expect(state.expandedThreads.has('thread-1')).toBe(true);
    });

    it('should collapse expanded thread', () => {
      const { toggleThreadExpansion } = useEmailStore.getState();
      act(() => {
        toggleThreadExpansion('thread-1');
        toggleThreadExpansion('thread-1');
      });

      const state = useEmailStore.getState();
      expect(state.expandedThreads.has('thread-1')).toBe(false);
    });
  });

  describe('composer actions', () => {
    it('should open composer', () => {
      const { openComposer } = useEmailStore.getState();
      act(() => {
        openComposer();
      });

      const state = useEmailStore.getState();
      expect(state.isComposerOpen).toBe(true);
      expect(state.composerMode).toBe('new');
    });

    it('should open composer in reply mode', () => {
      const message: EmailMessage = {
        id: 'msg-1',
        accountId: 'account-1',
        familyId: 'family-1',
        uid: 1,
        messageId: '<msg-1@example.com>',
        threadId: 'thread-1',
        folder: 'inbox',
        from: { name: 'Sender', address: 'sender@example.com' },
        to: [{ name: 'Recipient', address: 'recipient@example.com' }],
        subject: 'Test Subject',
        snippet: 'Test snippet',
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
      };

      const { openComposer } = useEmailStore.getState();
      act(() => {
        openComposer('reply', message);
      });

      const state = useEmailStore.getState();
      expect(state.isComposerOpen).toBe(true);
      expect(state.composerMode).toBe('reply');
      expect(state.replyToMessage).toEqual(message);
    });

    it('should close composer', () => {
      const { openComposer, closeComposer } = useEmailStore.getState();
      act(() => {
        openComposer();
        closeComposer();
      });

      const state = useEmailStore.getState();
      expect(state.isComposerOpen).toBe(false);
      expect(state.composerMode).toBe('new');
      expect(state.replyToMessage).toBeNull();
    });
  });

  describe('computed helpers', () => {
    it('should get account by id', () => {
      const accounts: EmailAccount[] = [createAccount()];
      const { setAccounts, getAccountById } = useEmailStore.getState();
      act(() => {
        setAccounts(accounts);
      });

      const foundAccount = getAccountById('account-1');
      expect(foundAccount).toEqual(accounts[0]);
    });

    it('should get selected account', () => {
      const account = createAccount();

      const { setAccounts, setSelectedAccountId, getSelectedAccount } = useEmailStore.getState();
      act(() => {
        setAccounts([account]);
        setSelectedAccountId('account-1');
      });

      const selectedAccount = getSelectedAccount();
      expect(selectedAccount).toEqual(account);
    });

    it('should get message by id', () => {
      const message: EmailMessage = {
        id: 'msg-1',
        accountId: 'account-1',
        familyId: 'family-1',
        uid: 1,
        messageId: '<msg-1@example.com>',
        threadId: 'thread-1',
        folder: 'inbox',
        from: { name: 'Sender', address: 'sender@example.com' },
        to: [{ name: 'Recipient', address: 'recipient@example.com' }],
        subject: 'Test Subject',
        snippet: 'Test snippet',
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
      };

      const { setMessages, getMessageById } = useEmailStore.getState();
      act(() => {
        setMessages([message]);
      });

      const foundMessage = getMessageById('msg-1');
      expect(foundMessage).toEqual(message);
    });

    it('should get unread count', () => {
      const messages: EmailMessage[] = [
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
          subject: 'Test Subject',
          snippet: 'Test snippet',
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
        {
          id: 'msg-2',
          accountId: 'account-1',
          familyId: 'family-1',
          uid: 2,
          messageId: '<msg-2@example.com>',
          threadId: 'thread-2',
          folder: 'inbox',
          from: { name: 'Sender', address: 'sender@example.com' },
          to: [{ name: 'Recipient', address: 'recipient@example.com' }],
          subject: 'Read Subject',
          snippet: 'Read snippet',
          date: Date.now(),
          size: 1000,
          read: true,
          starred: false,
          draft: false,
          labels: [],
          attachments: [],
          flags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const { setMessages, getUnreadCount } = useEmailStore.getState();
      act(() => {
        setMessages(messages);
      });

      const unreadCount = getUnreadCount();
      expect(unreadCount).toBe(1);
    });

    it('should get filtered messages', () => {
      const messages: EmailMessage[] = [
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
          subject: 'Unread Subject',
          snippet: 'Unread snippet',
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
        {
          id: 'msg-2',
          accountId: 'account-1',
          familyId: 'family-1',
          uid: 2,
          messageId: '<msg-2@example.com>',
          threadId: 'thread-2',
          folder: 'inbox',
          from: { name: 'Sender', address: 'sender@example.com' },
          to: [{ name: 'Recipient', address: 'recipient@example.com' }],
          subject: 'Read Subject',
          snippet: 'Read snippet',
          date: Date.now(),
          size: 1000,
          read: true,
          starred: false,
          draft: false,
          labels: [],
          attachments: [],
          flags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const { setMessages, setFilter, getFilteredMessages } = useEmailStore.getState();
      act(() => {
        setMessages(messages);
        setFilter({ read: false });
      });

      const filteredMessages = getFilteredMessages();
      expect(filteredMessages).toHaveLength(1);
      expect(filteredMessages[0]?.id).toBe('msg-1');
    });

    it('should filter messages by search query', () => {
      const messages: EmailMessage[] = [
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
          subject: 'Important Email',
          snippet: 'Important content',
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
        {
          id: 'msg-2',
          accountId: 'account-1',
          familyId: 'family-1',
          uid: 2,
          messageId: '<msg-2@example.com>',
          threadId: 'thread-2',
          folder: 'inbox',
          from: { name: 'Other', address: 'other@example.com' },
          to: [{ name: 'Recipient', address: 'recipient@example.com' }],
          subject: 'Other Email',
          snippet: 'Other content',
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
      ];

      const { setMessages, setSearchQuery, getFilteredMessages } = useEmailStore.getState();
      act(() => {
        setMessages(messages);
        setSearchQuery('Important');
      });

      const filteredMessages = getFilteredMessages();
      expect(filteredMessages).toHaveLength(1);
      expect(filteredMessages[0]?.id).toBe('msg-1');
    });

    it('should clear filters', () => {
      const { setFilter, setSearchQuery, clearFilters } = useEmailStore.getState();
      act(() => {
        setFilter({ read: false });
        setSearchQuery('test');
        clearFilters();
      });

      const state = useEmailStore.getState();
      expect(state.filter).toEqual({});
      expect(state.searchQuery).toBe('');
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const account = createAccount();

      const { setAccounts, setCurrentView, setError, openComposer, reset } =
        useEmailStore.getState();
      act(() => {
        setAccounts([account]);
        setCurrentView('sent');
        setError('Error');
        openComposer();
        reset();
      });

      const state = useEmailStore.getState();
      expect(state.accounts).toEqual([]);
      expect(state.currentView).toBe('inbox');
      expect(state.error).toBeNull();
      expect(state.isComposerOpen).toBe(false);
    });
  });
});
