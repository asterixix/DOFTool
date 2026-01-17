import { describe, it, expect } from 'vitest';

import {
  extractThreadId,
  parseReferences,
  buildThreadTree,
  groupIntoThreads,
  getThreadMessages,
  flattenThreadTree,
  getReplyChain,
  isThreaded,
  calculateThreadDepth,
  normalizeThreadSubject,
  isSameThread,
  getThreadStats,
  getThreadMessageIds,
} from './threading';

import type { EmailMessage } from '../types/Email.types';

function createMockMessage(overrides: Partial<EmailMessage> = {}): EmailMessage {
  const base: EmailMessage = {
    id: 'msg-1',
    accountId: 'account-1',
    familyId: 'family-1',
    uid: 1,
    messageId: '<msg-1@example.com>',
    threadId: '',
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
  return { ...base, ...overrides };
}

describe('threading', () => {
  describe('extractThreadId', () => {
    it('should return messageId for root message', () => {
      const msg = createMockMessage({ messageId: '<root@example.com>' });
      expect(extractThreadId(msg)).toBe('<root@example.com>');
    });

    it('should return inReplyTo if present', () => {
      const msg = createMockMessage({
        messageId: '<reply@example.com>',
        inReplyTo: '<root@example.com>',
      });
      expect(extractThreadId(msg)).toBe('<root@example.com>');
    });

    it('should return first reference if references present', () => {
      const msg = createMockMessage({
        messageId: '<reply@example.com>',
        references: ['<root@example.com>', '<middle@example.com>'],
      });
      expect(extractThreadId(msg)).toBe('<root@example.com>');
    });

    it('should prefer references over inReplyTo', () => {
      const msg = createMockMessage({
        messageId: '<reply@example.com>',
        inReplyTo: '<parent@example.com>',
        references: ['<root@example.com>', '<parent@example.com>'],
      });
      expect(extractThreadId(msg)).toBe('<root@example.com>');
    });
  });

  describe('parseReferences', () => {
    it('should return empty array for undefined', () => {
      expect(parseReferences(undefined)).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      expect(parseReferences([])).toEqual([]);
    });

    it('should filter out empty strings', () => {
      expect(parseReferences(['<a@b.com>', '', '<c@d.com>'])).toEqual(['<a@b.com>', '<c@d.com>']);
    });

    it('should return all valid references', () => {
      const refs = ['<a@b.com>', '<c@d.com>', '<e@f.com>'];
      expect(parseReferences(refs)).toEqual(refs);
    });
  });

  describe('buildThreadTree', () => {
    it('should return empty array for empty messages', () => {
      expect(buildThreadTree([])).toEqual([]);
    });

    it('should create single root for single message', () => {
      const messages = [createMockMessage()];
      const tree = buildThreadTree(messages);
      expect(tree).toHaveLength(1);
      expect(tree[0]?.depth).toBe(0);
    });

    it('should create parent-child relationship', () => {
      const root = createMockMessage({
        id: 'root',
        messageId: '<root@example.com>',
        date: Date.now() - 1000,
      });
      const reply = createMockMessage({
        id: 'reply',
        messageId: '<reply@example.com>',
        inReplyTo: '<root@example.com>',
        date: Date.now(),
      });

      const tree = buildThreadTree([root, reply]);
      expect(tree).toHaveLength(1);
      expect(tree[0]?.children).toHaveLength(1);
      expect(tree[0]?.children[0]?.depth).toBe(1);
    });

    it('should handle multiple roots', () => {
      const msg1 = createMockMessage({ id: '1', messageId: '<1@example.com>' });
      const msg2 = createMockMessage({ id: '2', messageId: '<2@example.com>' });

      const tree = buildThreadTree([msg1, msg2]);
      expect(tree).toHaveLength(2);
    });
  });

  describe('groupIntoThreads', () => {
    it('should return empty array for empty messages', () => {
      expect(groupIntoThreads([])).toEqual([]);
    });

    it('should group related messages', () => {
      const root = createMockMessage({
        id: 'root',
        messageId: '<root@example.com>',
        subject: 'Test Thread',
        date: Date.now() - 2000,
      });
      const reply1 = createMockMessage({
        id: 'reply1',
        messageId: '<reply1@example.com>',
        subject: 'Re: Test Thread',
        inReplyTo: '<root@example.com>',
        references: ['<root@example.com>'],
        date: Date.now() - 1000,
      });
      const reply2 = createMockMessage({
        id: 'reply2',
        messageId: '<reply2@example.com>',
        subject: 'Re: Test Thread',
        inReplyTo: '<reply1@example.com>',
        references: ['<root@example.com>', '<reply1@example.com>'],
        date: Date.now(),
      });

      const threads = groupIntoThreads([root, reply1, reply2]);
      expect(threads).toHaveLength(1);
      expect(threads[0]?.messageCount).toBe(3);
    });

    it('should calculate unread count', () => {
      const msg1 = createMockMessage({ read: true });
      const msg2 = createMockMessage({
        messageId: '<2@example.com>',
        inReplyTo: '<msg-1@example.com>',
        references: ['<msg-1@example.com>'],
        read: false,
      });

      const threads = groupIntoThreads([msg1, msg2]);
      expect(threads[0]?.unreadCount).toBe(1);
    });

    it('should detect attachments', () => {
      const msg = createMockMessage({
        attachments: [
          {
            id: 'att-1',
            filename: 'file.pdf',
            contentType: 'application/pdf',
            size: 1000,
            inline: false,
          },
        ],
      });

      const threads = groupIntoThreads([msg]);
      expect(threads[0]?.hasAttachments).toBe(true);
    });

    it('should detect starred status', () => {
      const msg = createMockMessage({ starred: true });
      const threads = groupIntoThreads([msg]);
      expect(threads[0]?.isStarred).toBe(true);
    });
  });

  describe('getThreadMessages', () => {
    it('should return messages for thread', () => {
      const msg1 = createMockMessage({ messageId: '<root@example.com>' });
      const msg2 = createMockMessage({
        messageId: '<reply@example.com>',
        inReplyTo: '<root@example.com>',
        references: ['<root@example.com>'],
      });
      const msg3 = createMockMessage({ messageId: '<other@example.com>' });

      const threadMsgs = getThreadMessages('<root@example.com>', [msg1, msg2, msg3]);
      expect(threadMsgs).toHaveLength(2);
    });
  });

  describe('flattenThreadTree', () => {
    it('should flatten single node', () => {
      const node = {
        message: createMockMessage(),
        children: [],
        depth: 0,
      };
      const flat = flattenThreadTree(node);
      expect(flat).toHaveLength(1);
    });

    it('should flatten nested tree', () => {
      const child = {
        message: createMockMessage({ id: 'child' }),
        children: [],
        depth: 1,
      };
      const root = {
        message: createMockMessage({ id: 'root' }),
        children: [child],
        depth: 0,
      };

      const flat = flattenThreadTree(root);
      expect(flat).toHaveLength(2);
      expect(flat[0]?.id).toBe('root');
      expect(flat[1]?.id).toBe('child');
    });
  });

  describe('getReplyChain', () => {
    it('should return single message for root', () => {
      const msg = createMockMessage();
      const chain = getReplyChain(msg, [msg]);
      expect(chain).toHaveLength(1);
    });

    it('should return chain of replies', () => {
      const root = createMockMessage({
        id: 'root',
        messageId: '<root@example.com>',
      });
      const reply = createMockMessage({
        id: 'reply',
        messageId: '<reply@example.com>',
        inReplyTo: '<root@example.com>',
      });

      const chain = getReplyChain(reply, [root, reply]);
      expect(chain).toHaveLength(2);
      expect(chain[0]?.id).toBe('root');
      expect(chain[1]?.id).toBe('reply');
    });
  });

  describe('isThreaded', () => {
    it('should return false for root message', () => {
      const msg = createMockMessage();
      expect(isThreaded(msg)).toBe(false);
    });

    it('should return true for reply', () => {
      const msg = createMockMessage({ inReplyTo: '<parent@example.com>' });
      expect(isThreaded(msg)).toBe(true);
    });

    it('should return true if has references', () => {
      const msg = createMockMessage({ references: ['<root@example.com>'] });
      expect(isThreaded(msg)).toBe(true);
    });
  });

  describe('calculateThreadDepth', () => {
    it('should return 0 for root message', () => {
      const msg = createMockMessage();
      expect(calculateThreadDepth(msg)).toBe(0);
    });

    it('should return reference count as depth', () => {
      const msg = createMockMessage({
        references: ['<1@example.com>', '<2@example.com>', '<3@example.com>'],
      });
      expect(calculateThreadDepth(msg)).toBe(3);
    });
  });

  describe('normalizeThreadSubject', () => {
    it('should return empty string for empty input', () => {
      expect(normalizeThreadSubject('')).toBe('');
    });

    it('should remove Re: prefix', () => {
      expect(normalizeThreadSubject('Re: Test Subject')).toBe('Test Subject');
    });

    it('should remove Fwd: prefix', () => {
      expect(normalizeThreadSubject('Fwd: Test Subject')).toBe('Test Subject');
    });

    it('should remove Fw: prefix', () => {
      expect(normalizeThreadSubject('Fw: Test Subject')).toBe('Test Subject');
    });

    it('should remove multiple prefixes', () => {
      expect(normalizeThreadSubject('Re: Re: Fwd: Test Subject')).toBe('Test Subject');
    });

    it('should be case insensitive', () => {
      expect(normalizeThreadSubject('RE: Test Subject')).toBe('Test Subject');
      expect(normalizeThreadSubject('FWD: Test Subject')).toBe('Test Subject');
    });

    it('should preserve subject without prefix', () => {
      expect(normalizeThreadSubject('Test Subject')).toBe('Test Subject');
    });
  });

  describe('isSameThread', () => {
    it('should return true for same thread', () => {
      const msg1 = createMockMessage({ messageId: '<root@example.com>' });
      const msg2 = createMockMessage({
        messageId: '<reply@example.com>',
        references: ['<root@example.com>'],
      });
      expect(isSameThread(msg1, msg2)).toBe(true);
    });

    it('should return false for different threads', () => {
      const msg1 = createMockMessage({ messageId: '<1@example.com>' });
      const msg2 = createMockMessage({ messageId: '<2@example.com>' });
      expect(isSameThread(msg1, msg2)).toBe(false);
    });
  });

  describe('getThreadStats', () => {
    it('should calculate message count', () => {
      const messages = [
        createMockMessage({ messageId: '<root@example.com>' }),
        createMockMessage({
          messageId: '<reply@example.com>',
          references: ['<root@example.com>'],
        }),
      ];

      const stats = getThreadStats('<root@example.com>', messages);
      expect(stats.messageCount).toBe(2);
    });

    it('should calculate unread count', () => {
      const messages = [
        createMockMessage({ messageId: '<root@example.com>', read: true }),
        createMockMessage({
          messageId: '<reply@example.com>',
          references: ['<root@example.com>'],
          read: false,
        }),
      ];

      const stats = getThreadStats('<root@example.com>', messages);
      expect(stats.unreadCount).toBe(1);
    });

    it('should detect attachments', () => {
      const messages = [
        createMockMessage({
          messageId: '<root@example.com>',
          attachments: [
            {
              id: '1',
              filename: 'file.pdf',
              contentType: 'application/pdf',
              size: 100,
              inline: false,
            },
          ],
        }),
      ];

      const stats = getThreadStats('<root@example.com>', messages);
      expect(stats.hasAttachments).toBe(true);
    });

    it('should count participants', () => {
      const messages = [
        createMockMessage({
          messageId: '<root@example.com>',
          from: { name: 'A', address: 'a@example.com' },
          to: [{ name: 'B', address: 'b@example.com' }],
        }),
        createMockMessage({
          messageId: '<reply@example.com>',
          references: ['<root@example.com>'],
          from: { name: 'B', address: 'b@example.com' },
          to: [{ name: 'A', address: 'a@example.com' }],
          cc: [{ name: 'C', address: 'c@example.com' }],
        }),
      ];

      const stats = getThreadStats('<root@example.com>', messages);
      expect(stats.participantCount).toBe(3);
    });
  });

  describe('getThreadMessageIds', () => {
    it('should return message IDs for thread', () => {
      const messages = [
        createMockMessage({ id: 'msg-1', messageId: '<root@example.com>' }),
        createMockMessage({
          id: 'msg-2',
          messageId: '<reply@example.com>',
          references: ['<root@example.com>'],
        }),
      ];

      const ids = getThreadMessageIds('<root@example.com>', messages);
      expect(ids).toContain('msg-1');
      expect(ids).toContain('msg-2');
    });
  });
});
