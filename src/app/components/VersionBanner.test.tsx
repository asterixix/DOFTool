import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { VersionBanner } from './VersionBanner';

const mockUseVersionInfo = {
  currentVersion: '1.0.0',
  updateInfo: null as {
    hasUpdate: boolean;
    version?: string;
    release?: { tag_name: string; body: string };
  } | null,
  isChecking: false,
  lastCheckedAt: new Date().toISOString(),
  checkForUpdates: vi.fn().mockResolvedValue(undefined),
  downloadUpdate: vi.fn().mockResolvedValue(undefined),
  installUpdate: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/hooks/useVersionInfo', () => ({
  useVersionInfo: vi.fn(() => mockUseVersionInfo),
}));

describe('VersionBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockUseVersionInfo, {
      currentVersion: '1.0.0',
      updateInfo: null,
      isChecking: false,
      lastCheckedAt: new Date().toISOString(),
    });
  });

  it('should render version button', () => {
    render(<VersionBanner />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('should display current version', () => {
    render(<VersionBanner />);
    expect(screen.getByText('v1.0.0')).toBeDefined();
  });

  it('should open popover when clicked', async () => {
    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Version Information')).toBeDefined();
  });

  it('should show current version in popover', async () => {
    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText(/Current version:/)).toBeDefined();
  });

  it('should show last checked time', async () => {
    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText(/Last checked/)).toBeDefined();
  });

  it('should show Check for Updates button', async () => {
    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Check for Updates')).toBeDefined();
  });

  it('should call checkForUpdates when button is clicked', async () => {
    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Check for Updates'));

    expect(mockUseVersionInfo.checkForUpdates).toHaveBeenCalledWith(false);
  });

  it('should show checking state when isChecking is true', async () => {
    mockUseVersionInfo.isChecking = true;

    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Checking...')).toBeDefined();
  });

  it('should disable button when checking', async () => {
    mockUseVersionInfo.isChecking = true;

    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    const checkButton = screen.getByText('Checking...').closest('button');
    expect(checkButton?.hasAttribute('disabled')).toBe(true);
  });

  it('should show update available when update exists', async () => {
    mockUseVersionInfo.updateInfo = {
      hasUpdate: true,
      version: '2.0.0',
      release: { tag_name: 'v2.0.0', body: 'New features' },
    };

    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Update Available')).toBeDefined();
    expect(screen.getByText(/Version 2.0.0 is now available/)).toBeDefined();
  });

  it('should show Download Update button when update available', async () => {
    mockUseVersionInfo.updateInfo = {
      hasUpdate: true,
      version: '2.0.0',
      release: { tag_name: 'v2.0.0', body: 'New features' },
    };

    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Download Update')).toBeDefined();
  });

  it('should call downloadUpdate when Download Update is clicked', async () => {
    mockUseVersionInfo.updateInfo = {
      hasUpdate: true,
      version: '2.0.0',
      release: { tag_name: 'v2.0.0', body: 'New features' },
    };

    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Download Update'));

    expect(mockUseVersionInfo.downloadUpdate).toHaveBeenCalled();
  });

  it('should show Install & Restart button when update available', async () => {
    mockUseVersionInfo.updateInfo = {
      hasUpdate: true,
      version: '2.0.0',
      release: { tag_name: 'v2.0.0', body: 'New features' },
    };

    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Install & Restart')).toBeDefined();
  });

  it('should show up to date message when no update available', async () => {
    mockUseVersionInfo.updateInfo = { hasUpdate: false };

    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('You are running the latest version')).toBeDefined();
  });

  it('should show Never checked when lastCheckedAt is null', async () => {
    mockUseVersionInfo.lastCheckedAt = null as unknown as string;

    const user = userEvent.setup();
    render(<VersionBanner />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Never checked')).toBeDefined();
  });
});
