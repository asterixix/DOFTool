import https from 'https';

import type { NotificationService } from './NotificationService';
import type { shell as ElectronShell, app as ElectronApp } from 'electron';

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

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  hasUpdate: boolean;
  release?: GitHubRelease;
  downloadUrl?: string;
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

  public constructor(notificationService: NotificationService, currentVersion: string) {
    this.notificationService = notificationService;
    this.owner = 'asterixix';
    this.repo = 'DOFTool';
    this.currentVersion = currentVersion;
    this.updateCheckInProgress = false;
    this.lastCheckedAt = null;
  }

  public setElectronModules(modules: {
    shell: typeof ElectronShell;
    app: typeof ElectronApp;
  }): void {
    this.shell = modules.shell;
    this.app = modules.app;
  }

  public async checkForUpdates(notifyIfAvailable = true): Promise<UpdateInfo> {
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
      // Manual GitHub API check
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
        await this.notifyUpdateAvailable(latestVersion, latestRelease);
      }

      this.updateCheckInProgress = false;
      return {
        version: latestVersion,
        currentVersion: this.currentVersion,
        hasUpdate,
        release: latestRelease,
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
    // For now, we'll open the release page in the browser
    // Full auto-update installation requires electron-updater or manual download
    try {
      if (!this.shell) {
        // Fallback to dynamic import if not set
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
    // For manual installation, we just restart after download
    if (!this.app) {
      // Fallback to dynamic import if not set
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

  private async fetchGitHubReleases(): Promise<GitHubRelease[]> {
    return new Promise((resolve, reject) => {
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/releases`;
      const options: https.RequestOptions = {
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

  private async notifyUpdateAvailable(version: string, release?: GitHubRelease): Promise<void> {
    const releaseNotes =
      release?.body && release.body.length > 0
        ? release.body.substring(0, 200) + (release.body.length > 200 ? '...' : '')
        : undefined;

    await this.notificationService.emit({
      module: 'system',
      title: 'Update Available',
      body: `A new version (${version}) is available. Click to download and install.`,
      priority: 'normal',
      data: {
        action: 'update-available',
        version,
        releaseNotes,
        releaseUrl: release
          ? `https://github.com/${this.owner}/${this.repo}/releases/tag/${release.tag_name}`
          : undefined,
      },
    });
  }
}
