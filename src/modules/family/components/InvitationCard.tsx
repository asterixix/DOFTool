/**
 * InvitationCard - Generate and display family invitations
 */

import { useState } from 'react';

import { QRCodeSVG } from 'qrcode.react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { type PermissionRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../types/Family.types';

interface InvitationCardProps {
  hasFamily: boolean;
  isInviting: boolean;
  pendingInvite: { token: string; role: PermissionRole } | null;
  onGenerateInvite: (role: PermissionRole) => Promise<void>;
  onClearInvite: () => void;
}

export function InvitationCard({
  hasFamily,
  isInviting,
  pendingInvite,
  onGenerateInvite,
  onClearInvite,
}: InvitationCardProps): JSX.Element {
  const [selectedRole, setSelectedRole] = useState<PermissionRole>('member');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (): Promise<void> => {
    await onGenerateInvite(selectedRole);
  };

  const handleCopyToken = async (): Promise<void> => {
    if (pendingInvite) {
      await navigator.clipboard.writeText(pendingInvite.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Members</CardTitle>
        <CardDescription>Generate an invite code to add family members.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasFamily ? (
          <p className="text-sm text-muted-foreground">
            Create a family first to generate invitations.
          </p>
        ) : pendingInvite ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/30 p-6">
              <QRCodeSVG
                includeMargin
                className="rounded-lg bg-white p-2"
                level="M"
                size={180}
                value={pendingInvite.token}
              />
              <div className="text-center">
                <Badge className="mb-2" variant="secondary">
                  {ROLE_LABELS[pendingInvite.role]}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Scan QR code or share the token below
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Invite Token</Label>
              <div className="flex gap-2">
                <code className="flex-1 break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  {pendingInvite.token}
                </code>
                <Button size="sm" variant="outline" onClick={() => void handleCopyToken()}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
            <Button className="w-full" variant="outline" onClick={onClearInvite}>
              Generate New Invite
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Member Role</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                id="inviteRole"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as PermissionRole)}
              >
                {(Object.keys(ROLE_LABELS) as PermissionRole[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[selectedRole]}</p>
            </div>
            <Button className="w-full" disabled={isInviting} onClick={() => void handleGenerate()}>
              {isInviting ? 'Generating...' : 'Generate Invite Code'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
