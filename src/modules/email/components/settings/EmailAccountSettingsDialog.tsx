/**
 * Email Account Settings Dialog - Comprehensive form for creating/editing email account settings
 * Includes provider selection, server configuration, authentication, and advanced settings
 */

import { useEffect, useState } from 'react';

import { Loader2, Mail, CheckCircle2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

import { useEmailSettings } from '../../hooks/useEmailSettings';
import { useEmailSettingsStore } from '../../stores/emailSettings.store';
import {
  DEFAULT_CONNECTION_POOL_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  DEFAULT_RETRY_CONFIG,
  EMAIL_PROVIDER_PRESETS,
  type AuthenticationMethod,
  type CreateEmailAccountSettingsInput,
  type EmailProvider,
  type EncryptionType,
  type EmailProtocol,
  type TestConnectionInput,
  type UpdateEmailAccountSettingsInput,
} from '../../types/EmailSettings.types';
import { validateCreateEmailAccountInput } from '../../utils/emailSettingsValidation';

export function EmailAccountSettingsDialog(): JSX.Element {
  const { isDialogOpen, editingAccount, closeDialog } = useEmailSettingsStore();
  const {
    createAccount,
    updateAccount,
    testConnection,
    isSaving,
    isTestingConnection,
    testResult,
  } = useEmailSettings();

  const isEditing = !!editingAccount;

  // Form state - Basic account info
  const [email, setEmail] = useState(editingAccount?.email ?? '');
  const [displayName, setDisplayName] = useState(editingAccount?.displayName ?? '');
  const [provider, setProvider] = useState<EmailProvider>(editingAccount?.provider ?? 'custom');
  const [syncInterval, setSyncInterval] = useState(
    editingAccount?.syncInterval?.toString() ?? '15'
  );
  const [signature, setSignature] = useState(editingAccount?.signature ?? '');

  // Form state - Incoming server
  const [incomingProtocol, setIncomingProtocol] = useState<EmailProtocol>(
    editingAccount?.incoming.protocol ?? 'imap'
  );
  const [incomingHost, setIncomingHost] = useState(editingAccount?.incoming.host ?? '');
  const [incomingPort, setIncomingPort] = useState(
    editingAccount?.incoming.port?.toString() ?? '993'
  );
  const [incomingEncryption, setIncomingEncryption] = useState<EncryptionType>(
    editingAccount?.incoming.encryption ?? 'ssl'
  );
  const [incomingAuthMethod, setIncomingAuthMethod] = useState<AuthenticationMethod>(
    editingAccount?.incoming.authMethod ?? 'password'
  );
  const [incomingUsername, setIncomingUsername] = useState(editingAccount?.incoming.username ?? '');
  const [incomingPassword, setIncomingPassword] = useState('');
  const [incomingTimeout, setIncomingTimeout] = useState(
    editingAccount?.incoming.timeout?.toString() ?? '30000'
  );

  // Form state - Outgoing server
  const [outgoingHost, setOutgoingHost] = useState(editingAccount?.outgoing.host ?? '');
  const [outgoingPort, setOutgoingPort] = useState(
    editingAccount?.outgoing.port?.toString() ?? '587'
  );
  const [outgoingEncryption, setOutgoingEncryption] = useState<EncryptionType>(
    editingAccount?.outgoing.encryption ?? 'tls'
  );
  const [outgoingAuthMethod, setOutgoingAuthMethod] = useState<AuthenticationMethod>(
    editingAccount?.outgoing.authMethod ?? 'password'
  );
  const [outgoingUsername, setOutgoingUsername] = useState(editingAccount?.outgoing.username ?? '');
  const [outgoingPassword, setOutgoingPassword] = useState('');
  const [outgoingTimeout, setOutgoingTimeout] = useState(
    editingAccount?.outgoing.timeout?.toString() ?? '30000'
  );

  // Form state - Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteAfterDownload, setDeleteAfterDownload] = useState(
    editingAccount?.deleteAfterDownload ?? false
  );

  // Form state - Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form when dialog opens or editing account changes
  useEffect(() => {
    if (isDialogOpen) {
      if (editingAccount) {
        setEmail(editingAccount.email);
        setDisplayName(editingAccount.displayName);
        setProvider(editingAccount.provider);
        setSyncInterval(editingAccount.syncInterval.toString());
        setSignature(editingAccount.signature ?? '');
        setIncomingProtocol(editingAccount.incoming.protocol);
        setIncomingHost(editingAccount.incoming.host);
        setIncomingPort(editingAccount.incoming.port.toString());
        setIncomingEncryption(editingAccount.incoming.encryption);
        setIncomingAuthMethod(editingAccount.incoming.authMethod);
        setIncomingUsername(editingAccount.incoming.username);
        setIncomingPassword(''); // Don't pre-fill password
        setIncomingTimeout(editingAccount.incoming.timeout.toString());
        setOutgoingHost(editingAccount.outgoing.host);
        setOutgoingPort(editingAccount.outgoing.port.toString());
        setOutgoingEncryption(editingAccount.outgoing.encryption);
        setOutgoingAuthMethod(editingAccount.outgoing.authMethod);
        setOutgoingUsername(editingAccount.outgoing.username);
        setOutgoingPassword(''); // Don't pre-fill password
        setOutgoingTimeout(editingAccount.outgoing.timeout.toString());
        setDeleteAfterDownload(editingAccount.deleteAfterDownload ?? false);
      } else {
        // Reset to defaults for new account
        setEmail('');
        setDisplayName('');
        setProvider('custom');
        setSyncInterval('15');
        setSignature('');
        setIncomingProtocol('imap');
        setIncomingHost('');
        setIncomingPort('993');
        setIncomingEncryption('ssl');
        setIncomingAuthMethod('password');
        setIncomingUsername('');
        setIncomingPassword('');
        setIncomingTimeout('30000');
        setOutgoingHost('');
        setOutgoingPort('587');
        setOutgoingEncryption('tls');
        setOutgoingAuthMethod('password');
        setOutgoingUsername('');
        setOutgoingPassword('');
        setOutgoingTimeout('30000');
        setDeleteAfterDownload(false);
      }
      setValidationErrors({});
    }
  }, [isDialogOpen, editingAccount]);

  // Apply provider preset
  const handleProviderChange = (newProvider: EmailProvider): void => {
    setProvider(newProvider);
    const preset = EMAIL_PROVIDER_PRESETS.find((p) => p.provider === newProvider);
    if (preset) {
      setIncomingProtocol(preset.incoming.protocol);
      setIncomingHost(preset.incoming.host);
      setIncomingPort(preset.incoming.port.toString());
      setIncomingEncryption(preset.incoming.encryption);
      setOutgoingHost(preset.outgoing.host);
      setOutgoingPort(preset.outgoing.port.toString());
      setOutgoingEncryption(preset.outgoing.encryption);

      // Set auth method based on provider capabilities
      if (preset.supportsOAuth) {
        setIncomingAuthMethod('oauth2');
        setOutgoingAuthMethod('oauth2');
      } else if (preset.supportsAppPassword) {
        setIncomingAuthMethod('app-password');
        setOutgoingAuthMethod('app-password');
      } else {
        setIncomingAuthMethod('password');
        setOutgoingAuthMethod('password');
      }

      // Auto-fill username if email is set
      if (email && !incomingUsername) {
        setIncomingUsername(email);
        setOutgoingUsername(email);
      }
    }
  };

  // Handle test connection
  const handleTestConnection = async (): Promise<void> => {
    setValidationErrors({});

    const testInput: TestConnectionInput = {
      incoming: {
        protocol: incomingProtocol,
        host: incomingHost,
        port: Number.parseInt(incomingPort, 10),
        encryption: incomingEncryption,
        authMethod: incomingAuthMethod,
        username: incomingUsername,
        password: incomingPassword ? incomingPassword : undefined,
        timeout: Number.parseInt(incomingTimeout, 10),
      },
      outgoing: {
        host: outgoingHost,
        port: Number.parseInt(outgoingPort, 10),
        encryption: outgoingEncryption,
        authMethod: outgoingAuthMethod,
        username: outgoingUsername,
        password: outgoingPassword ? outgoingPassword : undefined,
        timeout: Number.parseInt(outgoingTimeout, 10),
      },
      testType: 'both',
    };

    try {
      await testConnection(testInput);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test connection';
      setValidationErrors({ test: errorMessage });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setValidationErrors({});

    const input: CreateEmailAccountSettingsInput = {
      email: email.trim(),
      displayName: displayName.trim(),
      provider,
      incoming: {
        protocol: incomingProtocol,
        host: incomingHost.trim(),
        port: Number.parseInt(incomingPort, 10),
        encryption: incomingEncryption,
        authMethod: incomingAuthMethod,
        username: incomingUsername.trim(),
        password: incomingPassword ? incomingPassword : undefined,
        timeout: Number.parseInt(incomingTimeout, 10),
        retry: DEFAULT_RETRY_CONFIG,
      },
      outgoing: {
        host: outgoingHost.trim(),
        port: Number.parseInt(outgoingPort, 10),
        encryption: outgoingEncryption,
        authMethod: outgoingAuthMethod,
        username: outgoingUsername.trim(),
        password: outgoingPassword ? outgoingPassword : undefined,
        timeout: Number.parseInt(outgoingTimeout, 10),
        retry: DEFAULT_RETRY_CONFIG,
        rateLimit: DEFAULT_RATE_LIMIT_CONFIG,
      },
      syncInterval: Number.parseInt(syncInterval, 10),
      signature: signature.trim() ? signature.trim() : undefined,
      deleteAfterDownload: deleteAfterDownload ? true : undefined,
      connectionPool: DEFAULT_CONNECTION_POOL_CONFIG,
    };

    // Validate
    const validation = validateCreateEmailAccountInput(input);
    if (!validation.valid) {
      const errors: Record<string, string> = {};
      validation.errors.forEach((error) => {
        errors[error.field] = error.message;
      });
      setValidationErrors(errors);
      return;
    }

    try {
      if (isEditing && editingAccount) {
        const updateInput: UpdateEmailAccountSettingsInput = {
          id: editingAccount.id,
          displayName: input.displayName,
          incoming: {
            protocol: input.incoming.protocol,
            host: input.incoming.host,
            port: input.incoming.port,
            encryption: input.incoming.encryption,
            authMethod: input.incoming.authMethod,
            username: input.incoming.username,
            password: input.incoming.password ?? undefined,
            timeout: input.incoming.timeout,
          },
          outgoing: {
            host: input.outgoing.host,
            port: input.outgoing.port,
            encryption: input.outgoing.encryption,
            authMethod: input.outgoing.authMethod,
            username: input.outgoing.username,
            password: input.outgoing.password ?? undefined,
            timeout: input.outgoing.timeout,
          },
          syncInterval: input.syncInterval,
          signature: input.signature,
          deleteAfterDownload: input.deleteAfterDownload,
        };
        await updateAccount(updateInput);
      } else {
        await createAccount(input);
      }
      closeDialog();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save account';
      setValidationErrors({ submit: errorMessage });
    }
  };

  const selectedPreset = EMAIL_PROVIDER_PRESETS.find((p) => p.provider === provider);

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Email Account' : 'Add Email Account'}</DialogTitle>
          <DialogDescription>
            Configure your email account settings and server parameters
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
          {/* Basic Account Information */}
          <div className="space-y-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Account Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    required
                    id="email"
                    placeholder="user@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {validationErrors['email'] && (
                    <p className="text-xs text-destructive">{validationErrors['email']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    required
                    id="displayName"
                    placeholder="Your Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  {validationErrors['displayName'] && (
                    <p className="text-xs text-destructive">{validationErrors['displayName']}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider">Email Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(value) => handleProviderChange(value as EmailProvider)}
                >
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_PROVIDER_PRESETS.map((preset) => (
                      <SelectItem key={preset.provider} value={preset.provider}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                <Input
                  required
                  id="syncInterval"
                  min="1"
                  type="number"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature">Email Signature</Label>
              <Textarea
                id="signature"
                placeholder="Your email signature..."
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Incoming Server Configuration */}
          <div className="space-y-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Incoming Server ({incomingProtocol.toUpperCase()})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="incomingProtocol">Protocol</Label>
                  <Select
                    value={incomingProtocol}
                    onValueChange={(value) => setIncomingProtocol(value as EmailProtocol)}
                  >
                    <SelectTrigger id="incomingProtocol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imap">IMAP</SelectItem>
                      <SelectItem value="pop3">POP3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incomingHost">Host *</Label>
                  <Input
                    required
                    id="incomingHost"
                    placeholder="imap.example.com"
                    value={incomingHost}
                    onChange={(e) => setIncomingHost(e.target.value)}
                  />
                  {validationErrors['incoming.host'] && (
                    <p className="text-xs text-destructive">{validationErrors['incoming.host']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incomingPort">Port *</Label>
                  <Input
                    required
                    id="incomingPort"
                    max="65535"
                    min="1"
                    type="number"
                    value={incomingPort}
                    onChange={(e) => setIncomingPort(e.target.value)}
                  />
                  {validationErrors['incoming.port'] && (
                    <p className="text-xs text-destructive">{validationErrors['incoming.port']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incomingEncryption">Encryption</Label>
                  <Select
                    value={incomingEncryption}
                    onValueChange={(value) => setIncomingEncryption(value as EncryptionType)}
                  >
                    <SelectTrigger id="incomingEncryption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ssl">SSL/TLS</SelectItem>
                      <SelectItem value="tls">STARTTLS</SelectItem>
                      <SelectItem value="starttls">STARTTLS (Explicit)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incomingAuthMethod">Authentication</Label>
                  <Select
                    value={incomingAuthMethod}
                    onValueChange={(value) => setIncomingAuthMethod(value as AuthenticationMethod)}
                  >
                    <SelectTrigger id="incomingAuthMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="password">Password</SelectItem>
                      <SelectItem
                        disabled={!selectedPreset?.supportsAppPassword}
                        value="app-password"
                      >
                        App Password
                      </SelectItem>
                      <SelectItem disabled={!selectedPreset?.supportsOAuth} value="oauth2">
                        OAuth 2.0
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incomingTimeout">Timeout (ms)</Label>
                  <Input
                    id="incomingTimeout"
                    min="1000"
                    type="number"
                    value={incomingTimeout}
                    onChange={(e) => setIncomingTimeout(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incomingUsername">Username *</Label>
                  <Input
                    required
                    id="incomingUsername"
                    placeholder={email || 'username'}
                    value={incomingUsername}
                    onChange={(e) => setIncomingUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incomingPassword">
                    Password {isEditing ? '(leave blank to keep current)' : '*'}
                  </Label>
                  <Input
                    id="incomingPassword"
                    required={!isEditing}
                    type="password"
                    value={incomingPassword}
                    onChange={(e) => setIncomingPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Outgoing Server Configuration */}
          <div className="space-y-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Outgoing Server (SMTP)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="outgoingHost">Host *</Label>
                  <Input
                    required
                    id="outgoingHost"
                    placeholder="smtp.example.com"
                    value={outgoingHost}
                    onChange={(e) => setOutgoingHost(e.target.value)}
                  />
                  {validationErrors['outgoing.host'] && (
                    <p className="text-xs text-destructive">{validationErrors['outgoing.host']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outgoingPort">Port *</Label>
                  <Input
                    required
                    id="outgoingPort"
                    max="65535"
                    min="1"
                    type="number"
                    value={outgoingPort}
                    onChange={(e) => setOutgoingPort(e.target.value)}
                  />
                  {validationErrors['outgoing.port'] && (
                    <p className="text-xs text-destructive">{validationErrors['outgoing.port']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outgoingEncryption">Encryption</Label>
                  <Select
                    value={outgoingEncryption}
                    onValueChange={(value) => setOutgoingEncryption(value as EncryptionType)}
                  >
                    <SelectTrigger id="outgoingEncryption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ssl">SSL/TLS</SelectItem>
                      <SelectItem value="tls">STARTTLS</SelectItem>
                      <SelectItem value="starttls">STARTTLS (Explicit)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outgoingAuthMethod">Authentication</Label>
                  <Select
                    value={outgoingAuthMethod}
                    onValueChange={(value) => setOutgoingAuthMethod(value as AuthenticationMethod)}
                  >
                    <SelectTrigger id="outgoingAuthMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="password">Password</SelectItem>
                      <SelectItem
                        disabled={!selectedPreset?.supportsAppPassword}
                        value="app-password"
                      >
                        App Password
                      </SelectItem>
                      <SelectItem disabled={!selectedPreset?.supportsOAuth} value="oauth2">
                        OAuth 2.0
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outgoingTimeout">Timeout (ms)</Label>
                  <Input
                    id="outgoingTimeout"
                    min="1000"
                    type="number"
                    value={outgoingTimeout}
                    onChange={(e) => setOutgoingTimeout(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outgoingUsername">Username *</Label>
                  <Input
                    required
                    id="outgoingUsername"
                    placeholder={email || 'username'}
                    value={outgoingUsername}
                    onChange={(e) => setOutgoingUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outgoingPassword">
                    Password {isEditing ? '(leave blank to keep current)' : '*'}
                  </Label>
                  <Input
                    id="outgoingPassword"
                    required={!isEditing}
                    type="password"
                    value={outgoingPassword}
                    onChange={(e) => setOutgoingPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <Button
              className="w-full"
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>
            {showAdvanced && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <input
                    checked={deleteAfterDownload}
                    className="h-4 w-4 rounded border-gray-300"
                    id="deleteAfterDownload"
                    type="checkbox"
                    onChange={(e) => setDeleteAfterDownload(e.target.checked)}
                  />
                  <Label className="font-normal" htmlFor="deleteAfterDownload">
                    Delete messages from server after downloading (POP3 only)
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Test Connection Results */}
          {testResult && (
            <div className="space-y-2 rounded-lg border p-4">
              <h4 className="text-sm font-semibold">Connection Test Results</h4>
              {testResult.incoming && (
                <div className="flex items-center gap-2">
                  {testResult.incoming.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">
                    Incoming ({incomingProtocol.toUpperCase()}):{' '}
                    {testResult.incoming.success
                      ? `Success (${testResult.incoming.latency}ms)`
                      : testResult.incoming.error}
                  </span>
                </div>
              )}
              {testResult.outgoing && (
                <div className="flex items-center gap-2">
                  {testResult.outgoing.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">
                    Outgoing (SMTP):{' '}
                    {testResult.outgoing.success
                      ? `Success (${testResult.outgoing.latency}ms)`
                      : testResult.outgoing.error}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Submit Error */}
          {validationErrors['submit'] && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {validationErrors['submit']}
            </div>
          )}

          <DialogFooter>
            <Button disabled={isSaving} type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              disabled={isSaving || isTestingConnection}
              type="button"
              variant="outline"
              onClick={() => void handleTestConnection()}
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
            <Button disabled={isSaving || isTestingConnection} type="submit">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Account'
              ) : (
                'Create Account'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
