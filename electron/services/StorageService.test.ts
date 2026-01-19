import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { StorageService } from './StorageService';

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/user/data'),
  },
}));

// Mock LevelDB with async iterator support for keys()
const mockLevelDb = {
  get: vi.fn(),
  put: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn(),
};

vi.mock('level', () => ({
  Level: vi.fn(() => mockLevelDb),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for keys() - empty iterator
    mockLevelDb.keys.mockReturnValue({
      [Symbol.asyncIterator]: async function* (): AsyncGenerator<string> {
        // Empty iterator by default
      },
    });
    storageService = new StorageService();
  });

  afterEach(async () => {
    if (storageService) {
      try {
        await storageService.close();
      } catch {
        // Ignore errors during cleanup
      }
    }
  });

  describe('initialize', () => {
    it('should initialize database successfully', async () => {
      await storageService.initialize();

      const db = storageService.getDatabase();
      expect(db).toBeDefined();
    });

    it('should create data directory on initialization', async () => {
      const { mkdir } = await import('fs/promises');

      await storageService.initialize();

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('data'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('should throw error if initialization fails', async () => {
      const { Level } = await import('level');
      vi.mocked(Level).mockImplementationOnce(() => {
        throw new Error('Initialization failed');
      });

      await expect(storageService.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('getDatabase', () => {
    it('should return database after initialization', async () => {
      await storageService.initialize();
      const db = storageService.getDatabase();
      expect(db).toBe(mockLevelDb);
    });

    it('should throw error if not initialized', () => {
      expect(() => storageService.getDatabase()).toThrow(
        'StorageService not initialized. Call initialize() first.'
      );
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await storageService.initialize();
    });

    it('should get value from database', async () => {
      mockLevelDb.get.mockResolvedValue('test-value');

      const value = await storageService.get('test-key');

      expect(value).toBe('test-value');
      expect(mockLevelDb.get).toHaveBeenCalledWith('test-key');
    });

    it('should return undefined for non-existent key', async () => {
      mockLevelDb.get.mockRejectedValue({ notFound: true });

      const value = await storageService.get('non-existent');

      expect(value).toBeUndefined();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new StorageService();

      await expect(uninitializedService.get('key')).rejects.toThrow(
        'StorageService not initialized'
      );
    });

    it('should throw error for other database errors', async () => {
      mockLevelDb.get.mockRejectedValue(new Error('Database error'));

      await expect(storageService.get('key')).rejects.toThrow('Database error');
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await storageService.initialize();
    });

    it('should set value in database', async () => {
      mockLevelDb.put.mockResolvedValue(undefined);

      await storageService.set('test-key', 'test-value');

      expect(mockLevelDb.put).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should overwrite existing value', async () => {
      mockLevelDb.put.mockResolvedValue(undefined);

      await storageService.set('test-key', 'value1');
      await storageService.set('test-key', 'value2');

      expect(mockLevelDb.put).toHaveBeenLastCalledWith('test-key', 'value2');
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new StorageService();

      await expect(uninitializedService.set('key', 'value')).rejects.toThrow(
        'StorageService not initialized'
      );
    });

    it('should throw error on database failure', async () => {
      mockLevelDb.put.mockRejectedValue(new Error('Write failed'));

      await expect(storageService.set('key', 'value')).rejects.toThrow('Write failed');
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await storageService.initialize();
    });

    it('should delete value from database', async () => {
      mockLevelDb.del.mockResolvedValue(undefined);

      await storageService.delete('test-key');

      expect(mockLevelDb.del).toHaveBeenCalledWith('test-key');
    });

    it('should not throw for non-existent key', async () => {
      mockLevelDb.del.mockResolvedValue(undefined);

      await expect(storageService.delete('non-existent')).resolves.not.toThrow();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new StorageService();

      await expect(uninitializedService.delete('key')).rejects.toThrow(
        'StorageService not initialized'
      );
    });

    it('should throw error on database failure', async () => {
      mockLevelDb.del.mockRejectedValue(new Error('Delete failed'));

      await expect(storageService.delete('key')).rejects.toThrow('Delete failed');
    });
  });

  describe('getKeysByPrefix', () => {
    beforeEach(async () => {
      await storageService.initialize();
    });

    it('should get all keys with prefix', async () => {
      mockLevelDb.keys.mockReturnValue({
        [Symbol.asyncIterator]: async function* (): AsyncGenerator<string> {
          yield 'prefix:key1';
          yield 'prefix:key2';
          yield 'prefix:key3';
        },
      });

      const keys = await storageService.getKeysByPrefix('prefix:');

      expect(keys).toEqual(['prefix:key1', 'prefix:key2', 'prefix:key3']);
    });

    it('should return empty array if no keys found', async () => {
      mockLevelDb.keys.mockReturnValue({
        [Symbol.asyncIterator]: async function* (): AsyncGenerator<string> {
          // No keys yielded
        },
      });

      const keys = await storageService.getKeysByPrefix('nonexistent:');

      expect(keys).toEqual([]);
    });

    it('should pass correct range options to keys()', async () => {
      mockLevelDb.keys.mockReturnValue({
        [Symbol.asyncIterator]: async function* (): AsyncGenerator<string> {
          // Empty
        },
      });

      await storageService.getKeysByPrefix('test:');

      expect(mockLevelDb.keys).toHaveBeenCalledWith({
        gte: 'test:',
        lt: 'test:\xFF',
      });
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new StorageService();

      await expect(uninitializedService.getKeysByPrefix('prefix:')).rejects.toThrow(
        'StorageService not initialized'
      );
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      mockLevelDb.close.mockResolvedValue(undefined);
      await storageService.initialize();

      await storageService.close();

      expect(mockLevelDb.close).toHaveBeenCalled();
    });

    it('should set db to null after closing', async () => {
      await storageService.initialize();
      await storageService.close();

      expect(() => storageService.getDatabase()).toThrow('StorageService not initialized');
    });

    it('should not throw if database is already closed', async () => {
      await storageService.initialize();
      await storageService.close();

      await expect(storageService.close()).resolves.not.toThrow();
    });

    it('should not throw if database was never initialized', async () => {
      await expect(storageService.close()).resolves.not.toThrow();
    });
  });
});
