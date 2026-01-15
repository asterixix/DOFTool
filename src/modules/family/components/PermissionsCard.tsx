/**
 * PermissionsCard - Manage member permissions
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import {
  type PermissionInfo,
  type PermissionRole,
  type DeviceInfo,
  ROLE_LABELS,
} from '../types/Family.types';

interface PermissionsCardProps {
  permissions: PermissionInfo[];
  devices: DeviceInfo[];
  isAdmin: boolean;
  currentDeviceId: string | undefined;
  onSetPermission: (memberId: string, role: PermissionRole) => Promise<void>;
}

export function PermissionsCard({
  permissions,
  devices,
  isAdmin,
  currentDeviceId,
  onSetPermission,
}: PermissionsCardProps): JSX.Element {
  const getDeviceName = (memberId: string): string => {
    const device = devices.find((d) => d.id === memberId);
    return device?.name ?? memberId.slice(0, 8) + '...';
  };

  const handleRoleChange = async (memberId: string, role: PermissionRole): Promise<void> => {
    await onSetPermission(memberId, role);
  };

  const getRoleBadgeVariant = (role: PermissionRole): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'member':
        return 'secondary';
      case 'viewer':
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>Manage what each member can do in your family.</CardDescription>
      </CardHeader>
      <CardContent>
        {permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No permissions configured yet.</p>
        ) : (
          <div className="space-y-3">
            {permissions.map((perm) => {
              const isCurrentDevice = perm.memberId === currentDeviceId;
              const deviceName = getDeviceName(perm.memberId);

              return (
                <div
                  key={perm.memberId}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{deviceName}</span>
                      {isCurrentDevice && (
                        <Badge className="text-xs" variant="outline">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set {new Date(perm.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && !isCurrentDevice ? (
                      <select
                        className="rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={perm.role}
                        onChange={(e) =>
                          void handleRoleChange(perm.memberId, e.target.value as PermissionRole)
                        }
                      >
                        {(Object.keys(ROLE_LABELS) as PermissionRole[]).map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant={getRoleBadgeVariant(perm.role)}>
                        {ROLE_LABELS[perm.role]}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
