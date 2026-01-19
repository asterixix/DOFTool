/**
 * SyncSettingsSection - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SyncSettingsSection } from './SyncSettingsSection';

// Mock useSyncStatus hook
vi.mock('@/hooks/useSyncStatus', () => ({
  useSyncStatus: vi.fn(() => ({
    status: 'connected',
    peerCount: 2,
    lastSyncAt: Date.now() - 60000, // 1 minute ago
  })),
}));

// Mock analytics
vi.mock('@/hooks/useAnalytics', () => ({
  trackModuleAction: vi.fn(),
}));

// Mock window.electronAPI
const mockForceSync = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(window, 'electronAPI', {
  writable: true,
  value: {
    sync: {
      forceSync: mockForceSync,
    },
  },
});

describe('SyncSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the card title and description', () => {
    render(<SyncSettingsSection />);

    expect(screen.getByText('P2P Synchronization')).toBeInTheDocument();
    expect(
      screen.getByText('Manage peer-to-peer synchronization with other family devices')
    ).toBeInTheDocument();
  });

  it('should display sync status label', () => {
    render(<SyncSettingsSection />);

    expect(screen.getByText('Sync Status')).toBeInTheDocument();
  });

  it('should display connected devices count', () => {
    render(<SyncSettingsSection />);

    expect(screen.getByText('Connected Devices')).toBeInTheDocument();
  });

  it('should display last sync label', () => {
    render(<SyncSettingsSection />);

    expect(screen.getByText('Last Sync')).toBeInTheDocument();
  });

  it('should have Force Sync button', () => {
    render(<SyncSettingsSection />);

    expect(screen.getByRole('button', { name: /Force Sync/i })).toBeInTheDocument();
  });

  it('should call forceSync when Force Sync button is clicked', async () => {
    const user = userEvent.setup();

    render(<SyncSettingsSection />);

    const button = screen.getByRole('button', { name: /Force Sync/i });
    await user.click(button);

    expect(mockForceSync).toHaveBeenCalled();
  });

  it('should display information about P2P sync', () => {
    render(<SyncSettingsSection />);

    expect(
      screen.getByText(/P2P synchronization uses local network discovery/)
    ).toBeInTheDocument();
  });
});
