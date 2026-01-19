/**
 * DevicesCard - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DevicesCard } from './DevicesCard';

import type { DeviceInfo } from '../types/Family.types';

describe('DevicesCard', () => {
  const mockOnRemoveDevice = vi.fn();

  const mockDevices: DeviceInfo[] = [
    {
      id: 'device-1',
      name: 'My MacBook',
      lastSeen: Date.now() - 30000, // 30 seconds ago
      addedAt: Date.now() - 86400000, // 1 day ago
      isCurrent: true,
    },
    {
      id: 'device-2',
      name: 'Family iPad',
      lastSeen: Date.now() - 3600000, // 1 hour ago
      addedAt: Date.now() - 172800000, // 2 days ago
      isCurrent: false,
    },
    {
      id: 'device-3',
      name: 'Old Phone',
      lastSeen: Date.now() - 172800000, // 2 days ago
      addedAt: Date.now() - 604800000, // 7 days ago
      isCurrent: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the card title and description', () => {
    render(
      <DevicesCard devices={mockDevices} isAdmin={false} onRemoveDevice={mockOnRemoveDevice} />
    );

    expect(screen.getByText('Devices')).toBeInTheDocument();
    expect(screen.getByText('3 devices connected to this family.')).toBeInTheDocument();
  });

  it('should show singular text for 1 device', () => {
    const singleDevice = mockDevices[0] as DeviceInfo;
    render(
      <DevicesCard devices={[singleDevice]} isAdmin={false} onRemoveDevice={mockOnRemoveDevice} />
    );

    expect(screen.getByText('1 device connected to this family.')).toBeInTheDocument();
  });

  it('should show empty state when no devices', () => {
    render(<DevicesCard devices={[]} isAdmin={false} onRemoveDevice={mockOnRemoveDevice} />);

    expect(screen.getByText('No devices registered yet.')).toBeInTheDocument();
  });

  it('should display device names', () => {
    render(
      <DevicesCard devices={mockDevices} isAdmin={false} onRemoveDevice={mockOnRemoveDevice} />
    );

    expect(screen.getByText('My MacBook')).toBeInTheDocument();
    expect(screen.getByText('Family iPad')).toBeInTheDocument();
    expect(screen.getByText('Old Phone')).toBeInTheDocument();
  });

  it('should show "This device" badge for current device', () => {
    render(
      <DevicesCard devices={mockDevices} isAdmin={false} onRemoveDevice={mockOnRemoveDevice} />
    );

    expect(screen.getByText('This device')).toBeInTheDocument();
  });

  it('should format last seen correctly - just now', () => {
    const recentDevice: DeviceInfo[] = [
      {
        id: 'device-1',
        name: 'Recent Device',
        lastSeen: Date.now() - 10000, // 10 seconds ago
        addedAt: Date.now(),
        isCurrent: false,
      },
    ];

    render(
      <DevicesCard devices={recentDevice} isAdmin={false} onRemoveDevice={mockOnRemoveDevice} />
    );

    expect(screen.getByText(/Last seen: Just now/)).toBeInTheDocument();
  });

  it('should format last seen correctly - minutes ago', () => {
    const minutesAgoDevice: DeviceInfo[] = [
      {
        id: 'device-1',
        name: 'Minutes Device',
        lastSeen: Date.now() - 300000, // 5 minutes ago
        addedAt: Date.now(),
        isCurrent: false,
      },
    ];

    render(
      <DevicesCard devices={minutesAgoDevice} isAdmin={false} onRemoveDevice={mockOnRemoveDevice} />
    );

    expect(screen.getByText(/Last seen: 5 min ago/)).toBeInTheDocument();
  });

  it('should format last seen correctly - hours ago', () => {
    const hoursAgoDevice: DeviceInfo[] = [
      {
        id: 'device-1',
        name: 'Hours Device',
        lastSeen: Date.now() - 7200000, // 2 hours ago
        addedAt: Date.now(),
        isCurrent: false,
      },
    ];

    render(
      <DevicesCard devices={hoursAgoDevice} isAdmin={false} onRemoveDevice={mockOnRemoveDevice} />
    );

    expect(screen.getByText(/Last seen: 2 hours ago/)).toBeInTheDocument();
  });

  it('should show Remove button for non-current devices when admin', () => {
    render(
      <DevicesCard devices={mockDevices} isAdmin={true} onRemoveDevice={mockOnRemoveDevice} />
    );

    const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
    expect(removeButtons).toHaveLength(2); // 2 non-current devices
  });

  it('should not show Remove button when not admin', () => {
    render(
      <DevicesCard devices={mockDevices} isAdmin={false} onRemoveDevice={mockOnRemoveDevice} />
    );

    expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
  });

  it('should not show Remove button for current device even when admin', () => {
    const currentDeviceOnly: DeviceInfo[] = [
      {
        id: 'device-1',
        name: 'Current Device',
        lastSeen: Date.now(),
        addedAt: Date.now(),
        isCurrent: true,
      },
    ];

    render(
      <DevicesCard devices={currentDeviceOnly} isAdmin={true} onRemoveDevice={mockOnRemoveDevice} />
    );

    expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
  });

  it('should call onRemoveDevice when Remove button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DevicesCard devices={mockDevices} isAdmin={true} onRemoveDevice={mockOnRemoveDevice} />
    );

    const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
    await user.click(removeButtons[0]!);

    expect(mockOnRemoveDevice).toHaveBeenCalledWith('device-2');
  });

  it('should display added date for each device', () => {
    render(
      <DevicesCard devices={mockDevices} isAdmin={false} onRemoveDevice={mockOnRemoveDevice} />
    );

    const addedTexts = screen.getAllByText(/Added:/);
    expect(addedTexts).toHaveLength(3);
  });
});
