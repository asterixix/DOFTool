/**
 * Email Settings Conversion Utilities
 * Converts between EmailSettings types and EmailService types
 */

import type {
  EmailAccountSettings,
  CreateEmailAccountSettingsInput,
  IncomingServerConfig,
  OutgoingServerConfig,
  ConnectionPoolConfig,
} from '../types/EmailSettings.types';

// Local type definitions matching EmailService types
interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailAccountConfig {
  id: string;
  email: string;
  displayName: string;
  userId: string;
  imap: ImapConfig;
  smtp: SmtpConfig;
}

/**
 * Converts encryption type to secure boolean
 * For nodemailer/imapflow:
 * - secure: true = direct SSL/TLS (port 465 for SMTP, 993 for IMAP)
 * - secure: false = STARTTLS (port 587 for SMTP, 143 for IMAP)
 * So only 'ssl' maps to secure: true, 'tls' and 'starttls' map to secure: false
 */
function encryptionToSecure(encryption: 'none' | 'ssl' | 'tls' | 'starttls'): boolean {
  // Only 'ssl' uses direct SSL/TLS (secure: true)
  // 'tls', 'starttls', and 'none' use STARTTLS or no encryption (secure: false)
  return encryption === 'ssl';
}

/**
 * Converts EmailSettings IncomingServerConfig to EmailService ImapConfig
 */
function convertIncomingToImapConfig(incoming: IncomingServerConfig): ImapConfig {
  return {
    host: incoming.host,
    port: incoming.port,
    secure: encryptionToSecure(incoming.encryption),
    auth: {
      user: incoming.username,
      pass: incoming.password ?? '',
    },
  };
}

/**
 * Converts EmailSettings OutgoingServerConfig to EmailService SmtpConfig
 */
function convertOutgoingToSmtpConfig(outgoing: OutgoingServerConfig): SmtpConfig {
  return {
    host: outgoing.host,
    port: outgoing.port,
    secure: encryptionToSecure(outgoing.encryption),
    auth: {
      user: outgoing.username,
      pass: outgoing.password ?? '',
    },
  };
}

/**
 * Converts EmailAccountSettings to EmailAccountConfig
 */
export function convertAccountSettingsToServiceConfig(
  accountSettings: EmailAccountSettings,
  userId: string
): EmailAccountConfig {
  return {
    id: accountSettings.id,
    email: accountSettings.email,
    displayName: accountSettings.displayName,
    userId,
    imap: convertIncomingToImapConfig(accountSettings.incoming),
    smtp: convertOutgoingToSmtpConfig(accountSettings.outgoing),
  };
}

/**
 * Converts CreateEmailAccountSettingsInput to EmailAccountConfig
 */
export function convertCreateInputToServiceConfig(
  input: CreateEmailAccountSettingsInput,
  accountId: string,
  userId: string
): EmailAccountConfig {
  // Merge default retry config
  const incomingRetry = {
    ...{
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryOnConnectionError: true,
      retryOnTimeout: true,
    },
    ...input.incoming.retry,
  };

  const outgoingRetry = {
    ...{
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryOnConnectionError: true,
      retryOnTimeout: true,
    },
    ...input.outgoing.retry,
  };

  const outgoingRateLimit = {
    ...{
      maxRequests: 100,
      windowMs: 60000,
      enabled: true,
    },
    ...input.outgoing.rateLimit,
  };

  const incomingConfig: IncomingServerConfig = {
    ...input.incoming,
    retry: incomingRetry,
  };

  const outgoingConfig: OutgoingServerConfig = {
    ...input.outgoing,
    retry: outgoingRetry,
    rateLimit: outgoingRateLimit,
  };

  const accountSettings: EmailAccountSettings = {
    id: accountId,
    email: input.email,
    displayName: input.displayName,
    provider: input.provider,
    incoming: incomingConfig,
    outgoing: outgoingConfig,
    syncInterval: input.syncInterval ?? 15,
    signature: input.signature ?? undefined,
    status: 'active',
    lastError: undefined,
    lastSyncAt: undefined,
    deleteAfterDownload: input.deleteAfterDownload ?? undefined,
    connectionPool: input.connectionPool as ConnectionPoolConfig | undefined,
  };

  return convertAccountSettingsToServiceConfig(accountSettings, userId);
}
