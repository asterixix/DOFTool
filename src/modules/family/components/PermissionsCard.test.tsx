/**
 * PermissionsCard - Unit tests
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PermissionsCard } from './PermissionsCard';

import type { PermissionInfo, DeviceInfo } from '../types/Family.types';

describe('PermissionsCard', () => {
  const mockOnSetPermission = vi.fn();

  const mockDevices: DeviceInfo[] = [
    {
      id: 'device-1',
      name: 'My MacBook',
      lastSeen: Date.now(),
      addedAt: Date.now() - 86400000,
      isCurrent: true,
    },
    {
      id: 'device-2',
      name: 'Family iPad',
      lastSeen: Date.now() - 3600000,
      addedAt: Date.now() - 172800000,
      isCurrent: false,
    },
    {
      id: 'device-3',
      name: 'Unknown Device',
      lastSeen: Date.now() - 7200000,
      addedAt: Date.now() - 259200000,
      isCurrent: false,
    },
  ];

  const mockPermissions: PermissionInfo[] = [
    {
      memberId: 'device-1',
      role: 'admin',
      createdAt: Date.now() - 86400000,
    },
    {
      memberId: 'device-2',
      role: 'member',
      createdAt: Date.now() - 172800000,
    },
    {
      memberId: 'device-3',
      role: 'viewer',
      createdAt: Date.now() - 259200000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the card title and description', () => {
    render(
      <PermissionsCard
        currentDeviceId="device-1"
        devices={mockDevices}
        isAdmin={true}
        permissions={mockPermissions}
        onSetPermission={mockOnSetPermission}
      />
    );

    expect(screen.getByText('Permissions')).toBeInTheDocument();
    expect(screen.getByText('Manage what each member can do in your family.')).toBeInTheDocument();
  });

  it('should show empty state when no permissions', () => {
    render(
      <PermissionsCard
        currentDeviceId="device-1"
        devices={mockDevices}
        isAdmin={true}
        permissions={[]}
        onSetPermission={mockOnSetPermission}
      />
    );

    expect(screen.getByText('No permissions configured yet.')).toBeInTheDocument();
  });

  it('should display device names for each permission', () => {
    render(
      <PermissionsCard
        currentDeviceId="device-1"
        devices={mockDevices}
        isAdmin={false}
        permissions={mockPermissions}
        onSetPermission={mockOnSetPermission}
      />
    );

    expect(screen.getByText('My MacBook')).toBeInTheDocument();
    expect(screen.getByText('Family iPad')).toBeInTheDocument();
  });

  it('should show "You" badge for current device', () => {
    render(
      <PermissionsCard
        currentDeviceId="device-1"
        devices={mockDevices}
        isAdmin={true}
        permissions={mockPermissions}
        onSetPermission={mockOnSetPermission}
      />
    );

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('should show role badges when not admin', () => {
    render(
      <PermissionsCard
        currentDeviceId="device-1"
        devices={mockDevices}
        isAdmin={false}
        permissions={mockPermissions}
        onSetPermission={mockOnSetPermission}
      />
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('should show role dropdowns for non-current devices when admin', () => {
    render(
      <PermissionsCard
        currentDeviceId="device-1"
        devices={mockDevices}
        isAdmin={true}
        permissions={mockPermissions}
        onSetPermission={mockOnSetPermission}
      />
    );

    // Should have 2 dropdowns (for device-2 and device-3, not device-1 which is current)
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
  });

  it('should not show role dropdowns when not admin', () => {
    render(
      <PermissionsCard
        currentDeviceId="device-1"
        devices={mockDevices}
        isAdmin={false}
        permissions={mockPermissions}
        onSetPermission={mockOnSetPermission}
      />
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should call onSetPermission when role is changed', async () => {
    const user = userEvent.setup();

    render(
      <PermissionsCard
        currentDeviceId="device-1"
        devices={mockDevices}
        isAdmin={true}
        permissions={mockPermissions}
        onSetPermission={mockOnSetPermission}
      />
    );

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0]!, 'admin');

    expect(mockOnSetPermission).toHaveBeenCalledWith('device-2', 'admin');
  });

  it('should fallback to truncated ID when device not found', () => {
    const permissionsWithUnknown: PermissionInfo[] = [
      {
        memberId: 'unknown-device-id-12345',
        role: 'viewer',
        createdAt: Date.now(),
      },
    ];

    render(
      <PermissionsCard
        currentDeviceId="device-1"
        devices={mockDevices}
        isAdmin={false}
        permissions={permissionsWithUnknown}
        onSetPermission={mockOnSetPermission}
      />
    );

    // The truncation format is: first 8 chars + '...'
    expect(screen.getByText('unknown-...')).toBeInTheDocument();
  });

  it('should show "Set" date for each permission', () => {
    render(
      <PermissionsCard
        currentDeviceId="device-1"
        devices={mockDevices}
        isAdmin={false}
        permissions={mockPermissions}
        onSetPermission={mockOnSetPermission}
      />
    );

    const setDates = screen.getAllByText(/^Set/);
    expect(setDates).toHaveLength(3);
  });
});
