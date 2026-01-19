/**
 * preload.ts - Unit tests
 * Tests for Electron preload script and electronAPI structure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron modules before importing preload
const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
};

const mockContextBridge = {
  exposeInMainWorld: vi.fn(),
};

vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
}));

describe('preload', () => {
  let electronAPI: Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-import preload to capture the exposed API
    vi.resetModules();
    await import('./preload');

    // Get the API that was exposed
    const [apiName, api] = mockContextBridge.exposeInMainWorld.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(apiName).toBe('electronAPI');
    electronAPI = api;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exposeInMainWorld', () => {
    it('should expose electronAPI to the main world', () => {
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'electronAPI',
        expect.any(Object)
      );
    });
  });

  describe('electronAPI structure', () => {
    it('should have app info methods', () => {
      expect(electronAPI).toHaveProperty('getVersion');
      expect(electronAPI).toHaveProperty('getPlatform');
      expect(electronAPI).toHaveProperty('openExternal');
    });

    it('should have analytics namespace', () => {
      expect(electronAPI).toHaveProperty('analytics');
      const analytics = electronAPI.analytics as Record<string, unknown>;
      expect(analytics).toHaveProperty('track');
    });

    it('should have updater namespace', () => {
      expect(electronAPI).toHaveProperty('updater');
      const updater = electronAPI.updater as Record<string, unknown>;
      expect(updater).toHaveProperty('check');
      expect(updater).toHaveProperty('download');
      expect(updater).toHaveProperty('install');
      expect(updater).toHaveProperty('getLastChecked');
    });

    it('should have notifications namespace', () => {
      expect(electronAPI).toHaveProperty('notifications');
      const notifications = electronAPI.notifications as Record<string, unknown>;
      expect(notifications).toHaveProperty('getPreferences');
      expect(notifications).toHaveProperty('updatePreferences');
      expect(notifications).toHaveProperty('getHistory');
      expect(notifications).toHaveProperty('clearHistory');
      expect(notifications).toHaveProperty('emit');
    });

    it('should have encryption namespace', () => {
      expect(electronAPI).toHaveProperty('encryption');
      const encryption = electronAPI.encryption as Record<string, unknown>;
      expect(encryption).toHaveProperty('generateKey');
      expect(encryption).toHaveProperty('deriveKey');
      expect(encryption).toHaveProperty('generateSalt');
      expect(encryption).toHaveProperty('encrypt');
      expect(encryption).toHaveProperty('decrypt');
      expect(encryption).toHaveProperty('hash');
      expect(encryption).toHaveProperty('hashString');
      expect(encryption).toHaveProperty('generateToken');
    });

    it('should have yjs namespace', () => {
      expect(electronAPI).toHaveProperty('yjs');
      const yjs = electronAPI.yjs as Record<string, unknown>;
      expect(yjs).toHaveProperty('getDocumentState');
      expect(yjs).toHaveProperty('applyUpdate');
      expect(yjs).toHaveProperty('getMap');
      expect(yjs).toHaveProperty('forceUnlock');
    });

    it('should have storage namespace', () => {
      expect(electronAPI).toHaveProperty('storage');
      const storage = electronAPI.storage as Record<string, unknown>;
      expect(storage).toHaveProperty('get');
      expect(storage).toHaveProperty('set');
      expect(storage).toHaveProperty('delete');
      expect(storage).toHaveProperty('getKeysByPrefix');
    });

    it('should have family namespace', () => {
      expect(electronAPI).toHaveProperty('family');
      const family = electronAPI.family as Record<string, unknown>;
      expect(family).toHaveProperty('get');
      expect(family).toHaveProperty('create');
      expect(family).toHaveProperty('invite');
      expect(family).toHaveProperty('join');
      expect(family).toHaveProperty('devices');
      expect(family).toHaveProperty('removeDevice');
      expect(family).toHaveProperty('getPermissions');
      expect(family).toHaveProperty('setPermission');
    });

    it('should have calendar namespace', () => {
      expect(electronAPI).toHaveProperty('calendar');
      const calendar = electronAPI.calendar as Record<string, unknown>;
      expect(calendar).toHaveProperty('getAll');
      expect(calendar).toHaveProperty('get');
      expect(calendar).toHaveProperty('create');
      expect(calendar).toHaveProperty('update');
      expect(calendar).toHaveProperty('delete');
      expect(calendar).toHaveProperty('getEvents');
      expect(calendar).toHaveProperty('getEvent');
      expect(calendar).toHaveProperty('createEvent');
      expect(calendar).toHaveProperty('updateEvent');
      expect(calendar).toHaveProperty('deleteEvent');
      expect(calendar).toHaveProperty('importICal');
      expect(calendar).toHaveProperty('exportICal');
      expect(calendar).toHaveProperty('subscribeExternal');
      expect(calendar).toHaveProperty('unsubscribeExternal');
      expect(calendar).toHaveProperty('syncExternal');
      expect(calendar).toHaveProperty('getSyncStatus');
      expect(calendar).toHaveProperty('share');
      expect(calendar).toHaveProperty('updateShare');
      expect(calendar).toHaveProperty('unshare');
      expect(calendar).toHaveProperty('reminderSettings');
      expect(calendar).toHaveProperty('getShares');
    });

    it('should have tasks namespace', () => {
      expect(electronAPI).toHaveProperty('tasks');
      const tasks = electronAPI.tasks as Record<string, unknown>;
      expect(tasks).toHaveProperty('getLists');
      expect(tasks).toHaveProperty('getList');
      expect(tasks).toHaveProperty('createList');
      expect(tasks).toHaveProperty('updateList');
      expect(tasks).toHaveProperty('deleteList');
      expect(tasks).toHaveProperty('getTasks');
      expect(tasks).toHaveProperty('getTask');
      expect(tasks).toHaveProperty('createTask');
      expect(tasks).toHaveProperty('updateTask');
      expect(tasks).toHaveProperty('deleteTask');
      expect(tasks).toHaveProperty('import');
      expect(tasks).toHaveProperty('export');
      expect(tasks).toHaveProperty('shareList');
      expect(tasks).toHaveProperty('updateListShare');
      expect(tasks).toHaveProperty('unshareList');
      expect(tasks).toHaveProperty('getListShares');
    });

    it('should have email namespace', () => {
      expect(electronAPI).toHaveProperty('email');
      const email = electronAPI.email as Record<string, unknown>;
      expect(email).toHaveProperty('getAccounts');
      expect(email).toHaveProperty('addAccount');
      expect(email).toHaveProperty('removeAccount');
      expect(email).toHaveProperty('fetchMessages');
      expect(email).toHaveProperty('fetchMessage');
      expect(email).toHaveProperty('sendMessage');
      expect(email).toHaveProperty('search');
      expect(email).toHaveProperty('rebuildSearchIndex');
      expect(email).toHaveProperty('getFolders');
      expect(email).toHaveProperty('createFolder');
      expect(email).toHaveProperty('renameFolder');
      expect(email).toHaveProperty('deleteFolder');
      expect(email).toHaveProperty('moveMessagesToFolder');
      expect(email).toHaveProperty('markAsRead');
      expect(email).toHaveProperty('markAsStarred');
      expect(email).toHaveProperty('deleteMessage');
      expect(email).toHaveProperty('moveMessage');
    });

    it('should have emailLabels namespace', () => {
      expect(electronAPI).toHaveProperty('emailLabels');
      const emailLabels = electronAPI.emailLabels as Record<string, unknown>;
      expect(emailLabels).toHaveProperty('getAll');
      expect(emailLabels).toHaveProperty('create');
      expect(emailLabels).toHaveProperty('update');
      expect(emailLabels).toHaveProperty('delete');
      expect(emailLabels).toHaveProperty('apply');
      expect(emailLabels).toHaveProperty('remove');
    });

    it('should have emailSettings namespace', () => {
      expect(electronAPI).toHaveProperty('emailSettings');
      const emailSettings = electronAPI.emailSettings as Record<string, unknown>;
      expect(emailSettings).toHaveProperty('getSettings');
      expect(emailSettings).toHaveProperty('updateSettings');
      expect(emailSettings).toHaveProperty('createAccount');
      expect(emailSettings).toHaveProperty('updateAccount');
      expect(emailSettings).toHaveProperty('deleteAccount');
      expect(emailSettings).toHaveProperty('testConnection');
    });

    it('should have sync namespace', () => {
      expect(electronAPI).toHaveProperty('sync');
      const sync = electronAPI.sync as Record<string, unknown>;
      expect(sync).toHaveProperty('getStatus');
      expect(sync).toHaveProperty('forceSync');
      expect(sync).toHaveProperty('getPeers');
      expect(sync).toHaveProperty('start');
      expect(sync).toHaveProperty('stop');
      expect(sync).toHaveProperty('getDiscoveredPeers');
      expect(sync).toHaveProperty('initialize');
    });

    it('should have event listener methods', () => {
      expect(electronAPI).toHaveProperty('on');
      expect(electronAPI).toHaveProperty('off');
      expect(electronAPI).toHaveProperty('removeAllListeners');
    });
  });

  describe('IPC channel calls', () => {
    describe('app methods', () => {
      it('getVersion should invoke app:version', async () => {
        mockIpcRenderer.invoke.mockResolvedValue('1.0.0');
        const getVersion = electronAPI.getVersion as () => Promise<string>;
        await getVersion();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('app:version');
      });

      it('getPlatform should invoke app:platform', async () => {
        mockIpcRenderer.invoke.mockResolvedValue('darwin');
        const getPlatform = electronAPI.getPlatform as () => Promise<string>;
        await getPlatform();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('app:platform');
      });

      it('openExternal should invoke app:openExternal with URL', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ success: true });
        const openExternal = electronAPI.openExternal as (
          url: string
        ) => Promise<{ success: boolean }>;
        await openExternal('https://example.com');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'app:openExternal',
          'https://example.com'
        );
      });
    });

    describe('analytics methods', () => {
      it('track should invoke analytics:track', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ success: true });
        const analytics = electronAPI.analytics as {
          track: (
            name: string,
            props?: Record<string, string | number | boolean>
          ) => Promise<{ success: boolean }>;
        };
        await analytics.track('test_event', { prop: 'value' });
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('analytics:track', 'test_event', {
          prop: 'value',
        });
      });
    });

    describe('storage methods', () => {
      it('get should invoke storage:get', async () => {
        mockIpcRenderer.invoke.mockResolvedValue('stored_value');
        const storage = electronAPI.storage as {
          get: (key: string) => Promise<string | undefined>;
        };
        await storage.get('test_key');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('storage:get', 'test_key');
      });

      it('set should invoke storage:set', async () => {
        mockIpcRenderer.invoke.mockResolvedValue(true);
        const storage = electronAPI.storage as {
          set: (key: string, value: string) => Promise<boolean>;
        };
        await storage.set('test_key', 'test_value');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
          'storage:set',
          'test_key',
          'test_value'
        );
      });

      it('delete should invoke storage:delete', async () => {
        mockIpcRenderer.invoke.mockResolvedValue(true);
        const storage = electronAPI.storage as { delete: (key: string) => Promise<boolean> };
        await storage.delete('test_key');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('storage:delete', 'test_key');
      });
    });

    describe('encryption methods', () => {
      it('generateKey should invoke encryption:generateKey', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ id: 'key-id', key: [1, 2, 3] });
        const encryption = electronAPI.encryption as {
          generateKey: () => Promise<{ id: string; key: number[] }>;
        };
        await encryption.generateKey();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('encryption:generateKey');
      });

      it('hashString should invoke encryption:hashString', async () => {
        mockIpcRenderer.invoke.mockResolvedValue('hashed_string');
        const encryption = electronAPI.encryption as {
          hashString: (text: string) => Promise<string>;
        };
        await encryption.hashString('test_text');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('encryption:hashString', 'test_text');
      });
    });

    describe('family methods', () => {
      it('create should invoke family:create', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ family: { id: '1', name: 'Test' } });
        const family = electronAPI.family as {
          create: (name: string) => Promise<unknown>;
        };
        await family.create('Test Family');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('family:create', 'Test Family');
      });

      it('join should invoke family:join', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ success: true });
        const family = electronAPI.family as {
          join: (token: string) => Promise<{ success: boolean }>;
        };
        await family.join('invite-token');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('family:join', 'invite-token');
      });
    });

    describe('calendar methods', () => {
      it('getAll should invoke calendar:getAll', async () => {
        mockIpcRenderer.invoke.mockResolvedValue([]);
        const calendar = electronAPI.calendar as { getAll: () => Promise<unknown[]> };
        await calendar.getAll();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('calendar:getAll');
      });

      it('create should invoke calendar:create', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ id: 'cal-1' });
        const calendar = electronAPI.calendar as {
          create: (data: unknown) => Promise<unknown>;
        };
        await calendar.create({ name: 'Test Calendar', color: 'blue' });
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('calendar:create', {
          name: 'Test Calendar',
          color: 'blue',
        });
      });
    });

    describe('tasks methods', () => {
      it('getLists should invoke tasks:getLists', async () => {
        mockIpcRenderer.invoke.mockResolvedValue([]);
        const tasks = electronAPI.tasks as { getLists: () => Promise<unknown[]> };
        await tasks.getLists();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('tasks:getLists');
      });

      it('createTask should invoke tasks:createTask', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ id: 'task-1' });
        const tasks = electronAPI.tasks as {
          createTask: (data: unknown) => Promise<unknown>;
        };
        await tasks.createTask({ taskListId: 'list-1', title: 'Test Task' });
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('tasks:createTask', {
          taskListId: 'list-1',
          title: 'Test Task',
        });
      });
    });

    describe('sync methods', () => {
      it('getStatus should invoke sync:status', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ status: 'connected', peerCount: 1 });
        const sync = electronAPI.sync as { getStatus: () => Promise<unknown> };
        await sync.getStatus();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('sync:status');
      });

      it('forceSync should invoke sync:force', async () => {
        mockIpcRenderer.invoke.mockResolvedValue({ success: true });
        const sync = electronAPI.sync as { forceSync: () => Promise<{ success: boolean }> };
        await sync.forceSync();
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('sync:force');
      });
    });
  });

  describe('event listeners', () => {
    it('on should register listener for valid channels', () => {
      const callback = vi.fn();
      const on = electronAPI.on as (
        channel: string,
        callback: (...args: unknown[]) => void
      ) => void;

      on('sync:status-changed', callback);

      expect(mockIpcRenderer.on).toHaveBeenCalledWith('sync:status-changed', expect.any(Function));
    });

    it('on should not register listener for invalid channels', () => {
      const callback = vi.fn();
      const on = electronAPI.on as (
        channel: string,
        callback: (...args: unknown[]) => void
      ) => void;

      on('invalid:channel', callback);

      expect(mockIpcRenderer.on).not.toHaveBeenCalled();
    });

    it('on should accept all valid channels', () => {
      const validChannels = [
        'sync:status-changed',
        'sync:peer-connected',
        'sync:peer-disconnected',
        'notifications:updated',
        'calendar:updated',
        'tasks:updated',
        'email:new-message',
        'family:member-joined',
      ];

      const on = electronAPI.on as (
        channel: string,
        callback: (...args: unknown[]) => void
      ) => void;

      validChannels.forEach((channel) => {
        vi.clearAllMocks();
        on(channel, vi.fn());
        expect(mockIpcRenderer.on).toHaveBeenCalledWith(channel, expect.any(Function));
      });
    });

    it('off should remove listener', () => {
      const callback = vi.fn();
      const off = electronAPI.off as (
        channel: string,
        callback: (...args: unknown[]) => void
      ) => void;

      off('sync:status-changed', callback);

      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith('sync:status-changed', callback);
    });

    it('removeAllListeners should remove all listeners for channel', () => {
      const removeAllListeners = electronAPI.removeAllListeners as (channel: string) => void;

      removeAllListeners('sync:status-changed');

      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith('sync:status-changed');
    });
  });
});
