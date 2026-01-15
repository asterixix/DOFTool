/**
 * DevicesCard - Manage family devices
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { DeviceInfo } from '../types/Family.types';

interface DevicesCardProps {
  devices: DeviceInfo[];
  isAdmin: boolean;
  onRemoveDevice: (deviceId: string) => Promise<void>;
}

export function DevicesCard({ devices, isAdmin, onRemoveDevice }: DevicesCardProps): JSX.Element {
  const formatLastSeen = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) {
      return 'Just now';
    }
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} min ago`;
    }
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} hours ago`;
    }
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices</CardTitle>
        <CardDescription>
          {devices.length} device{devices.length !== 1 ? 's' : ''} connected to this family.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices registered yet.</p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect height="20" rx="2" ry="2" width="14" x="5" y="2" />
                      <path d="M12 18h.01" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{device.name}</span>
                      {device.isCurrent && (
                        <Badge className="text-xs" variant="default">
                          This device
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last seen: {formatLastSeen(device.lastSeen)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added: {new Date(device.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {isAdmin && !device.isCurrent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onRemoveDevice(device.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
