import { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useVersionInfo } from './useVersionInfo';

describe('useVersionInfo', () => {
  const mockGetVersion = vi.fn();
  const mockGetLastChecked = vi.fn();
  const mockCheck = vi.fn();
  const mockDownload = vi.fn();
  const mockInstall = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock electronAPI
    (window as unknown as { electronAPI: unknown }).electronAPI = {
      getVersion: mockGetVersion,
      updater: {
        getLastChecked: mockGetLastChecked,
        check: mockCheck,
        download: mockDownload,
        install: mockInstall,
      },
    };

    // Setup default mocks - make them resolve immediately
    mockGetVersion.mockResolvedValue('1.0.0');
    mockGetLastChecked.mockResolvedValue(null);
    mockCheck.mockResolvedValue({
      version: '1.0.0',
      currentVersion: '1.0.0',
      hasUpdate: false,
    });
    mockDownload.mockResolvedValue({ success: true });
    mockInstall.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useVersionInfo());

    expect(result.current.currentVersion).toBe('0.0.0');
    expect(result.current.updateInfo).toBeNull();
    expect(result.current.isChecking).toBe(false);
    expect(result.current.lastCheckedAt).toBeNull();
  });

  it('should load version and last checked on mount', async () => {
    const { result } = renderHook(() => useVersionInfo());

    // Wait for initialization to complete
    await waitFor(() => {
      expect(result.current.currentVersion).toBe('1.0.0');
      expect(result.current.lastCheckedAt).toBeNull();
    });
  });

  it('should load current version on mount', async () => {
    const { result } = renderHook(() => useVersionInfo());

    await waitFor(
      () => {
        expect(result.current.currentVersion).toBe('1.0.0');
      },
      { timeout: 2000 }
    );

    expect(mockGetVersion).toHaveBeenCalled();
  });

  it('should load last checked time on mount', async () => {
    const lastChecked = Date.now();
    mockGetLastChecked.mockResolvedValue(lastChecked);

    const { result } = renderHook(() => useVersionInfo());

    await waitFor(() => {
      expect(result.current.lastCheckedAt).toBe(lastChecked);
    });

    expect(mockGetLastChecked).toHaveBeenCalled();
  });

  it('should check for updates', async () => {
    const updateInfo = {
      version: '1.1.0',
      currentVersion: '1.0.0',
      hasUpdate: true,
      release: {
        tag_name: 'v1.1.0',
        name: 'Version 1.1.0',
        body: 'Release notes',
        published_at: new Date().toISOString(),
        assets: [],
        prerelease: false,
        draft: false,
      },
    };

    mockCheck.mockResolvedValue(updateInfo);
    const lastChecked = Date.now();
    mockGetLastChecked.mockResolvedValue(lastChecked);

    const { result } = renderHook(() => useVersionInfo());

    await waitFor(() => {
      expect(result.current.currentVersion).toBe('1.0.0');
    });

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(result.current.updateInfo).toEqual(updateInfo);
    expect(result.current.lastCheckedAt).toBe(lastChecked);
    expect(result.current.isChecking).toBe(false);
  });

  it.skip('should set isChecking to true while checking', async () => {
    let resolveCheck: (value: unknown) => void;
    mockCheck.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCheck = resolve;
        })
    );

    const { result } = renderHook(() => useVersionInfo());

    // Wait for the hook to be ready
    await waitFor(() => {
      expect(result.current.currentVersion).toBe('1.0.0');
    });

    const checkPromise = act(async () => {
      await result.current.checkForUpdates();
    });

    await waitFor(() => {
      expect(result.current.isChecking).toBe(true);
    });

    act(() => {
      if (resolveCheck) {
        resolveCheck({
          version: '1.0.0',
          currentVersion: '1.0.0',
          hasUpdate: false,
        });
      }
    });

    await checkPromise;

    expect(result.current.isChecking).toBe(false);
  });

  it.skip('should handle check errors', async () => {
    mockCheck.mockRejectedValue(new Error('Failed to check'));

    const { result } = renderHook(() => useVersionInfo());

    // Wait for the hook to be ready
    await waitFor(() => {
      expect(result.current.currentVersion).toBe('1.0.0');
    });

    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(result.current.isChecking).toBe(false);
    expect(result.current.updateInfo).toBeNull();
  });

  it.skip('should download update', async () => {
    const { result } = renderHook(() => useVersionInfo());

    // Wait for the hook to be ready
    await waitFor(() => {
      expect(result.current.currentVersion).toBe('1.0.0');
    });

    const response = await act(async () => {
      return await result.current.downloadUpdate();
    });

    expect(response.success).toBe(true);
    expect(mockDownload).toHaveBeenCalledWith(undefined);
  });

  it.skip('should download update with release URL', async () => {
    const releaseUrl = 'https://github.com/example/repo/releases/tag/v1.1.0';
    mockDownload.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useVersionInfo());

    // Wait for the hook to be ready
    await waitFor(() => {
      expect(result.current.currentVersion).toBe('1.0.0');
    });

    const response = await act(async () => {
      return await result.current.downloadUpdate(releaseUrl);
    });

    expect(response.success).toBe(true);
    expect(mockDownload).toHaveBeenCalledWith(releaseUrl);
  });

  it.skip('should handle download errors', async () => {
    mockDownload.mockResolvedValue({ success: false, error: 'Download failed' });

    const { result } = renderHook(() => useVersionInfo());

    // Wait for the hook to be ready
    await waitFor(() => {
      expect(result.current.currentVersion).toBe('1.0.0');
    });

    const response = await act(async () => {
      return await result.current.downloadUpdate();
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Download failed');
  });

  it.skip('should install update', async () => {
    const { result } = renderHook(() => useVersionInfo());

    // Wait for the hook to be ready
    await waitFor(() => {
      expect(result.current.currentVersion).toBe('1.0.0');
    });

    const response = await act(async () => {
      return await result.current.installUpdate();
    });

    expect(response.success).toBe(true);
    expect(mockInstall).toHaveBeenCalled();
  });

  it.skip('should handle install errors', async () => {
    mockInstall.mockResolvedValue({ success: false, error: 'Install failed' });

    const { result } = renderHook(() => useVersionInfo());

    // Wait for the hook to be ready
    await waitFor(() => {
      expect(result.current.currentVersion).toBe('1.0.0');
    });

    const response = await act(async () => {
      return await result.current.installUpdate();
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Install failed');
  });

  it.skip('should check for updates with notifyIfAvailable flag', async () => {
    const { result } = renderHook(() => useVersionInfo());

    // Wait for the hook to be ready
    await waitFor(() => {
      expect(result.current.currentVersion).toBe('1.0.0');
    });

    await act(async () => {
      await result.current.checkForUpdates(true);
    });

    expect(mockCheck).toHaveBeenCalledWith(true);
  });
});
