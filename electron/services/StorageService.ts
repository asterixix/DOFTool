/**
 * Storage Service - Manages LevelDB database and data persistence
 */

import path from 'path';

import { app } from 'electron';
import { Level } from 'level';

export class StorageService {
  private db: Level<string, string> | null = null;
  private readonly dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'data', 'familysync.db');
  }

  /**
   * Initialize the LevelDB database
   */
  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const { mkdir } = await import('fs/promises');
      await mkdir(path.dirname(this.dbPath), { recursive: true });

      this.db = new Level<string, string>(this.dbPath, {
        valueEncoding: 'utf8',
        keyEncoding: 'utf8',
      });

      console.log('StorageService initialized:', this.dbPath);
    } catch (error) {
      console.error('Failed to initialize StorageService:', error);
      throw error;
    }
  }

  /**
   * Get the LevelDB instance for Yjs integration
   */
  getDatabase(): Level<string, string> {
    if (!this.db) {
      throw new Error('StorageService not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('StorageService closed');
    }
  }

  /**
   * Get a value from the database
   */
  async get(key: string): Promise<string | undefined> {
    if (!this.db) {
      throw new Error('StorageService not initialized');
    }
    try {
      return await this.db.get(key);
    } catch (error) {
      if ((error as { notFound?: boolean }).notFound) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Set a value in the database
   */
  async set(key: string, value: string): Promise<void> {
    if (!this.db) {
      throw new Error('StorageService not initialized');
    }
    await this.db.put(key, value);
  }

  /**
   * Delete a value from the database
   */
  async delete(key: string): Promise<void> {
    if (!this.db) {
      throw new Error('StorageService not initialized');
    }
    await this.db.del(key);
  }

  /**
   * Get all keys with a prefix
   */
  async getKeysByPrefix(prefix: string): Promise<string[]> {
    if (!this.db) {
      throw new Error('StorageService not initialized');
    }
    const keys: string[] = [];
    for await (const key of this.db.keys({ gte: prefix, lt: prefix + '\xFF' })) {
      keys.push(key);
    }
    return keys;
  }
}
