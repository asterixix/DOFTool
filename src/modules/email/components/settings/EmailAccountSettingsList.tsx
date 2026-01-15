/**
 * Email Account Settings List - Displays list of configured email accounts
 */

import { Mail, Settings2, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import type { EmailAccountSettings } from '../../types/EmailSettings.types';

interface EmailAccountSettingsListProps {
  accounts: EmailAccountSettings[];
  onEdit?: (account: EmailAccountSettings) => void;
  onDelete?: (accountId: string) => void;
  onTest?: (accountId: string) => void;
}

export function EmailAccountSettingsList({
  accounts,
  onEdit,
  onDelete,
  onTest,
}: EmailAccountSettingsListProps): JSX.Element {
  const getStatusIcon = (status: EmailAccountSettings['status']): JSX.Element => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'disabled':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: EmailAccountSettings['status']): JSX.Element => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'disabled':
        return <Badge variant="outline">Disabled</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <Card key={account.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {account.displayName}
                    {getStatusIcon(account.status)}
                  </CardTitle>
                  <CardDescription>{account.email}</CardDescription>
                  <div className="mt-2 flex items-center gap-2">
                    {getStatusBadge(account.status)}
                    <Badge variant="outline">{account.provider}</Badge>
                    <Badge variant="outline">{account.incoming.protocol.toUpperCase()}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onTest && (
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => onTest(account.id)}
                  >
                    Test
                  </Button>
                )}
                {onEdit && (
                  <Button size="sm" type="button" variant="outline" onClick={() => onEdit(account)}>
                    <Settings2 className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => onDelete(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {account.lastError && (
            <CardContent>
              <Separator className="mb-4" />
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-semibold">Error:</p>
                <p>{account.lastError}</p>
              </div>
            </CardContent>
          )}
          {account.lastSyncAt && (
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Last synced: {new Date(account.lastSyncAt).toLocaleString()}
              </p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
