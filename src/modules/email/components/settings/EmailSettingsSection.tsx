/**
 * Email Settings Section - Main component for email configuration in settings
 */

import { useEffect, useMemo } from 'react';

import { Mail, Plus, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFamily } from '@/modules/family/hooks/useFamily';

import { EmailAccountSettingsDialog } from './EmailAccountSettingsDialog';
import { EmailAccountSettingsList } from './EmailAccountSettingsList';
import { useEmailSettings } from '../../hooks/useEmailSettings';
import { useEmailSettingsStore } from '../../stores/emailSettings.store';

import type { EmailAccountSettings } from '../../types/EmailSettings.types';

export function EmailSettingsSection(): JSX.Element {
  const { settings, isLoading, error, loadSettings, deleteAccount } = useEmailSettings();
  const { openDialog } = useEmailSettingsStore();
  const { isAdmin } = useFamily();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // Categorize accounts
  const accountCategories = useMemo(() => {
    if (!settings?.accounts) {
      return {
        myAccounts: [],
        sharedAccounts: [],
        allAccounts: [],
      };
    }

    // For now, all accounts are "my accounts" since EmailAccountSettings
    // doesn't have ownership info. In the future, we'll integrate with
    // EmailAccount from Yjs to show shared accounts.
    const myAccounts = settings.accounts;
    const sharedAccounts: EmailAccountSettings[] = [];
    const allAccounts = isAdmin ? settings.accounts : myAccounts;

    return {
      myAccounts,
      sharedAccounts,
      allAccounts,
    };
  }, [settings?.accounts, isAdmin]);

  const handleAddAccount = (): void => {
    openDialog();
  };

  const handleEditAccount = (account: EmailAccountSettings): void => {
    openDialog(account);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Settings
          </CardTitle>
          <CardDescription>Configure email accounts and server settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Settings
            </CardTitle>
            <CardDescription>Configure email accounts and server settings</CardDescription>
          </div>
          <Button size="sm" onClick={handleAddAccount}>
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Tabs className="w-full" defaultValue="my-accounts">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-accounts">
              My Accounts
              {accountCategories.myAccounts.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {accountCategories.myAccounts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shared-accounts">
              Shared
              {accountCategories.sharedAccounts.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {accountCategories.sharedAccounts.length}
                </Badge>
              )}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="all-accounts">
                All Accounts
                {accountCategories.allAccounts.length > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {accountCategories.allAccounts.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent className="mt-6 space-y-4" value="my-accounts">
            <div>
              <h3 className="mb-2 text-sm font-semibold">My Email Accounts</h3>
              <p className="text-sm text-muted-foreground">
                Email accounts you have configured and added
              </p>
            </div>

            <Separator />

            {accountCategories.myAccounts.length > 0 ? (
              <EmailAccountSettingsList
                accounts={accountCategories.myAccounts}
                onDelete={(id) => {
                  void deleteAccount(id);
                }}
                onEdit={handleEditAccount}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-sm font-semibold">No email accounts configured</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add an email account to start receiving and sending emails
                </p>
                <Button className="mt-4" size="sm" onClick={handleAddAccount}>
                  <Plus className="h-4 w-4" />
                  Add Account
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent className="mt-6 space-y-4" value="shared-accounts">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Shared Email Accounts</h3>
              <p className="text-sm text-muted-foreground">
                Email accounts shared with you by family members
              </p>
            </div>

            <Separator />

            {accountCategories.sharedAccounts.length > 0 ? (
              <EmailAccountSettingsList accounts={accountCategories.sharedAccounts} />
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-sm font-semibold">No shared accounts</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Accounts shared with you by family members will appear here
                </p>
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent className="mt-6 space-y-4" value="all-accounts">
              <div>
                <h3 className="mb-2 text-sm font-semibold">All Family Email Accounts</h3>
                <p className="text-sm text-muted-foreground">
                  All email accounts in your family (admin view)
                </p>
              </div>

              <Separator />

              {accountCategories.allAccounts.length > 0 ? (
                <EmailAccountSettingsList
                  accounts={accountCategories.allAccounts}
                  onDelete={(id) => {
                    void deleteAccount(id);
                  }}
                  onEdit={handleEditAccount}
                />
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-sm font-semibold">No email accounts</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No email accounts have been configured in your family
                  </p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>

      <EmailAccountSettingsDialog />
    </Card>
  );
}
