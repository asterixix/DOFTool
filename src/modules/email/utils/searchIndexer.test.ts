import { describe, it, expect } from 'vitest';

import { extractSearchableText, parseSearchQuery, buildSearchQuery } from './searchIndexer';

import type { EmailMessage } from '../types/Email.types';

describe('searchIndexer', () => {
  describe('extractSearchableText', () => {
    it('should extract text from email message with text body', () => {
      const message: EmailMessage = {
        id: '1',
        accountId: 'account-1',
        familyId: 'family-1',
        uid: 1,
        messageId: 'msg-1',
        subject: 'Test Subject',
        from: { name: 'Sender', address: 'sender@example.com' },
        to: [{ name: 'Recipient', address: 'recipient@example.com' }],
        textBody: 'This is a test message body.',
        snippet: 'This is a test message body.',
        date: Date.now(),
        size: 100,
        read: false,
        starred: false,
        draft: false,
        labels: [],
        attachments: [],
        flags: [],
        threadId: 'thread-1',
        folder: 'INBOX',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = extractSearchableText(message);

      expect(result.subject).toBe('Test Subject');
      expect(result.bodyText).toBe('This is a test message body.');
      expect(result.sender).toBe('sender@example.com');
      expect(result.recipients).toEqual(['recipient@example.com']);
      expect(result.attachmentNames).toEqual([]);
    });

    it('should extract text from HTML body when text body is missing', () => {
      const message: EmailMessage = {
        id: '1',
        accountId: 'account-1',
        familyId: 'family-1',
        uid: 1,
        messageId: 'msg-1',
        subject: 'Test Subject',
        from: { name: 'Sender', address: 'sender@example.com' },
        to: [{ name: 'Recipient', address: 'recipient@example.com' }],
        htmlBody: '<p>This is <strong>HTML</strong> content.</p>',
        snippet: 'This is HTML content.',
        date: Date.now(),
        size: 100,
        read: false,
        starred: false,
        draft: false,
        labels: [],
        attachments: [],
        flags: [],
        threadId: 'thread-1',
        folder: 'INBOX',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = extractSearchableText(message);

      expect(result.bodyText).toBe('This is HTML content.');
    });

    it('should extract multiple recipients', () => {
      const message: EmailMessage = {
        id: '1',
        accountId: 'account-1',
        familyId: 'family-1',
        uid: 1,
        messageId: 'msg-1',
        subject: 'Test',
        from: { name: 'Sender', address: 'sender@example.com' },
        to: [
          { name: 'Recipient 1', address: 'recipient1@example.com' },
          { name: 'Recipient 2', address: 'recipient2@example.com' },
        ],
        cc: [{ name: 'CC Recipient', address: 'cc@example.com' }],
        textBody: 'Body',
        snippet: 'Body',
        date: Date.now(),
        size: 100,
        read: false,
        starred: false,
        draft: false,
        labels: [],
        attachments: [],
        flags: [],
        threadId: 'thread-1',
        folder: 'INBOX',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = extractSearchableText(message);

      expect(result.recipients).toEqual([
        'recipient1@example.com',
        'recipient2@example.com',
        'cc@example.com',
      ]);
    });

    it('should extract attachment names', () => {
      const message: EmailMessage = {
        id: '1',
        accountId: 'account-1',
        familyId: 'family-1',
        uid: 1,
        messageId: 'msg-1',
        subject: 'Test',
        from: { name: 'Sender', address: 'sender@example.com' },
        to: [{ name: 'Recipient', address: 'recipient@example.com' }],
        textBody: 'Body',
        snippet: 'Body',
        date: Date.now(),
        size: 100,
        read: false,
        starred: false,
        draft: false,
        labels: [],
        attachments: [
          {
            id: 'att-1',
            filename: 'document.pdf',
            contentType: 'application/pdf',
            size: 1024,
            inline: false,
          },
          {
            id: 'att-2',
            filename: 'image.jpg',
            contentType: 'image/jpeg',
            size: 2048,
            inline: false,
          },
        ],
        flags: [],
        threadId: 'thread-1',
        folder: 'INBOX',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = extractSearchableText(message);

      expect(result.attachmentNames).toEqual(['document.pdf', 'image.jpg']);
    });

    it('should handle empty HTML body', () => {
      const message: EmailMessage = {
        id: '1',
        accountId: 'account-1',
        familyId: 'family-1',
        uid: 1,
        messageId: 'msg-1',
        subject: 'Test',
        from: { name: 'Sender', address: 'sender@example.com' },
        to: [{ name: 'Recipient', address: 'recipient@example.com' }],
        htmlBody: '',
        snippet: '',
        date: Date.now(),
        size: 100,
        read: false,
        starred: false,
        draft: false,
        labels: [],
        attachments: [],
        flags: [],
        threadId: 'thread-1',
        folder: 'INBOX',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = extractSearchableText(message);

      expect(result.bodyText).toBe('');
    });

    it('should strip HTML tags and normalize whitespace', () => {
      const message: EmailMessage = {
        id: '1',
        accountId: 'account-1',
        familyId: 'family-1',
        uid: 1,
        messageId: 'msg-1',
        subject: 'Test',
        from: { name: 'Sender', address: 'sender@example.com' },
        to: [{ name: 'Recipient', address: 'recipient@example.com' }],
        htmlBody: '<div><p>First   paragraph</p><p>Second\nparagraph</p></div>',
        snippet: 'First paragraph Second paragraph',
        date: Date.now(),
        size: 100,
        read: false,
        starred: false,
        draft: false,
        labels: [],
        attachments: [],
        flags: [],
        threadId: 'thread-1',
        folder: 'INBOX',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = extractSearchableText(message);

      expect(result.bodyText).toBe('First paragraph Second paragraph');
    });
  });

  describe('parseSearchQuery', () => {
    it('should parse simple query', () => {
      const result = parseSearchQuery('test query');

      expect(result.terms).toEqual(['test', 'query']);
      expect(result.excludeTerms).toEqual([]);
      expect(result.requiredTerms).toEqual([]);
    });

    it('should parse exclude terms', () => {
      const result = parseSearchQuery('test -exclude');

      expect(result.terms).toEqual(['test']);
      expect(result.excludeTerms).toEqual(['exclude']);
      expect(result.requiredTerms).toEqual([]);
    });

    it('should parse required terms', () => {
      const result = parseSearchQuery('test +required');

      expect(result.terms).toEqual(['test']);
      expect(result.excludeTerms).toEqual([]);
      expect(result.requiredTerms).toEqual(['required']);
    });

    it('should parse quoted strings', () => {
      const result = parseSearchQuery('"quoted string" test');

      expect(result.terms).toEqual(['quoted string', 'test']);
      expect(result.excludeTerms).toEqual([]);
      expect(result.requiredTerms).toEqual([]);
    });

    it('should parse complex query', () => {
      const result = parseSearchQuery('test +required -exclude "quoted string"');

      expect(result.terms).toEqual(['test', 'quoted string']);
      expect(result.excludeTerms).toEqual(['exclude']);
      expect(result.requiredTerms).toEqual(['required']);
    });

    it('should handle exclude term with quotes', () => {
      const result = parseSearchQuery('-"excluded term"');

      expect(result.terms).toEqual([]);
      expect(result.excludeTerms).toEqual(['excluded term']);
      expect(result.requiredTerms).toEqual([]);
    });

    it('should handle required term with quotes', () => {
      const result = parseSearchQuery('+"required term"');

      expect(result.terms).toEqual([]);
      expect(result.excludeTerms).toEqual([]);
      expect(result.requiredTerms).toEqual(['required term']);
    });

    it('should handle empty query', () => {
      const result = parseSearchQuery('');

      expect(result.terms).toEqual([]);
      expect(result.excludeTerms).toEqual([]);
      expect(result.requiredTerms).toEqual([]);
    });

    it('should handle multiple exclude terms', () => {
      const result = parseSearchQuery('test -term1 -term2');

      expect(result.terms).toEqual(['test']);
      expect(result.excludeTerms).toEqual(['term1', 'term2']);
      expect(result.requiredTerms).toEqual([]);
    });

    it('should handle multiple required terms', () => {
      const result = parseSearchQuery('test +term1 +term2');

      expect(result.terms).toEqual(['test']);
      expect(result.excludeTerms).toEqual([]);
      expect(result.requiredTerms).toEqual(['term1', 'term2']);
    });
  });

  describe('buildSearchQuery', () => {
    it('should build query from parsed terms', () => {
      const parsed = {
        terms: ['test', 'query'],
        excludeTerms: [],
        requiredTerms: [],
      };

      const result = buildSearchQuery(parsed);

      expect(result).toBe('test query');
    });

    it('should build query with required terms first', () => {
      const parsed = {
        terms: ['test'],
        excludeTerms: [],
        requiredTerms: ['required'],
      };

      const result = buildSearchQuery(parsed);

      expect(result).toBe('+required test');
    });

    it('should build query with exclude terms last', () => {
      const parsed = {
        terms: ['test'],
        excludeTerms: ['exclude'],
        requiredTerms: [],
      };

      const result = buildSearchQuery(parsed);

      expect(result).toBe('test -exclude');
    });

    it('should build complex query', () => {
      const parsed = {
        terms: ['test'],
        excludeTerms: ['exclude'],
        requiredTerms: ['required'],
      };

      const result = buildSearchQuery(parsed);

      expect(result).toBe('+required test -exclude');
    });

    it('should handle empty parsed query', () => {
      const parsed = {
        terms: [],
        excludeTerms: [],
        requiredTerms: [],
      };

      const result = buildSearchQuery(parsed);

      expect(result).toBe('');
    });

    it('should handle multiple terms in each category', () => {
      const parsed = {
        terms: ['term1', 'term2'],
        excludeTerms: ['exclude1', 'exclude2'],
        requiredTerms: ['required1', 'required2'],
      };

      const result = buildSearchQuery(parsed);

      expect(result).toBe('+required1 +required2 term1 term2 -exclude1 -exclude2');
    });

    it('should be reversible with parseSearchQuery', () => {
      const originalQuery = 'test +required -exclude';
      const parsed = parseSearchQuery(originalQuery);
      const rebuilt = buildSearchQuery(parsed);

      // Note: order might differ, so parse both and compare
      const rebuiltParsed = parseSearchQuery(rebuilt);

      expect(rebuiltParsed.terms.sort()).toEqual(parsed.terms.sort());
      expect(rebuiltParsed.excludeTerms.sort()).toEqual(parsed.excludeTerms.sort());
      expect(rebuiltParsed.requiredTerms.sort()).toEqual(parsed.requiredTerms.sort());
    });
  });
});
