/**
 * FamilyDiscoveryCard - Discover and join families on local network
 *
 * Replaces the old token-based JoinFamilyCard with mDNS discovery
 */

import { useState, useEffect, useCallback } from 'react';

import { Loader2, Radio, Users, Wifi, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DiscoveredFamily {
  id: string;
  name: string;
  adminDeviceName: string;
  host: string;
  port: number;
  discoveredAt: number;
}

interface FamilyDiscoveryCardProps {
  hasFamily: boolean;
}

export function FamilyDiscoveryCard({ hasFamily }: FamilyDiscoveryCardProps): JSX.Element {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredFamilies, setDiscoveredFamilies] = useState<DiscoveredFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<DiscoveredFamily | null>(null);
  const [joinRequestPending, setJoinRequestPending] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState<
    'idle' | 'pending' | 'approved' | 'rejected'
  >('idle');

  const startDiscovery = useCallback(async (): Promise<void> => {
    try {
      setIsDiscovering(true);
      setJoinRequestStatus('idle');
      await window.electronAPI.discovery.startDiscovering();

      const pollFamilies = async (): Promise<void> => {
        const families = await window.electronAPI.discovery.getDiscoveredFamilies();
        setDiscoveredFamilies(families);
      };

      await pollFamilies();

      const intervalId = setInterval(() => void pollFamilies(), 2000);

      setTimeout(() => {
        clearInterval(intervalId);
        void window.electronAPI.discovery.stopDiscovering();
        setIsDiscovering(false);
      }, 30000);
    } catch (err) {
      console.error('Failed to start discovery:', err);
      setIsDiscovering(false);
    }
  }, []);

  const stopDiscovery = useCallback(async (): Promise<void> => {
    try {
      await window.electronAPI.discovery.stopDiscovering();
      setIsDiscovering(false);
    } catch (err) {
      console.error('Failed to stop discovery:', err);
    }
  }, []);

  const handleRequestJoin = async (family: DiscoveredFamily): Promise<void> => {
    try {
      setSelectedFamily(family);
      setJoinRequestPending(true);
      setJoinRequestStatus('pending');

      await window.electronAPI.discovery.requestJoin(family.id);
    } catch (err) {
      console.error('Failed to request join:', err);
      setJoinRequestStatus('idle');
      setJoinRequestPending(false);
    }
  };

  useEffect(() => {
    const unsubscribeApproved = window.electronAPI.discovery.onJoinRequestApproved((approval) => {
      if (approval.approved) {
        setJoinRequestStatus('approved');
        // Page will reload after family is set up
      }
      setJoinRequestPending(false);
    });

    const unsubscribeRejected = window.electronAPI.discovery.onJoinRequestRejected(() => {
      setJoinRequestStatus('rejected');
      setJoinRequestPending(false);
    });

    return () => {
      unsubscribeApproved();
      unsubscribeRejected();
    };
  }, []);

  if (hasFamily) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Join Family</CardTitle>
          <CardDescription>You are already part of a family.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To join a different family, you would need to leave your current family first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join Family</CardTitle>
        <CardDescription>
          Discover families on your local network and request to join.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDiscovering ? (
              <Wifi className="h-4 w-4 animate-pulse text-primary" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">Network Discovery</span>
          </div>
          <Button
            size="sm"
            variant={isDiscovering ? 'outline' : 'default'}
            onClick={() => void (isDiscovering ? stopDiscovery() : startDiscovery())}
          >
            {isDiscovering ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Stop
              </>
            ) : (
              <>
                <Radio className="mr-1 h-3 w-3" />
                Scan Network
              </>
            )}
          </Button>
        </div>

        <div className="min-h-[100px] rounded-lg border p-3">
          {discoveredFamilies.length > 0 ? (
            <div className="space-y-2">
              {discoveredFamilies.map((family) => (
                <div
                  key={family.id}
                  className={`flex items-center justify-between rounded-md border p-2 transition-colors ${
                    selectedFamily?.id === family.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{family.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Host: {family.adminDeviceName}
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled={joinRequestPending}
                    size="sm"
                    variant="outline"
                    onClick={() => void handleRequestJoin(family)}
                  >
                    {joinRequestPending && selectedFamily?.id === family.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Request Join'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : isDiscovering ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Scanning for families...</p>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Click &quot;Scan Network&quot; to find families
              </p>
            </div>
          )}
        </div>

        {joinRequestStatus === 'pending' && (
          <div className="rounded-md bg-yellow-500/10 p-3 text-center">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Waiting for admin approval from {selectedFamily?.name}...
            </p>
          </div>
        )}

        {joinRequestStatus === 'approved' && (
          <div className="rounded-md bg-green-500/10 p-3 text-center">
            <p className="text-sm text-green-600 dark:text-green-400">
              Join request approved! Setting up your family...
            </p>
          </div>
        )}

        {joinRequestStatus === 'rejected' && (
          <div className="rounded-md bg-red-500/10 p-3 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              Join request was rejected. Please try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
