/**
 * Auto-Updater Service - Handles automatic updates using electron-updater
 * Compatible with Electron Forge GitHub publisher
 */

import type { NotificationService } from './NotificationService';
import type { shell as ElectronShell, app as ElectronApp } from 'electron';
import type { autoUpdater } from 'electron-updater';
import type { RequestOptions } from 'https';

// electron-updater types
interface UpdateInfo {
  version: string;
  releaseNotes?: string | ReleaseNoteInfo[];
  releaseName?: string;
  releaseDate: string;
}

interface ReleaseNoteInfo {
  version: string;
  note: string | null;
}

interface ProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

export interface AppUpdateInfo {
  version: string;
  currentVersion: string;
  hasUpdate: boolean;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate?: string;
  downloadProgress?: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
  prerelease: boolean;
  draft: boolean;
}

export class AutoUpdaterService {
  private readonly notificationService: NotificationService;
  private readonly owner: string;
  private readonly repo: string;
  private readonly currentVersion: string;
  private updateCheckInProgress: boolean;
  private lastCheckedAt: number | null;
  private shell?: typeof ElectronShell;
  private app?: typeof ElectronApp;
  private autoUpdater: typeof autoUpdater | null = null;
  private updateAvailable: UpdateInfo | null = null;
  private downloadProgress: number = 0;
  private isDownloading: boolean = false;
  private isUpdateDownloaded: boolean = false;

  public constructor(notificationService: NotificationService, currentVersion: string) {
    this.notificationService = notificationService;
    this.owner = 'asterixix';
    this.repo = 'DOFTool';
    this.currentVersion = currentVersion;
    this.updateCheckInProgress = false;
    this.lastCheckedAt = null;

    // Initialize electron-updater asynchronously
    void this.initializeAutoUpdater();
  }

  private async initializeAutoUpdater(): Promise<void> {
    try {
      // Dynamic import to handle cases where electron-updater might not be available
      const { autoUpdater } = await import('electron-updater');
      this.autoUpdater = autoUpdater;

      // Configure auto-updater for GitHub releases
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: this.owner,
        repo: this.repo,
      });

      // Don't auto-download updates - let the user decide
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;

      // Allow prereleases based on environment
      autoUpdater.allowPrerelease = false;

      // Set up event listeners
      autoUpdater.on('checking-for-update', () => {
        console.log('[AutoUpdater] Checking for updates...');
      });

      autoUpdater.on('update-available', (info: UpdateInfo) => {
        console.log('[AutoUpdater] Update available:', info.version);
        this.updateAvailable = info;
        void this.notifyUpdateAvailable(info);
      });

      autoUpdater.on('update-not-available', (_info: UpdateInfo) => {
        console.log('[AutoUpdater] No updates available');
      });

      autoUpdater.on('download-progress', (progress: ProgressInfo) => {
        this.downloadProgress = progress.percent;
        console.log(`[AutoUpdater] Download progress: ${Math.round(progress.percent)}%`);
      });

      autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
        console.log('[AutoUpdater] Update downloaded:', info.version);
        this.isDownloading = false;
        this.isUpdateDownloaded = true;
        void this.notifyUpdateReady(info);
      });

      autoUpdater.on('error', (error: Error) => {
        console.error('[AutoUpdater] Error:', error.message);
        this.isDownloading = false;
      });

      console.log('[AutoUpdater] Initialized successfully');
    } catch (error) {
      console.error('[AutoUpdater] Failed to initialize electron-updater:', error);
      // Fallback to manual GitHub API checking will be used
    }
  }

  public setElectronModules(modules: {
    shell: typeof ElectronShell;
    app: typeof ElectronApp;
  }): void {
    this.shell = modules.shell;
    this.app = modules.app;
  }

  public async checkForUpdates(notifyIfAvailable = true): Promise<AppUpdateInfo> {
    if (this.updateCheckInProgress) {
      return {
        version: this.currentVersion,
        currentVersion: this.currentVersion,
        hasUpdate: false,
      };
    }

    this.updateCheckInProgress = true;
    this.lastCheckedAt = Date.now();

    try {
      // Try using electron-updater if available
      if (this.autoUpdater) {
        try {
          const result = await this.autoUpdater.checkForUpdates();

          this.updateCheckInProgress = false;

          if (result?.updateInfo) {
            const hasUpdate = this.isNewerVersion(result.updateInfo.version, this.currentVersion);

            return {
              version: result.updateInfo.version,
              currentVersion: this.currentVersion,
              hasUpdate,
              releaseNotes: this.formatReleaseNotes(result.updateInfo.releaseNotes),
              releaseName: result.updateInfo.releaseName,
              releaseDate: result.updateInfo.releaseDate,
            };
          }
        } catch (autoUpdaterError) {
          console.warn(
            '[AutoUpdater] electron-updater check failed, falling back to GitHub API:',
            autoUpdaterError
          );
        }
      }

      // Fallback to manual GitHub API check
      const releases = await this.fetchGitHubReleases();
      if (releases.length === 0) {
        this.updateCheckInProgress = false;
        return {
          version: this.currentVersion,
          currentVersion: this.currentVersion,
          hasUpdate: false,
        };
      }

      // Get the latest non-draft, non-prerelease release
      const latestRelease = releases.find((r) => !r.draft && !r.prerelease) ?? releases[0];

      if (!latestRelease) {
        this.updateCheckInProgress = false;
        return {
          version: this.currentVersion,
          currentVersion: this.currentVersion,
          hasUpdate: false,
        };
      }

      const latestVersion = this.normalizeVersion(latestRelease.tag_name);
      const hasUpdate = this.isNewerVersion(latestVersion, this.currentVersion);

      if (hasUpdate && notifyIfAvailable) {
        await this.notifyUpdateAvailable({
          version: latestVersion,
          releaseNotes: latestRelease.body,
          releaseName: latestRelease.name,
          releaseDate: latestRelease.published_at,
        });
      }

      this.updateCheckInProgress = false;
      return {
        version: latestVersion,
        currentVersion: this.currentVersion,
        hasUpdate,
        releaseNotes: latestRelease.body,
        releaseName: latestRelease.name,
        releaseDate: latestRelease.published_at,
      };
    } catch (error) {
      this.updateCheckInProgress = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AutoUpdater] Failed to check for updates:', errorMessage);
      return {
        version: this.currentVersion,
        currentVersion: this.currentVersion,
        hasUpdate: false,
      };
    }
  }

  public async downloadUpdate(releaseUrl?: string): Promise<{ success: boolean; error?: string }> {
    // Try using electron-updater for automatic download
    if (this.autoUpdater && this.updateAvailable) {
      try {
        this.isDownloading = true;
        this.downloadProgress = 0;
        await this.autoUpdater.downloadUpdate();
        return { success: true };
      } catch (error) {
        this.isDownloading = false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[AutoUpdater] Failed to download update:', errorMessage);
        // Fall through to manual download
      }
    }

    // Fallback: open the release page in the browser for manual download
    try {
      if (!this.shell) {
        const electron = await import('electron');
        const url = releaseUrl ?? `https://github.com/${this.owner}/${this.repo}/releases/latest`;
        await electron.shell.openExternal(url);
        return { success: true };
      }
      const url = releaseUrl ?? `https://github.com/${this.owner}/${this.repo}/releases/latest`;
      await this.shell.openExternal(url);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AutoUpdater] Failed to open release page:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  public async quitAndInstall(): Promise<void> {
    // If update is downloaded via electron-updater, use its install method
    if (this.autoUpdater && this.isUpdateDownloaded) {
      this.autoUpdater.quitAndInstall(false, true);
      return;
    }

    // Fallback: just restart the app
    if (!this.app) {
      const electron = await import('electron');
      electron.app.relaunch();
      electron.app.exit();
      return;
    }
    this.app.relaunch();
    this.app.exit();
  }

  public getLastCheckedAt(): number | null {
    return this.lastCheckedAt;
  }

  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  public getDownloadProgress(): number {
    return this.downloadProgress;
  }

  public isDownloadInProgress(): boolean {
    return this.isDownloading;
  }

  public isReadyToInstall(): boolean {
    return this.isUpdateDownloaded;
  }

  private async fetchGitHubReleases(): Promise<GitHubRelease[]> {
    // Use dynamic import for https
    const https = await import('https');

    return new Promise((resolve, reject) => {
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/releases`;
      const options: RequestOptions = {
        headers: {
          'User-Agent': 'DOFTool-AutoUpdater',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      https
        .get(url, options, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`GitHub API returned status ${response.statusCode ?? 'unknown'}`));
            return;
          }

          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            try {
              const releases = JSON.parse(data) as unknown;
              if (!Array.isArray(releases)) {
                reject(new Error('Invalid response format from GitHub API'));
                return;
              }
              resolve(releases as GitHubRelease[]);
            } catch (error) {
              reject(error instanceof Error ? error : new Error(String(error)));
            }
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  private normalizeVersion(version: string): string {
    // Remove 'v' prefix if present
    return version.replace(/^v/i, '');
  }

  private isNewerVersion(version1: string, version2: string): boolean {
    const v1Parts = this.parseVersion(this.normalizeVersion(version1));
    const v2Parts = this.parseVersion(this.normalizeVersion(version2));

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] ?? 0;
      const v2Part = v2Parts[i] ?? 0;

      if (v1Part > v2Part) {
        return true;
      }
      if (v1Part < v2Part) {
        return false;
      }
    }

    return false;
  }

  private parseVersion(version: string): number[] {
    return version.split('.').map((part) => {
      const num = Number.parseInt(part.replace(/[^0-9]/g, ''), 10);
      return Number.isNaN(num) ? 0 : num;
    });
  }

  private formatReleaseNotes(notes: string | ReleaseNoteInfo[] | undefined): string | undefined {
    if (!notes) {
      return undefined;
    }

    if (typeof notes === 'string') {
      return notes;
    }

    // Handle array of release notes
    return notes
      .map((note) => {
        if (note.note) {
          return `## ${note.version}\n${note.note}`;
        }
        return `## ${note.version}`;
      })
      .join('\n\n');
  }

  private async notifyUpdateAvailable(info: UpdateInfo): Promise<void> {
    const releaseNotes = this.formatReleaseNotes(info.releaseNotes);
    const truncatedNotes =
      releaseNotes && releaseNotes.length > 200
        ? releaseNotes.substring(0, 200) + '...'
        : releaseNotes;

    await this.notificationService.emit({
      module: 'system',
      title: 'Update Available',
      body: `A new version (${info.version}) is available. Click to download and install.`,
      priority: 'normal',
      data: {
        action: 'update-available',
        version: info.version,
        releaseNotes: truncatedNotes,
        releaseUrl: `https://github.com/${this.owner}/${this.repo}/releases/tag/v${info.version}`,
      },
    });
  }

  private async notifyUpdateReady(info: UpdateInfo): Promise<void> {
    await this.notificationService.emit({
      module: 'system',
      title: 'Update Ready to Install',
      body: `Version ${info.version} has been downloaded. Restart to apply the update.`,
      priority: 'urgent',
      data: {
        action: 'update-ready',
        version: info.version,
      },
    });
  }
}
