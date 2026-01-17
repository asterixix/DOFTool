import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
  currentVersion: string;
  hasUpdate: boolean;
  release?: {
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
  };
  downloadUrl?: string;
}

interface VersionInfoState {
  currentVersion: string;
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  lastCheckedAt: number | null;
}

interface UseVersionInfoReturn {
  currentVersion: string;
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  lastCheckedAt: number | null;
  checkForUpdates: (notifyIfAvailable?: boolean) => Promise<void>;
  downloadUpdate: (releaseUrl?: string) => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
}

export function useVersionInfo(): UseVersionInfoReturn {
  const [state, setState] = useState<VersionInfoState>({
    currentVersion: '0.0.0',
    updateInfo: null,
    isChecking: false,
    lastCheckedAt: null,
  });

  useEffect(() => {
    // Load current version on mount
    void window.electronAPI.getVersion().then((version) => {
      setState((prev) => ({ ...prev, currentVersion: version }));
    });

    // Load last checked time
    void window.electronAPI.updater.getLastChecked().then((lastChecked) => {
      setState((prev) => ({ ...prev, lastCheckedAt: lastChecked ?? null }));
    });
  }, []);

  const checkForUpdates = async (notifyIfAvailable = false): Promise<void> => {
    setState((prev) => ({ ...prev, isChecking: true }));
    try {
      const updateInfo = await window.electronAPI.updater.check(notifyIfAvailable);
      const lastChecked = await window.electronAPI.updater.getLastChecked();
      setState((prev) => ({
        ...prev,
        updateInfo,
        isChecking: false,
        lastCheckedAt: lastChecked ?? null,
      }));
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setState((prev) => ({ ...prev, isChecking: false }));
    }
  };

  const downloadUpdate = async (
    releaseUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    return await window.electronAPI.updater.download(releaseUrl);
  };

  const installUpdate = async (): Promise<{ success: boolean; error?: string }> => {
    return await window.electronAPI.updater.install();
  };

  return {
    currentVersion: state.currentVersion,
    updateInfo: state.updateInfo,
    isChecking: state.isChecking,
    lastCheckedAt: state.lastCheckedAt,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  };
}
