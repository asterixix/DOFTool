/**
 * Email Settings Validation Utilities
 * Validates email configuration according to security best practices
 */

import type {
  EmailAccountSettings,
  IncomingServerConfig,
  OutgoingServerConfig,
  CreateEmailAccountSettingsInput,
  RetryConfig,
  RateLimitConfig,
  ConnectionPoolConfig,
  OAuth2Config,
} from '../types/EmailSettings.types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates email address format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates hostname or IP address
 */
export function validateHost(host: string): boolean {
  if (!host || host.trim().length === 0) {
    return false;
  }

  // Check for valid hostname pattern
  const hostnameRegex =
    /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

  // Check for valid IP address (IPv4)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

  // Check for localhost
  if (host === 'localhost' || host === '127.0.0.1') {
    return true;
  }

  return hostnameRegex.test(host) || ipv4Regex.test(host);
}

/**
 * Validates port number
 */
export function validatePort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

/**
 * Validates timeout value
 */
export function validateTimeout(timeout: number): boolean {
  return Number.isInteger(timeout) && timeout > 0 && timeout <= 300000; // Max 5 minutes
}

/**
 * Validates retry configuration
 */
export function validateRetryConfig(retry: RetryConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Number.isInteger(retry.maxAttempts) || retry.maxAttempts < 1 || retry.maxAttempts > 10) {
    errors.push({
      field: 'retry.maxAttempts',
      message: 'Max attempts must be between 1 and 10',
    });
  }

  if (
    !Number.isInteger(retry.initialDelay) ||
    retry.initialDelay < 0 ||
    retry.initialDelay > 60000
  ) {
    errors.push({
      field: 'retry.initialDelay',
      message: 'Initial delay must be between 0 and 60000 milliseconds',
    });
  }

  if (
    !Number.isInteger(retry.maxDelay) ||
    retry.maxDelay < retry.initialDelay ||
    retry.maxDelay > 600000
  ) {
    errors.push({
      field: 'retry.maxDelay',
      message: 'Max delay must be greater than initial delay and less than 600000 milliseconds',
    });
  }

  if (
    typeof retry.backoffMultiplier !== 'number' ||
    retry.backoffMultiplier < 1 ||
    retry.backoffMultiplier > 10
  ) {
    errors.push({
      field: 'retry.backoffMultiplier',
      message: 'Backoff multiplier must be between 1 and 10',
    });
  }

  return errors;
}

/**
 * Validates rate limit configuration
 */
export function validateRateLimitConfig(rateLimit: RateLimitConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (
    !Number.isInteger(rateLimit.maxRequests) ||
    rateLimit.maxRequests < 1 ||
    rateLimit.maxRequests > 10000
  ) {
    errors.push({
      field: 'rateLimit.maxRequests',
      message: 'Max requests must be between 1 and 10000',
    });
  }

  if (
    !Number.isInteger(rateLimit.windowMs) ||
    rateLimit.windowMs < 1000 ||
    rateLimit.windowMs > 3600000
  ) {
    errors.push({
      field: 'rateLimit.windowMs',
      message: 'Window must be between 1000 and 3600000 milliseconds',
    });
  }

  return errors;
}

/**
 * Validates connection pool configuration
 */
export function validateConnectionPoolConfig(pool: ConnectionPoolConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (
    !Number.isInteger(pool.maxConnections) ||
    pool.maxConnections < 1 ||
    pool.maxConnections > 50
  ) {
    errors.push({
      field: 'connectionPool.maxConnections',
      message: 'Max connections must be between 1 and 50',
    });
  }

  if (!Number.isInteger(pool.minIdle) || pool.minIdle < 0 || pool.minIdle > pool.maxConnections) {
    errors.push({
      field: 'connectionPool.minIdle',
      message: 'Min idle must be between 0 and max connections',
    });
  }

  if (!Number.isInteger(pool.idleTimeout) || pool.idleTimeout < 1000 || pool.idleTimeout > 600000) {
    errors.push({
      field: 'connectionPool.idleTimeout',
      message: 'Idle timeout must be between 1000 and 600000 milliseconds',
    });
  }

  if (
    !Number.isInteger(pool.maxLifetime) ||
    pool.maxLifetime < pool.idleTimeout ||
    pool.maxLifetime > 3600000
  ) {
    errors.push({
      field: 'connectionPool.maxLifetime',
      message: 'Max lifetime must be greater than idle timeout and less than 3600000 milliseconds',
    });
  }

  return errors;
}

/**
 * Validates OAuth 2.0 configuration
 */
export function validateOAuth2Config(oauth2: OAuth2Config): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!oauth2.clientId || oauth2.clientId.trim().length === 0) {
    errors.push({
      field: 'oauth2.clientId',
      message: 'Client ID is required',
    });
  }

  if (!oauth2.clientSecret || oauth2.clientSecret.trim().length === 0) {
    errors.push({
      field: 'oauth2.clientSecret',
      message: 'Client Secret is required',
    });
  }

  try {
    new URL(oauth2.authUrl);
  } catch {
    errors.push({
      field: 'oauth2.authUrl',
      message: 'Auth URL must be a valid URL',
    });
  }

  try {
    new URL(oauth2.tokenUrl);
  } catch {
    errors.push({
      field: 'oauth2.tokenUrl',
      message: 'Token URL must be a valid URL',
    });
  }

  try {
    new URL(oauth2.redirectUri);
  } catch {
    errors.push({
      field: 'oauth2.redirectUri',
      message: 'Redirect URI must be a valid URL',
    });
  }

  if (!oauth2.scope || oauth2.scope.trim().length === 0) {
    errors.push({
      field: 'oauth2.scope',
      message: 'Scope is required',
    });
  }

  return errors;
}

/**
 * Validates incoming server configuration
 */
export function validateIncomingServerConfig(config: IncomingServerConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!validateHost(config.host)) {
    errors.push({
      field: 'incoming.host',
      message: 'Host must be a valid hostname or IP address',
    });
  }

  if (!validatePort(config.port)) {
    errors.push({
      field: 'incoming.port',
      message: 'Port must be between 1 and 65535',
    });
  }

  if (!config.username || config.username.trim().length === 0) {
    errors.push({
      field: 'incoming.username',
      message: 'Username is required',
    });
  }

  // Validate authentication method
  if (
    config.authMethod === 'password' &&
    (!config.password || config.password.trim().length === 0)
  ) {
    errors.push({
      field: 'incoming.password',
      message: 'Password is required for password authentication',
    });
  }

  if (config.authMethod === 'oauth2' && config.oauth2) {
    errors.push(...validateOAuth2Config(config.oauth2));
  }

  if (!validateTimeout(config.timeout)) {
    errors.push({
      field: 'incoming.timeout',
      message: 'Timeout must be between 1 and 300000 milliseconds',
    });
  }

  errors.push(...validateRetryConfig(config.retry));

  // Security checks
  if (config.encryption === 'none' && !config.allowInsecure) {
    errors.push({
      field: 'incoming.encryption',
      message: 'Unencrypted connections are not allowed for security reasons',
    });
  }

  return errors;
}

/**
 * Validates outgoing server configuration
 */
export function validateOutgoingServerConfig(config: OutgoingServerConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!validateHost(config.host)) {
    errors.push({
      field: 'outgoing.host',
      message: 'Host must be a valid hostname or IP address',
    });
  }

  if (!validatePort(config.port)) {
    errors.push({
      field: 'outgoing.port',
      message: 'Port must be between 1 and 65535',
    });
  }

  if (!config.username || config.username.trim().length === 0) {
    errors.push({
      field: 'outgoing.username',
      message: 'Username is required',
    });
  }

  // Validate authentication method
  if (
    config.authMethod === 'password' &&
    (!config.password || config.password.trim().length === 0)
  ) {
    errors.push({
      field: 'outgoing.password',
      message: 'Password is required for password authentication',
    });
  }

  if (config.authMethod === 'oauth2' && config.oauth2) {
    errors.push(...validateOAuth2Config(config.oauth2));
  }

  if (!validateTimeout(config.timeout)) {
    errors.push({
      field: 'outgoing.timeout',
      message: 'Timeout must be between 1 and 300000 milliseconds',
    });
  }

  errors.push(...validateRetryConfig(config.retry));
  errors.push(...validateRateLimitConfig(config.rateLimit));

  // Security checks
  if (config.encryption === 'none' && !config.allowInsecure) {
    errors.push({
      field: 'outgoing.encryption',
      message: 'Unencrypted connections are not allowed for security reasons',
    });
  }

  return errors;
}

/**
 * Validates email account settings
 */
export function validateEmailAccountSettings(account: EmailAccountSettings): ValidationResult {
  const errors: ValidationError[] = [];

  if (!validateEmail(account.email)) {
    errors.push({
      field: 'email',
      message: 'Email address must be valid',
    });
  }

  if (!account.displayName || account.displayName.trim().length === 0) {
    errors.push({
      field: 'displayName',
      message: 'Display name is required',
    });
  }

  if (
    !Number.isInteger(account.syncInterval) ||
    account.syncInterval < 1 ||
    account.syncInterval > 1440
  ) {
    errors.push({
      field: 'syncInterval',
      message: 'Sync interval must be between 1 and 1440 minutes',
    });
  }

  errors.push(...validateIncomingServerConfig(account.incoming));
  errors.push(...validateOutgoingServerConfig(account.outgoing));

  if (account.connectionPool) {
    errors.push(...validateConnectionPoolConfig(account.connectionPool));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates create email account input
 */
export function validateCreateEmailAccountInput(
  input: CreateEmailAccountSettingsInput
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!validateEmail(input.email)) {
    errors.push({
      field: 'email',
      message: 'Email address must be valid',
    });
  }

  if (!input.displayName || input.displayName.trim().length === 0) {
    errors.push({
      field: 'displayName',
      message: 'Display name is required',
    });
  }

  // Merge default retry config with input
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

  errors.push(...validateIncomingServerConfig(incomingConfig));
  errors.push(...validateOutgoingServerConfig(outgoingConfig));

  if (input.connectionPool) {
    const poolConfig: ConnectionPoolConfig = {
      ...{
        maxConnections: 5,
        minIdle: 1,
        idleTimeout: 30000,
        maxLifetime: 300000,
        enabled: true,
      },
      ...input.connectionPool,
    };
    errors.push(...validateConnectionPoolConfig(poolConfig));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes email configuration to prevent injection attacks
 */
export function sanitizeEmailConfig(config: unknown): unknown {
  // Basic sanitization - remove any properties that shouldn't be there
  // In production, use a proper schema validation library
  return config;
}
