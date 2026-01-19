import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { EmailSearchService } from './EmailSearchService';

import type { EmailMessage } from './EmailService';

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/user/data'),
  },
}));

// Mock LevelDB with async iterator support
const mockLevelDb = {
  get: vi.fn(),
  put: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn(() => ({
    [Symbol.asyncIterator]: async function* (): AsyncGenerator<string> {
      // Empty iterator
    },
  })),
};

vi.mock('level', () => ({
  Level: vi.fn(() => mockLevelDb),
}));

// Mock MiniSearch with proper method signatures
const mockMiniSearchInstance = {
  addAll: vi.fn(),
  add: vi.fn(),
  discard: vi.fn(),
  search: vi.fn().mockReturnValue([]),
  documentCount: 0,
};

vi.mock('minisearch', () => ({
  default: vi.fn(() => mockMiniSearchInstance),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

describe('EmailSearchService', () => {
  let searchService: EmailSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLevelDb.get.mockRejectedValue({ notFound: true });
    mockLevelDb.put.mockResolvedValue(undefined);
    searchService = new EmailSearchService();
  });

  afterEach(async () => {
    try {
      await searchService.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should initialize search service successfully', async () => {
      // Mock existing index data in database
      const mockIndexData = JSON.stringify([
        {
          messageId: 'msg-1',
          accountId: 'account-1',
          subject: 'Test Subject',
          bodyText: 'Test body',
          sender: 'sender@example.com',
          recipients: ['recipient@example.com'],
          date: Date.now(),
          folder: 'inbox',
          attachmentNames: [],
          indexedAt: Date.now(),
        },
      ]);

      mockLevelDb.get.mockImplementation((key: string) => {
        if (key === 'index:data') {
          return Promise.resolve(mockIndexData);
        }
        return Promise.reject({ notFound: true });
      });

      await searchService.initialize();

      expect(mockMiniSearchInstance.addAll).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            messageId: 'msg-1',
            subject: 'Test Subject',
          }),
        ])
      );
    });

    it('should create data directory on initialization', async () => {
      const { mkdir } = await import('fs/promises');

      await searchService.initialize();

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('data'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('should load existing index from database', async () => {
      const mockIndexData = JSON.stringify([
        {
          messageId: 'msg-1',
          accountId: 'account-1',
          subject: 'Test Subject',
          bodyText: 'Test body',
          sender: 'sender@example.com',
          recipients: ['recipient@example.com'],
          date: Date.now(),
          folder: 'inbox',
          attachmentNames: [],
          indexedAt: Date.now(),
        },
      ]);

      mockLevelDb.get.mockImplementation((key: string) => {
        if (key === 'index:data') {
          return Promise.resolve(mockIndexData);
        }
        return Promise.reject({ notFound: true });
      });

      await searchService.initialize();

      expect(mockLevelDb.get).toHaveBeenCalledWith('index:data');
      expect(mockMiniSearchInstance.addAll).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ messageId: 'msg-1' })])
      );
    });

    it('should handle empty database gracefully', async () => {
      mockLevelDb.get.mockRejectedValue({ notFound: true });

      await expect(searchService.initialize()).resolves.not.toThrow();
    });
  });

  describe('indexMessage', () => {
    const createTestMessage = (overrides: Partial<EmailMessage> = {}): EmailMessage => ({
      id: 'msg-1',
      accountId: 'account-1',
      uid: 1,
      messageId: '<msg-1@example.com>',
      threadId: 'thread-1',
      folder: 'inbox',
      from: { name: 'Sender', address: 'sender@example.com' },
      to: [{ name: 'Recipient', address: 'recipient@example.com' }],
      subject: 'Test Subject',
      textBody: 'Test body text',
      htmlBody: '',
      snippet: 'Test snippet',
      date: Date.now(),
      size: 1000,
      read: false,
      starred: false,
      draft: false,
      labels: [],
      attachments: [],
      flags: [],
      ...overrides,
    });

    beforeEach(async () => {
      await searchService.initialize();
    });

    it('should index email message with text body', async () => {
      const message = createTestMessage();

      await searchService.indexMessage(message);

      expect(mockMiniSearchInstance.add).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'msg-1',
          accountId: 'account-1',
          subject: 'Test Subject',
          bodyText: 'Test body text',
        })
      );
    });

    it('should extract text from HTML body when no text body', async () => {
      const message = createTestMessage({
        textBody: undefined,
        htmlBody: '<p>HTML <strong>content</strong> here</p>',
      });

      await searchService.indexMessage(message);

      expect(mockMiniSearchInstance.add).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyText: expect.stringContaining('HTML'),
        })
      );
    });

    it('should extract recipients from to and cc fields', async () => {
      const message = createTestMessage({
        to: [{ address: 'to1@example.com' }, { address: 'to2@example.com' }],
        cc: [{ address: 'cc@example.com' }],
      });

      await searchService.indexMessage(message);

      expect(mockMiniSearchInstance.add).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: expect.arrayContaining([
            'to1@example.com',
            'to2@example.com',
            'cc@example.com',
          ]),
        })
      );
    });

    it('should extract attachment filenames', async () => {
      const message = createTestMessage({
        attachments: [
          {
            id: 'att-1',
            filename: 'doc.pdf',
            contentType: 'application/pdf',
            size: 1000,
            inline: false,
          },
          {
            id: 'att-2',
            filename: 'image.png',
            contentType: 'image/png',
            size: 2000,
            inline: true,
          },
        ],
      });

      await searchService.indexMessage(message);

      expect(mockMiniSearchInstance.add).toHaveBeenCalledWith(
        expect.objectContaining({
          attachmentNames: ['doc.pdf', 'image.png'],
        })
      );
    });

    it('should save index after adding message', async () => {
      const message = createTestMessage();

      await searchService.indexMessage(message);

      expect(mockLevelDb.put).toHaveBeenCalledWith('index:data', expect.any(String));
    });

    it('should update existing message by discarding first', async () => {
      const message = createTestMessage();

      // Index the same message twice
      await searchService.indexMessage(message);
      await searchService.indexMessage(message);

      // Second call should discard the old entry
      expect(mockMiniSearchInstance.discard).toHaveBeenCalledWith('msg-1');
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new EmailSearchService();
      const message = createTestMessage();

      await expect(uninitializedService.indexMessage(message)).rejects.toThrow(
        'EmailSearchService not initialized'
      );
    });
  });

  describe('removeMessage', () => {
    beforeEach(async () => {
      await searchService.initialize();
    });

    it('should remove message from index', async () => {
      await searchService.removeMessage('msg-1');

      expect(mockMiniSearchInstance.discard).toHaveBeenCalledWith('msg-1');
    });

    it('should save index after removal', async () => {
      await searchService.removeMessage('msg-1');

      expect(mockLevelDb.put).toHaveBeenCalled();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new EmailSearchService();

      await expect(uninitializedService.removeMessage('msg-1')).rejects.toThrow(
        'EmailSearchService not initialized'
      );
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await searchService.initialize();
    });

    it('should search messages with query', async () => {
      mockMiniSearchInstance.search.mockReturnValue([
        { id: 'msg-1', score: 0.9 },
        { id: 'msg-2', score: 0.7 },
      ]);

      const results = await searchService.search({ query: 'test' });

      expect(mockMiniSearchInstance.search).toHaveBeenCalledWith('test', expect.any(Object));
      expect(results).toHaveLength(2);
    });

    it('should return empty array on search error', async () => {
      mockMiniSearchInstance.search.mockImplementation(() => {
        throw new Error('Search failed');
      });

      const results = await searchService.search({ query: 'test' });

      expect(results).toEqual([]);
    });

    it('should limit results to specified limit', async () => {
      const manyResults = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        score: 1 - i * 0.01,
      }));
      mockMiniSearchInstance.search.mockReturnValue(manyResults);

      const results = await searchService.search({ query: 'test', limit: 10 });

      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should default limit to 100', async () => {
      const manyResults = Array.from({ length: 150 }, (_, i) => ({
        id: `msg-${i}`,
        score: 1,
      }));
      mockMiniSearchInstance.search.mockReturnValue(manyResults);

      const results = await searchService.search({ query: 'test' });

      expect(results.length).toBeLessThanOrEqual(100);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new EmailSearchService();

      await expect(uninitializedService.search({ query: 'test' })).rejects.toThrow(
        'EmailSearchService not initialized'
      );
    });
  });

  describe('rebuildIndex', () => {
    beforeEach(async () => {
      await searchService.initialize();
    });

    it('should rebuild index for account', async () => {
      const messages: EmailMessage[] = [
        {
          id: 'msg-1',
          accountId: 'account-1',
          uid: 1,
          messageId: '<msg-1@example.com>',
          threadId: 'thread-1',
          folder: 'inbox',
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }],
          subject: 'Test 1',
          snippet: 'Snippet 1',
          date: Date.now(),
          size: 1000,
          read: false,
          starred: false,
          draft: false,
          labels: [],
          attachments: [],
          flags: [],
        },
        {
          id: 'msg-2',
          accountId: 'account-1',
          uid: 2,
          messageId: '<msg-2@example.com>',
          threadId: 'thread-2',
          folder: 'inbox',
          from: { address: 'sender2@example.com' },
          to: [{ address: 'recipient@example.com' }],
          subject: 'Test 2',
          snippet: 'Snippet 2',
          date: Date.now(),
          size: 1000,
          read: false,
          starred: false,
          draft: false,
          labels: [],
          attachments: [],
          flags: [],
        },
      ];

      await searchService.rebuildIndex('account-1', messages);

      expect(mockMiniSearchInstance.add).toHaveBeenCalledTimes(2);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new EmailSearchService();

      await expect(uninitializedService.rebuildIndex('account-1', [])).rejects.toThrow(
        'EmailSearchService not initialized'
      );
    });
  });

  describe('getIndexStats', () => {
    it('should return zero stats when not initialized', () => {
      const uninitializedService = new EmailSearchService();
      const stats = uninitializedService.getIndexStats();

      expect(stats.documentCount).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should return stats after initialization', async () => {
      await searchService.initialize();
      const stats = searchService.getIndexStats();

      expect(stats).toHaveProperty('documentCount');
      expect(stats).toHaveProperty('size');
      expect(typeof stats.documentCount).toBe('number');
      expect(typeof stats.size).toBe('number');
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      await searchService.initialize();
      await searchService.close();

      expect(mockLevelDb.close).toHaveBeenCalled();
    });

    it('should save index before closing', async () => {
      await searchService.initialize();
      await searchService.close();

      expect(mockLevelDb.put).toHaveBeenCalled();
    });

    it('should clear internal state', async () => {
      await searchService.initialize();
      await searchService.close();

      const stats = searchService.getIndexStats();
      expect(stats.documentCount).toBe(0);
    });

    it('should handle close when not initialized', async () => {
      await expect(searchService.close()).resolves.not.toThrow();
    });
  });
});
