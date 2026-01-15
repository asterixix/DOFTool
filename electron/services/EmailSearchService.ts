/**
 * Email Search Service - Full-text search indexing and querying
 */

import * as path from 'path';

import { app } from 'electron';
import { Level } from 'level';
import MiniSearch from 'minisearch';

import type { EmailMessage } from './EmailService';

export interface EmailSearchIndex {
  messageId: string;
  accountId: string;
  subject: string;
  bodyText: string;
  sender: string;
  recipients: string[];
  date: number;
  folder: string;
  attachmentNames: string[];
  indexedAt: number;
}

export interface EmailSearchQuery {
  query: string;
  accountId?: string;
  folder?: string;
  from?: string;
  to?: string;
  dateFrom?: number;
  dateTo?: number;
  hasAttachments?: boolean;
  limit?: number;
}

export interface EmailSearchResult {
  messageId: string;
  accountId: string;
  score: number;
  match?: {
    field: string;
    term: string;
  };
}

export class EmailSearchService {
  private searchIndex: MiniSearch<EmailSearchIndex> | null = null;
  private db: Level<string, string> | null = null;
  private readonly dbPath: string;
  private indexVersion = 1;
  private documentsById: Map<string, EmailSearchIndex> = new Map();

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'data', 'email-search-index.db');
  }

  /**
   * Initialize the search service
   */
  async initialize(): Promise<void> {
    try {
      // Use LevelDB for persistent storage of index data
      const { mkdir } = await import('fs/promises');
      await mkdir(path.dirname(this.dbPath), { recursive: true });

      this.db = new Level<string, string>(this.dbPath, {
        valueEncoding: 'utf8',
        keyEncoding: 'utf8',
      });

      // Initialize MiniSearch index
      this.searchIndex = new MiniSearch<EmailSearchIndex>({
        idField: 'messageId',
        fields: ['subject', 'bodyText', 'sender', 'recipients', 'attachmentNames'],
        storeFields: ['messageId', 'accountId', 'folder', 'date'],
        searchOptions: {
          boost: { subject: 2, sender: 1.5 },
          fuzzy: 0.2,
          prefix: true,
        },
      });

      // Load existing index from database
      await this.loadIndex();

      console.log('EmailSearchService initialized');
    } catch (error) {
      console.error('Failed to initialize EmailSearchService:', error);
      throw error;
    }
  }

  /**
   * Load search index from database
   */
  private async loadIndex(): Promise<void> {
    if (!this.db || !this.searchIndex) {
      return;
    }

    try {
      const indexData = await this.db.get('index:data').catch(() => null);
      if (indexData) {
        const documents = JSON.parse(indexData) as EmailSearchIndex[];
        this.documentsById = new Map(documents.map((doc) => [doc.messageId, doc]));
        this.searchIndex.addAll(documents);
        console.log(`Loaded ${documents.length} documents into search index`);
      }
    } catch (error) {
      console.error('Failed to load search index:', error);
      // Continue with empty index
    }
  }

  /**
   * Save search index to database
   */
  private async saveIndex(): Promise<void> {
    if (!this.db || !this.searchIndex) {
      return;
    }

    try {
      // Get all documents from index
      const documents = Array.from(this.documentsById.values());
      await this.db.put('index:data', JSON.stringify(documents));
      await this.db.put('index:version', this.indexVersion.toString());
    } catch (error) {
      console.error('Failed to save search index:', error);
    }
  }

  /**
   * Index an email message
   */
  async indexMessage(message: EmailMessage): Promise<void> {
    if (!this.searchIndex) {
      throw new Error('EmailSearchService not initialized');
    }

    try {
      // Extract text from HTML body if needed
      let bodyText = message.textBody ?? '';
      if (!bodyText && message.htmlBody) {
        // Simple HTML stripping (basic implementation)
        bodyText = message.htmlBody
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // Extract recipients
      const recipients = [
        ...message.to.map((addr) => addr.address),
        ...(message.cc?.map((addr) => addr.address) ?? []),
      ];

      // Extract attachment names
      const attachmentNames = message.attachments.map((att) => att.filename);

      const indexEntry: EmailSearchIndex = {
        messageId: message.id,
        accountId: message.accountId,
        subject: message.subject,
        bodyText,
        sender: message.from.address,
        recipients,
        date: message.date,
        folder: message.folder,
        attachmentNames,
        indexedAt: Date.now(),
      };

      // Check if document already exists
      if (this.documentsById.has(message.id)) {
        this.searchIndex.discard(message.id);
      }

      this.searchIndex.add(indexEntry);
      this.documentsById.set(message.id, indexEntry);

      // Save to database (debounced - could be optimized)
      await this.saveIndex();
    } catch (error) {
      console.error('Failed to index message:', error);
    }
  }

  /**
   * Remove a message from the index
   */
  async removeMessage(messageId: string): Promise<void> {
    if (!this.searchIndex) {
      throw new Error('EmailSearchService not initialized');
    }

    try {
      this.searchIndex.discard(messageId);
      this.documentsById.delete(messageId);
      await this.saveIndex();
    } catch (error) {
      console.error('Failed to remove message from index:', error);
    }
  }

  /**
   * Search email messages
   */
  async search(query: EmailSearchQuery): Promise<EmailSearchResult[]> {
    if (!this.searchIndex) {
      throw new Error('EmailSearchService not initialized');
    }

    try {
      await Promise.resolve();
      // Perform search
      const results = this.searchIndex.search(query.query, {
        filter: (result) => {
          const doc = this.documentsById.get(String(result.id));
          // Apply filters
          if (query.accountId && doc?.accountId !== query.accountId) {
            return false;
          }
          if (query.folder && doc?.folder !== query.folder) {
            return false;
          }
          if (query.from && !doc?.sender.toLowerCase().includes(query.from.toLowerCase())) {
            return false;
          }
          if (query.dateFrom && (doc?.date ?? 0) < query.dateFrom) {
            return false;
          }
          if (query.dateTo && (doc?.date ?? 0) > query.dateTo) {
            return false;
          }
          return true;
        },
        boost: { subject: 2, sender: 1.5 },
      });

      // Convert to EmailSearchResult format
      const searchResults: EmailSearchResult[] = results.map((result) => {
        const doc = this.documentsById.get(String(result.id));
        return {
          messageId: doc?.messageId ?? String(result.id),
          accountId: doc?.accountId ?? '',
          score: result.score,
        };
      });

      // Apply limit
      const limit = query.limit ?? 100;
      return searchResults.slice(0, limit);
    } catch (error) {
      console.error('Failed to search:', error);
      return [];
    }
  }

  /**
   * Rebuild index for an account
   */
  async rebuildIndex(accountId: string, messages: EmailMessage[]): Promise<void> {
    if (!this.searchIndex) {
      throw new Error('EmailSearchService not initialized');
    }

    try {
      // Remove existing documents for this account
      const removeIds: string[] = [];
      for (const doc of this.documentsById.values()) {
        if (doc.accountId === accountId) {
          removeIds.push(doc.messageId);
        }
      }

      for (const messageId of removeIds) {
        this.searchIndex.discard(messageId);
        this.documentsById.delete(messageId);
      }

      // Index all messages
      for (const message of messages) {
        if (message.accountId === accountId) {
          await this.indexMessage(message);
        }
      }

      await this.saveIndex();
      console.log(`Rebuilt index for account ${accountId}: ${messages.length} messages`);
    } catch (error) {
      console.error('Failed to rebuild index:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  getIndexStats(): { documentCount: number; size: number } {
    if (!this.searchIndex) {
      return { documentCount: 0, size: 0 };
    }

    const documents = Array.from(this.documentsById.values());
    return {
      documentCount: documents.length,
      size: JSON.stringify(documents).length,
    };
  }

  /**
   * Close the service
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.saveIndex();
      await this.db.close();
      this.db = null;
    }
    this.searchIndex = null;
    this.documentsById.clear();
  }
}
