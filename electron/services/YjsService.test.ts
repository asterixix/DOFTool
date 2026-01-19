import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';

import { YjsService } from './YjsService';

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/user/data'),
  },
}));

// Mock y-leveldb
const mockPersistence = {
  getYDoc: vi.fn(),
  storeUpdate: vi.fn().mockResolvedValue(undefined),
  flushDocument: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
};

vi.mock('y-leveldb', () => ({
  LeveldbPersistence: vi.fn(() => mockPersistence),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockRejectedValue(new Error('ENOENT')), // No lock file by default
  unlink: vi.fn().mockResolvedValue(undefined),
}));

describe('YjsService', () => {
  let yjsService: YjsService;
  let mockYDoc: Y.Doc;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a real Y.Doc for testing
    mockYDoc = new Y.Doc();
    mockPersistence.getYDoc.mockResolvedValue(mockYDoc);

    yjsService = new YjsService();
  });

  afterEach(async () => {
    try {
      await yjsService.close();
    } catch {
      // Ignore cleanup errors
    }
    try {
      mockYDoc.destroy();
    } catch {
      // Ignore if already destroyed
    }
  });

  describe('initialize', () => {
    it('should initialize Yjs document', async () => {
      await yjsService.initialize();

      const doc = yjsService.getDocument();
      expect(doc).toBeDefined();
      expect(doc).toBeInstanceOf(Y.Doc);
    });

    it('should create data directory on initialization', async () => {
      const { mkdir } = await import('fs/promises');

      await yjsService.initialize();

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('yjs'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('should initialize with default document name', async () => {
      await yjsService.initialize();

      expect(mockPersistence.getYDoc).toHaveBeenCalledWith('default');
    });

    it('should initialize with provided family ID as document name', async () => {
      await yjsService.initialize('family-123');

      expect(mockPersistence.getYDoc).toHaveBeenCalledWith('family-123');
    });

    it('should handle lock file removal on startup', async () => {
      const { access, unlink } = await import('fs/promises');

      // Lock file exists
      vi.mocked(access).mockResolvedValueOnce(undefined);
      vi.mocked(unlink).mockResolvedValueOnce(undefined);

      await yjsService.initialize();

      expect(unlink).toHaveBeenCalled();
    });

    it('should retry on lock errors', async () => {
      const { LeveldbPersistence } = await import('y-leveldb');

      let callCount = 0;
      vi.mocked(LeveldbPersistence).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('IO error: lock: LOCK');
        }
        return mockPersistence as never;
      });

      await yjsService.initialize();

      expect(callCount).toBeGreaterThan(1);
    });

    it('should enable garbage collection on document', async () => {
      await yjsService.initialize();

      const doc = yjsService.getDocument();
      expect(doc.gc).toBe(true);
    });
  });

  describe('getDocument', () => {
    it('should return Yjs document after initialization', async () => {
      await yjsService.initialize();

      const doc = yjsService.getDocument();
      expect(doc).toBe(mockYDoc);
    });

    it('should throw error if not initialized', () => {
      expect(() => yjsService.getDocument()).toThrow(
        'YjsService not initialized. Call initialize() first.'
      );
    });
  });

  describe('getStructure', () => {
    it('should return document structure after initialization', async () => {
      await yjsService.initialize();

      const structure = yjsService.getStructure();

      expect(structure).toBeDefined();
      expect(structure.family).toBeInstanceOf(Y.Map);
      expect(structure.members).toBeInstanceOf(Y.Map);
      expect(structure.devices).toBeInstanceOf(Y.Map);
      expect(structure.calendars).toBeInstanceOf(Y.Map);
      expect(structure.events).toBeInstanceOf(Y.Map);
      expect(structure.taskLists).toBeInstanceOf(Y.Map);
      expect(structure.tasks).toBeInstanceOf(Y.Map);
      expect(structure.internalMessages).toBeInstanceOf(Y.Array);
    });

    it('should throw error if not initialized', () => {
      expect(() => yjsService.getStructure()).toThrow(
        'YjsService not initialized. Call initialize() first.'
      );
    });
  });

  describe('getMap', () => {
    beforeEach(async () => {
      await yjsService.initialize();
    });

    it('should return calendars map', () => {
      const calendarsMap = yjsService.getMap('calendars');
      expect(calendarsMap).toBeInstanceOf(Y.Map);
    });

    it('should return events map', () => {
      const eventsMap = yjsService.getMap('events');
      expect(eventsMap).toBeInstanceOf(Y.Map);
    });

    it('should return tasks map', () => {
      const tasksMap = yjsService.getMap('tasks');
      expect(tasksMap).toBeInstanceOf(Y.Map);
    });

    it('should return taskLists map', () => {
      const taskListsMap = yjsService.getMap('taskLists');
      expect(taskListsMap).toBeInstanceOf(Y.Map);
    });

    it('should return family map', () => {
      const familyMap = yjsService.getMap('family');
      expect(familyMap).toBeInstanceOf(Y.Map);
    });

    it('should return members map', () => {
      const membersMap = yjsService.getMap('members');
      expect(membersMap).toBeInstanceOf(Y.Map);
    });
  });

  describe('getArray', () => {
    beforeEach(async () => {
      await yjsService.initialize();
    });

    it('should return internalMessages array', () => {
      const messagesArray = yjsService.getArray('internalMessages');
      expect(messagesArray).toBeInstanceOf(Y.Array);
    });
  });

  describe('getStateVector', () => {
    it('should return state vector as Uint8Array', async () => {
      await yjsService.initialize();

      const stateVector = yjsService.getStateVector();

      expect(stateVector).toBeInstanceOf(Uint8Array);
    });
  });

  describe('getUpdate', () => {
    it('should return document update as Uint8Array', async () => {
      await yjsService.initialize();

      const update = yjsService.getUpdate();

      expect(update).toBeInstanceOf(Uint8Array);
    });
  });

  describe('applyUpdate', () => {
    it('should apply update to document', async () => {
      await yjsService.initialize();

      // Create an update from another document
      const otherDoc = new Y.Doc();
      otherDoc.getMap('calendars').set('test-cal', { id: 'test-cal', name: 'Test' });
      const update = Y.encodeStateAsUpdate(otherDoc);

      await yjsService.applyUpdate(update);

      const calendars = yjsService.getMap('calendars');
      expect(calendars.get('test-cal')).toBeDefined();

      otherDoc.destroy();
    });

    it('should persist update after applying', async () => {
      await yjsService.initialize();

      const otherDoc = new Y.Doc();
      const update = Y.encodeStateAsUpdate(otherDoc);

      await yjsService.applyUpdate(update);

      expect(mockPersistence.storeUpdate).toHaveBeenCalled();

      otherDoc.destroy();
    });
  });

  describe('forceUnlock', () => {
    it('should return true if no lock file exists', async () => {
      const { access } = await import('fs/promises');
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

      const result = await yjsService.forceUnlock();

      expect(result).toBe(true);
    });

    it('should remove lock file and return true', async () => {
      const { access, unlink } = await import('fs/promises');
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(unlink).mockResolvedValue(undefined);

      const result = await yjsService.forceUnlock();

      expect(unlink).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if lock file is held by another process', async () => {
      const { access, unlink } = await import('fs/promises');
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(unlink).mockRejectedValue(new Error('being used by another process'));

      const result = await yjsService.forceUnlock();

      expect(result).toBe(false);
    });
  });

  describe('close', () => {
    it('should close service and destroy document', async () => {
      await yjsService.initialize();

      await yjsService.close();

      expect(mockPersistence.flushDocument).toHaveBeenCalled();
      expect(mockPersistence.destroy).toHaveBeenCalled();
    });

    it('should stop garbage collection interval', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      await yjsService.initialize();
      await yjsService.close();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should not throw if already closed', async () => {
      await expect(yjsService.close()).resolves.not.toThrow();
    });

    it('should throw error when accessing document after close', async () => {
      await yjsService.initialize();
      await yjsService.close();

      expect(() => yjsService.getDocument()).toThrow('YjsService not initialized');
    });
  });

  describe('CRDT synchronization', () => {
    it('should synchronize data between documents', async () => {
      await yjsService.initialize();

      // Set data in the service's document
      const calendars = yjsService.getMap('calendars');
      calendars.set('cal-1', { id: 'cal-1', name: 'Work Calendar' });

      // Create another document and sync
      const otherDoc = new Y.Doc();
      const update = yjsService.getUpdate();
      Y.applyUpdate(otherDoc, update);

      // Verify sync
      const otherCalendars = otherDoc.getMap('calendars');
      const cal = otherCalendars.get('cal-1') as { id: string; name: string };
      expect(cal.id).toBe('cal-1');
      expect(cal.name).toBe('Work Calendar');

      otherDoc.destroy();
    });

    it('should handle concurrent edits', async () => {
      await yjsService.initialize();

      const doc1 = yjsService.getDocument();
      const doc2 = new Y.Doc();

      // Make concurrent edits
      doc1.getMap('calendars').set('cal-1', { id: 'cal-1', name: 'Calendar 1' });
      doc2.getMap('calendars').set('cal-2', { id: 'cal-2', name: 'Calendar 2' });

      // Sync both ways
      Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
      Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));

      // Both calendars should exist in both documents
      expect(doc1.getMap('calendars').get('cal-1')).toBeDefined();
      expect(doc1.getMap('calendars').get('cal-2')).toBeDefined();
      expect(doc2.getMap('calendars').get('cal-1')).toBeDefined();
      expect(doc2.getMap('calendars').get('cal-2')).toBeDefined();

      doc2.destroy();
    });
  });
});
