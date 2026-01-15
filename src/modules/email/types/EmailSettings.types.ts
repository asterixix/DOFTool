/**
 * Email Settings Types
 * Comprehensive types for email configuration with support for multiple protocols,
 * authentication methods, and advanced settings
 */

// ============================================================================
// Email Provider Types
// ============================================================================

export type EmailProvider =
  | 'custom'
  | 'gmail'
  | 'outlook'
  | 'yahoo'
  | 'icloud'
  | 'protonmail'
  | 'fastmail'
  | 'zoho'
  | 'aol';

export type EmailProtocol = 'imap' | 'pop3';

export type EncryptionType = 'none' | 'ssl' | 'tls' | 'starttls';

export type AuthenticationMethod = 'password' | 'oauth2' | 'app-password';

// ============================================================================
// OAuth 2.0 Configuration
// ============================================================================

export interface OAuth2Config {
  /** Client ID for OAuth 2.0 */
  clientId: string;
  /** Client Secret (encrypted) */
  clientSecret: string;
  /** Authorization URL */
  authUrl: string;
  /** Token URL */
  tokenUrl: string;
  /** Redirect URI */
  redirectUri: string;
  /** Scope */
  scope: string;
  /** Access Token (encrypted) */
  accessToken?: string;
  /** Refresh Token (encrypted) */
  refreshToken?: string;
  /** Token expiration timestamp */
  expiresAt?: number;
}

// ============================================================================
// Server Configuration
// ============================================================================

export interface IncomingServerConfig {
  /** Server protocol (IMAP or POP3) */
  protocol: EmailProtocol;
  /** Server hostname */
  host: string;
  /** Server port */
  port: number;
  /** Encryption type */
  encryption: EncryptionType;
  /** Authentication method */
  authMethod: AuthenticationMethod;
  /** Username */
  username: string;
  /** Password (encrypted, for password auth) */
  password: string | undefined;
  /** OAuth 2.0 configuration (for OAuth auth) */
  oauth2?: OAuth2Config;
  /** Connection timeout in milliseconds */
  timeout: number;
  /** Retry configuration */
  retry: RetryConfig;
  /** Allow self-signed certificates */
  allowInsecure?: boolean;
}

export interface OutgoingServerConfig {
  /** Server hostname */
  host: string;
  /** Server port */
  port: number;
  /** Encryption type */
  encryption: EncryptionType;
  /** Authentication method */
  authMethod: AuthenticationMethod;
  /** Username */
  username: string;
  /** Password (encrypted, for password auth) */
  password: string | undefined;
  /** OAuth 2.0 configuration (for OAuth auth) */
  oauth2?: OAuth2Config;
  /** Connection timeout in milliseconds */
  timeout: number;
  /** Retry configuration */
  retry: RetryConfig;
  /** Allow self-signed certificates */
  allowInsecure?: boolean;
  /** Rate limiting configuration */
  rateLimit: RateLimitConfig;
}

// ============================================================================
// Retry Configuration
// ============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay between retries in milliseconds */
  initialDelay: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  /** Retry on connection errors */
  retryOnConnectionError: boolean;
  /** Retry on timeout errors */
  retryOnTimeout: boolean;
}

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

export interface RateLimitConfig {
  /** Maximum number of requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Whether rate limiting is enabled */
  enabled: boolean;
}

// ============================================================================
// Email Account Settings
// ============================================================================

export interface EmailAccountSettings {
  /** Account ID */
  id: string;
  /** Email address */
  email: string;
  /** Display name for outgoing emails */
  displayName: string;
  /** Email provider */
  provider: EmailProvider;
  /** Incoming server configuration */
  incoming: IncomingServerConfig;
  /** Outgoing server configuration */
  outgoing: OutgoingServerConfig;
  /** Sync interval in minutes */
  syncInterval: number;
  /** Account signature */
  signature: string | undefined;
  /** Account status */
  status: 'active' | 'disabled' | 'error';
  /** Last error message */
  lastError: string | undefined;
  /** Last successful sync timestamp */
  lastSyncAt: number | undefined;
  /** Whether to delete messages from server after downloading (POP3 only) */
  deleteAfterDownload: boolean | undefined;
  /** Connection pooling configuration */
  connectionPool: ConnectionPoolConfig | undefined;
}

// ============================================================================
// Connection Pool Configuration
// ============================================================================

export interface ConnectionPoolConfig {
  /** Maximum number of connections in pool */
  maxConnections: number;
  /** Minimum number of idle connections */
  minIdle: number;
  /** Connection idle timeout in milliseconds */
  idleTimeout: number;
  /** Connection lifetime in milliseconds */
  maxLifetime: number;
  /** Whether connection pooling is enabled */
  enabled: boolean;
}

// ============================================================================
// Email Settings (Global Configuration)
// ============================================================================

export interface EmailSettings {
  /** Default sync interval in minutes */
  defaultSyncInterval: number;
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Default retry configuration */
  defaultRetry: RetryConfig;
  /** Default rate limit configuration */
  defaultRateLimit: RateLimitConfig;
  /** Global connection pool configuration */
  connectionPool: ConnectionPoolConfig;
  /** Whether to enable logging */
  enableLogging: boolean;
  /** Log level */
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  /** Maximum message size in bytes */
  maxMessageSize: number;
  /** Whether to enable message caching */
  enableCaching: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl: number;
  /** Account settings */
  accounts: EmailAccountSettings[];
}

// ============================================================================
// Email Settings Input Types
// ============================================================================

export interface CreateEmailAccountSettingsInput {
  email: string;
  displayName: string;
  provider: EmailProvider;
  incoming: Omit<IncomingServerConfig, 'retry'> & {
    retry?: Partial<RetryConfig>;
  };
  outgoing: Omit<OutgoingServerConfig, 'retry' | 'rateLimit'> & {
    retry?: Partial<RetryConfig>;
    rateLimit?: Partial<RateLimitConfig>;
  };
  syncInterval?: number;
  signature?: string | undefined;
  deleteAfterDownload?: boolean | undefined;
  connectionPool?: Partial<ConnectionPoolConfig>;
}

export interface UpdateEmailAccountSettingsInput {
  id: string;
  displayName?: string;
  incoming?: {
    protocol?: EmailProtocol;
    host?: string;
    port?: number;
    encryption?: EncryptionType;
    authMethod?: AuthenticationMethod;
    username?: string;
    password?: string | undefined;
    oauth2?: OAuth2Config;
    timeout?: number;
    retry?: RetryConfig;
    allowInsecure?: boolean;
  };
  outgoing?: {
    host?: string;
    port?: number;
    encryption?: EncryptionType;
    authMethod?: AuthenticationMethod;
    username?: string;
    password?: string | undefined;
    oauth2?: OAuth2Config;
    timeout?: number;
    retry?: RetryConfig;
    allowInsecure?: boolean;
    rateLimit?: RateLimitConfig;
  };
  syncInterval?: number | undefined;
  signature?: string | undefined;
  status?: EmailAccountSettings['status'];
  deleteAfterDownload?: boolean | undefined;
  connectionPool?: Partial<ConnectionPoolConfig>;
}

export interface TestConnectionInput {
  accountId?: string;
  incoming?: {
    protocol?: EmailProtocol;
    host?: string;
    port?: number;
    encryption?: EncryptionType;
    authMethod?: AuthenticationMethod;
    username?: string;
    password?: string | undefined;
    timeout?: number;
  };
  outgoing?: {
    host?: string;
    port?: number;
    encryption?: EncryptionType;
    authMethod?: AuthenticationMethod;
    username?: string;
    password?: string | undefined;
    timeout?: number;
  };
  testType: 'incoming' | 'outgoing' | 'both';
}

export interface TestConnectionResult {
  success: boolean;
  incoming?: {
    success: boolean;
    error?: string;
    latency?: number;
  };
  outgoing?: {
    success: boolean;
    error?: string;
    latency?: number;
  };
}

// ============================================================================
// Provider Presets
// ============================================================================

export interface EmailProviderPreset {
  provider: EmailProvider;
  name: string;
  incoming: {
    protocol: EmailProtocol;
    host: string;
    port: number;
    encryption: EncryptionType;
  };
  outgoing: {
    host: string;
    port: number;
    encryption: EncryptionType;
  };
  supportsOAuth: boolean;
  supportsAppPassword: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryOnConnectionError: true,
  retryOnTimeout: true,
};

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  enabled: true,
};

export const DEFAULT_CONNECTION_POOL_CONFIG: ConnectionPoolConfig = {
  maxConnections: 5,
  minIdle: 1,
  idleTimeout: 30000,
  maxLifetime: 300000,
  enabled: true,
};

export const EMAIL_PROVIDER_PRESETS: EmailProviderPreset[] = [
  {
    provider: 'gmail',
    name: 'Gmail',
    incoming: {
      protocol: 'imap',
      host: 'imap.gmail.com',
      port: 993,
      encryption: 'ssl',
    },
    outgoing: {
      host: 'smtp.gmail.com',
      port: 465,
      encryption: 'ssl',
    },
    supportsOAuth: true,
    supportsAppPassword: true,
  },
  {
    provider: 'outlook',
    name: 'Outlook / Microsoft 365',
    incoming: {
      protocol: 'imap',
      host: 'outlook.office365.com',
      port: 993,
      encryption: 'ssl',
    },
    outgoing: {
      host: 'smtp.office365.com',
      port: 587,
      encryption: 'tls',
    },
    supportsOAuth: true,
    supportsAppPassword: true,
  },
  {
    provider: 'yahoo',
    name: 'Yahoo Mail',
    incoming: {
      protocol: 'imap',
      host: 'imap.mail.yahoo.com',
      port: 993,
      encryption: 'ssl',
    },
    outgoing: {
      host: 'smtp.mail.yahoo.com',
      port: 587,
      encryption: 'tls',
    },
    supportsOAuth: true,
    supportsAppPassword: true,
  },
  {
    provider: 'icloud',
    name: 'iCloud Mail',
    incoming: {
      protocol: 'imap',
      host: 'imap.mail.me.com',
      port: 993,
      encryption: 'ssl',
    },
    outgoing: {
      host: 'smtp.mail.me.com',
      port: 587,
      encryption: 'tls',
    },
    supportsOAuth: false,
    supportsAppPassword: true,
  },
  {
    provider: 'protonmail',
    name: 'ProtonMail',
    incoming: {
      protocol: 'imap',
      host: '127.0.0.1',
      port: 1143,
      encryption: 'tls',
    },
    outgoing: {
      host: '127.0.0.1',
      port: 1025,
      encryption: 'tls',
    },
    supportsOAuth: false,
    supportsAppPassword: false,
  },
  {
    provider: 'fastmail',
    name: 'Fastmail',
    incoming: {
      protocol: 'imap',
      host: 'imap.fastmail.com',
      port: 993,
      encryption: 'ssl',
    },
    outgoing: {
      host: 'smtp.fastmail.com',
      port: 587,
      encryption: 'tls',
    },
    supportsOAuth: true,
    supportsAppPassword: true,
  },
  {
    provider: 'zoho',
    name: 'Zoho Mail',
    incoming: {
      protocol: 'imap',
      host: 'imap.zoho.com',
      port: 993,
      encryption: 'ssl',
    },
    outgoing: {
      host: 'smtp.zoho.com',
      port: 587,
      encryption: 'tls',
    },
    supportsOAuth: false,
    supportsAppPassword: true,
  },
  {
    provider: 'aol',
    name: 'AOL Mail',
    incoming: {
      protocol: 'imap',
      host: 'imap.aol.com',
      port: 993,
      encryption: 'ssl',
    },
    outgoing: {
      host: 'smtp.aol.com',
      port: 587,
      encryption: 'tls',
    },
    supportsOAuth: false,
    supportsAppPassword: true,
  },
  {
    provider: 'custom',
    name: 'Custom',
    incoming: {
      protocol: 'imap',
      host: '',
      port: 993,
      encryption: 'ssl',
    },
    outgoing: {
      host: '',
      port: 587,
      encryption: 'tls',
    },
    supportsOAuth: false,
    supportsAppPassword: false,
  },
];
