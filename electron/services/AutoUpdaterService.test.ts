import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AutoUpdaterService } from './AutoUpdaterService';

import type { NotificationService } from './NotificationService';

// Mock electron-updater with event emitter functionality
const mockAutoUpdater = {
  setFeedURL: vi.fn(),
  autoDownload: false,
  autoInstallOnAppQuit: true,
  allowPrerelease: false,
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
  on: vi.fn(),
};

vi.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater,
}));

// Mock electron shell and app
vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
  app: {
    relaunch: vi.fn(),
    exit: vi.fn(),
  },
}));

// Mock https for GitHub API fallback
interface MockHttpsResponse {
  statusCode: number;
  on: ReturnType<typeof vi.fn>;
}

const mockHttpsResponse: MockHttpsResponse = {
  statusCode: 200,
  on: vi.fn(),
};

type HttpsCallback = (res: MockHttpsResponse) => void;

const mockHttpsGet = vi.fn((_url: string, _options: unknown, callback?: HttpsCallback) => {
  if (callback) {
    callback(mockHttpsResponse);
  }
  return { on: vi.fn() };
});

vi.mock('https', () => ({
  default: {
    get: mockHttpsGet,
  },
  get: mockHttpsGet,
}));

describe('AutoUpdaterService', () => {
  let autoUpdaterService: AutoUpdaterService;
  let mockNotificationService: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockNotificationService = {
      emit: vi.fn().mockResolvedValue(null),
      initialize: vi.fn().mockResolvedValue(undefined),
      getPreferences: vi.fn(),
      updatePreferences: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
      clearHistory: vi.fn(),
    } as unknown as NotificationService;

    autoUpdaterService = new AutoUpdaterService(mockNotificationService, '1.0.0');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with current version', () => {
      expect(autoUpdaterService.getCurrentVersion()).toBe('1.0.0');
    });

    it('should set lastCheckedAt to null initially', () => {
      expect(autoUpdaterService.getLastCheckedAt()).toBeNull();
    });

    it('should set download progress to 0 initially', () => {
      expect(autoUpdaterService.getDownloadProgress()).toBe(0);
    });

    it('should not be downloading initially', () => {
      expect(autoUpdaterService.isDownloadInProgress()).toBe(false);
    });

    it('should not be ready to install initially', () => {
      expect(autoUpdaterService.isReadyToInstall()).toBe(false);
    });
  });

  describe('setElectronModules', () => {
    it('should set electron shell and app modules', () => {
      const mockShell = { openExternal: vi.fn() };
      const mockApp = { relaunch: vi.fn(), exit: vi.fn() };

      autoUpdaterService.setElectronModules({
        shell: mockShell as never,
        app: mockApp as never,
      });

      expect(autoUpdaterService).toBeDefined();
    });
  });

  describe('checkForUpdates', () => {
    beforeEach(async () => {
      // Wait for async initialization
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should return current version info when no update available', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '1.0.0',
          releaseNotes: '',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();

      expect(result.currentVersion).toBe('1.0.0');
      expect(result.hasUpdate).toBe(false);
    });

    it('should detect newer version available', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '2.0.0',
          releaseNotes: 'New features',
          releaseName: 'Version 2.0',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();

      expect(result.hasUpdate).toBe(true);
      expect(result.version).toBe('2.0.0');
      expect(result.releaseNotes).toBe('New features');
    });

    it('should update lastCheckedAt timestamp', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '1.0.0',
          releaseNotes: '',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const beforeCheck = Date.now();
      await autoUpdaterService.checkForUpdates();
      const lastChecked = autoUpdaterService.getLastCheckedAt();

      expect(lastChecked).not.toBeNull();
      expect(lastChecked).toBeGreaterThanOrEqual(beforeCheck);
    });

    it('should handle check failure gracefully', async () => {
      mockAutoUpdater.checkForUpdates.mockRejectedValue(new Error('Network error'));

      // Setup GitHub API mock to also fail
      mockHttpsGet.mockImplementation((_url, _options, callback) => {
        const mockRes = {
          statusCode: 500,
          on: vi.fn(),
        };
        if (typeof callback === 'function') {
          callback(mockRes);
        }
        return { on: vi.fn() };
      });

      const result = await autoUpdaterService.checkForUpdates();

      expect(result.hasUpdate).toBe(false);
      expect(result.currentVersion).toBe('1.0.0');
    });

    it('should notify when update is available', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '2.0.0',
          releaseNotes: 'Bug fixes',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      await autoUpdaterService.checkForUpdates(true);

      expect(mockNotificationService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'system',
          title: 'Update Available',
          priority: 'normal',
        })
      );
    });

    it('should not notify when notifyIfAvailable is false', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '2.0.0',
          releaseNotes: 'Bug fixes',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      await autoUpdaterService.checkForUpdates(false);

      expect(mockNotificationService.emit).not.toHaveBeenCalled();
    });
  });

  describe('downloadUpdate', () => {
    it('should open release page when shell is configured', async () => {
      const mockShell = {
        openExternal: vi.fn().mockResolvedValue(undefined),
      };

      autoUpdaterService.setElectronModules({
        shell: mockShell as never,
        app: {} as never,
      });

      const result = await autoUpdaterService.downloadUpdate();

      expect(result.success).toBe(true);
      expect(mockShell.openExternal).toHaveBeenCalledWith(
        expect.stringContaining('github.com/asterixix/DOFTool/releases')
      );
    });

    it('should use custom release URL when provided', async () => {
      const mockShell = {
        openExternal: vi.fn().mockResolvedValue(undefined),
      };

      autoUpdaterService.setElectronModules({
        shell: mockShell as never,
        app: {} as never,
      });

      const customUrl = 'https://example.com/release/v2.0.0';
      const result = await autoUpdaterService.downloadUpdate(customUrl);

      expect(result.success).toBe(true);
      expect(mockShell.openExternal).toHaveBeenCalledWith(customUrl);
    });

    it('should return error when opening release page fails', async () => {
      const mockShell = {
        openExternal: vi.fn().mockRejectedValue(new Error('Failed to open')),
      };

      autoUpdaterService.setElectronModules({
        shell: mockShell as never,
        app: {} as never,
      });

      const result = await autoUpdaterService.downloadUpdate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to open');
    });
  });

  describe('quitAndInstall', () => {
    it('should relaunch app when update is not ready', async () => {
      const mockApp = {
        relaunch: vi.fn(),
        exit: vi.fn(),
      };

      autoUpdaterService.setElectronModules({
        shell: {} as never,
        app: mockApp as never,
      });

      await autoUpdaterService.quitAndInstall();

      expect(mockApp.relaunch).toHaveBeenCalled();
      expect(mockApp.exit).toHaveBeenCalled();
    });
  });

  describe('version comparison', () => {
    beforeEach(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should correctly compare major versions', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '2.0.0',
          releaseNotes: '',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();
      expect(result.hasUpdate).toBe(true);
    });

    it('should correctly compare minor versions', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '1.1.0',
          releaseNotes: '',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();
      expect(result.hasUpdate).toBe(true);
    });

    it('should correctly compare patch versions', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '1.0.1',
          releaseNotes: '',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();
      expect(result.hasUpdate).toBe(true);
    });

    it('should handle v-prefix in version strings', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: 'v1.1.0',
          releaseNotes: '',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();
      expect(result.hasUpdate).toBe(true);
    });

    it('should return false for older version', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '0.9.0',
          releaseNotes: '',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();
      expect(result.hasUpdate).toBe(false);
    });

    it('should return false for same version', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '1.0.0',
          releaseNotes: '',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();
      expect(result.hasUpdate).toBe(false);
    });
  });

  describe('release notes formatting', () => {
    beforeEach(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should handle string release notes', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '2.0.0',
          releaseNotes: 'Simple release notes string',
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();
      expect(result.releaseNotes).toBe('Simple release notes string');
    });

    it('should handle array of release notes', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '2.0.0',
          releaseNotes: [
            { version: '2.0.0', note: 'New feature' },
            { version: '1.9.0', note: 'Bug fix' },
          ],
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();
      expect(result.releaseNotes).toContain('## 2.0.0');
      expect(result.releaseNotes).toContain('New feature');
    });

    it('should handle undefined release notes', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: {
          version: '2.0.0',
          releaseNotes: undefined,
          releaseDate: new Date().toISOString(),
        },
        cancellationToken: null,
      });

      const result = await autoUpdaterService.checkForUpdates();
      expect(result.releaseNotes).toBeUndefined();
    });
  });

  describe('getters', () => {
    it('should return current version', () => {
      expect(autoUpdaterService.getCurrentVersion()).toBe('1.0.0');
    });

    it('should return initial download progress as 0', () => {
      expect(autoUpdaterService.getDownloadProgress()).toBe(0);
    });

    it('should return null for lastCheckedAt before any check', () => {
      expect(autoUpdaterService.getLastCheckedAt()).toBeNull();
    });

    it('should return false for isDownloadInProgress initially', () => {
      expect(autoUpdaterService.isDownloadInProgress()).toBe(false);
    });

    it('should return false for isReadyToInstall initially', () => {
      expect(autoUpdaterService.isReadyToInstall()).toBe(false);
    });
  });
});
