import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SyncStatusPopover } from './SyncStatusPopover';

const mockUseSyncStatus = {
  status: 'connected' as const,
  statusText: 'Connected',
  peers: [] as Array<{ deviceId: string; deviceName: string; status: string; lastSeen: string }>,
  discoveredPeers: [] as Array<{ deviceId: string; deviceName: string }>,
  lastSyncAt: new Date().toISOString(),
  connectedPeerCount: 0,
  isConnected: true,
  isOffline: false,
  isInitialized: true,
  error: null as string | null,
  forceSync: vi.fn(),
  startSync: vi.fn(),
  stopSync: vi.fn(),
};

vi.mock('@/hooks/useSyncStatus', () => ({
  useSyncStatus: vi.fn(() => mockUseSyncStatus),
}));

describe('SyncStatusPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockUseSyncStatus, {
      status: 'connected',
      statusText: 'Connected',
      peers: [],
      discoveredPeers: [],
      isConnected: true,
      isOffline: false,
      isInitialized: true,
      error: null,
    });
  });

  it('should render sync status button', () => {
    render(<SyncStatusPopover />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('should display status text', () => {
    render(<SyncStatusPopover />);
    expect(screen.getByText('Connected')).toBeDefined();
  });

  it('should open popover when clicked', async () => {
    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Sync Status')).toBeDefined();
  });

  it('should show last sync time in popover', async () => {
    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText(/Last synced/)).toBeDefined();
  });

  it('should show force sync button when online', async () => {
    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByTitle('Force sync now')).toBeDefined();
  });

  it('should call forceSync when force sync button is clicked', async () => {
    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByTitle('Force sync now'));

    expect(mockUseSyncStatus.forceSync).toHaveBeenCalled();
  });

  it('should show Stop Sync button when online', async () => {
    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Stop Sync')).toBeDefined();
  });

  it('should call stopSync when Stop Sync is clicked', async () => {
    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Stop Sync'));

    expect(mockUseSyncStatus.stopSync).toHaveBeenCalled();
  });

  it('should show Start Sync button when offline', async () => {
    mockUseSyncStatus.isOffline = true;
    mockUseSyncStatus.isConnected = false;
    mockUseSyncStatus.statusText = 'Offline';

    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Start Sync')).toBeDefined();
  });

  it('should call startSync when Start Sync is clicked', async () => {
    mockUseSyncStatus.isOffline = true;
    mockUseSyncStatus.isConnected = false;

    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Start Sync'));

    expect(mockUseSyncStatus.startSync).toHaveBeenCalled();
  });

  it('should display error message when present', async () => {
    mockUseSyncStatus.error = 'Connection failed';

    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Connection failed')).toBeDefined();
  });

  it('should show empty state message when no peers and offline', async () => {
    mockUseSyncStatus.isOffline = true;
    mockUseSyncStatus.isConnected = false;
    mockUseSyncStatus.peers = [];
    mockUseSyncStatus.discoveredPeers = [];

    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Sync is offline')).toBeDefined();
  });

  it('should show discovering message when online with no peers', async () => {
    mockUseSyncStatus.peers = [];
    mockUseSyncStatus.discoveredPeers = [];

    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Looking for devices...')).toBeDefined();
  });

  it('should show initializing message when not initialized and offline', async () => {
    mockUseSyncStatus.isOffline = true;
    mockUseSyncStatus.isInitialized = false;

    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Initializing sync service...')).toBeDefined();
  });

  it('should display connected peers count', async () => {
    mockUseSyncStatus.peers = [
      {
        deviceId: '1',
        deviceName: 'Test Device',
        status: 'connected',
        lastSeen: new Date().toISOString(),
      },
    ];
    mockUseSyncStatus.connectedPeerCount = 1;

    const user = userEvent.setup();
    render(<SyncStatusPopover />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Connected Devices (1)')).toBeDefined();
  });
});
