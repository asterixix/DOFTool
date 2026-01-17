import { describe, it, expect } from 'vitest';

import {
  validateEmail,
  validateHost,
  validatePort,
  validateTimeout,
  validateRetryConfig,
  validateRateLimitConfig,
  validateConnectionPoolConfig,
  validateOAuth2Config,
} from './emailSettingsValidation';

describe('emailSettingsValidation', () => {
  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.org')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
    });
  });

  describe('validateHost', () => {
    it('should return true for valid hostname', () => {
      expect(validateHost('example.com')).toBe(true);
      expect(validateHost('mail.example.com')).toBe(true);
      expect(validateHost('sub.domain.example.org')).toBe(true);
    });

    it('should return true for localhost', () => {
      expect(validateHost('localhost')).toBe(true);
      expect(validateHost('127.0.0.1')).toBe(true);
    });

    it('should return true for valid IP address', () => {
      expect(validateHost('192.168.1.1')).toBe(true);
      expect(validateHost('10.0.0.1')).toBe(true);
    });

    it('should return false for empty or invalid host', () => {
      expect(validateHost('')).toBe(false);
      expect(validateHost('   ')).toBe(false);
    });
  });

  describe('validatePort', () => {
    it('should return true for valid ports', () => {
      expect(validatePort(25)).toBe(true);
      expect(validatePort(587)).toBe(true);
      expect(validatePort(993)).toBe(true);
      expect(validatePort(465)).toBe(true);
      expect(validatePort(1)).toBe(true);
      expect(validatePort(65535)).toBe(true);
    });

    it('should return false for invalid ports', () => {
      expect(validatePort(0)).toBe(false);
      expect(validatePort(-1)).toBe(false);
      expect(validatePort(65536)).toBe(false);
      expect(validatePort(1.5)).toBe(false);
    });
  });

  describe('validateTimeout', () => {
    it('should return true for valid timeouts', () => {
      expect(validateTimeout(1000)).toBe(true);
      expect(validateTimeout(30000)).toBe(true);
      expect(validateTimeout(300000)).toBe(true);
    });

    it('should return false for invalid timeouts', () => {
      expect(validateTimeout(0)).toBe(false);
      expect(validateTimeout(-1000)).toBe(false);
      expect(validateTimeout(300001)).toBe(false);
      expect(validateTimeout(1.5)).toBe(false);
    });
  });

  describe('validateRetryConfig', () => {
    it('should return no errors for valid config', () => {
      const config = {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryOnConnectionError: true,
        retryOnTimeout: true,
      };
      expect(validateRetryConfig(config)).toHaveLength(0);
    });

    it('should validate maxAttempts', () => {
      const config = {
        maxAttempts: 0,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryOnConnectionError: true,
        retryOnTimeout: true,
      };
      const errors = validateRetryConfig(config);
      expect(errors.some((e) => e.field === 'retry.maxAttempts')).toBe(true);
    });

    it('should validate initialDelay', () => {
      const config = {
        maxAttempts: 3,
        initialDelay: -1,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryOnConnectionError: true,
        retryOnTimeout: true,
      };
      const errors = validateRetryConfig(config);
      expect(errors.some((e) => e.field === 'retry.initialDelay')).toBe(true);
    });

    it('should validate maxDelay is greater than initialDelay', () => {
      const config = {
        maxAttempts: 3,
        initialDelay: 10000,
        maxDelay: 1000,
        backoffMultiplier: 2,
        retryOnConnectionError: true,
        retryOnTimeout: true,
      };
      const errors = validateRetryConfig(config);
      expect(errors.some((e) => e.field === 'retry.maxDelay')).toBe(true);
    });

    it('should validate backoffMultiplier', () => {
      const config = {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 0,
        retryOnConnectionError: true,
        retryOnTimeout: true,
      };
      const errors = validateRetryConfig(config);
      expect(errors.some((e) => e.field === 'retry.backoffMultiplier')).toBe(true);
    });
  });

  describe('validateRateLimitConfig', () => {
    it('should return no errors for valid config', () => {
      const config = {
        maxRequests: 100,
        windowMs: 60000,
        enabled: true,
      };
      expect(validateRateLimitConfig(config)).toHaveLength(0);
    });

    it('should validate maxRequests', () => {
      const config = {
        maxRequests: 0,
        windowMs: 60000,
        enabled: true,
      };
      const errors = validateRateLimitConfig(config);
      expect(errors.some((e) => e.field === 'rateLimit.maxRequests')).toBe(true);
    });

    it('should validate windowMs', () => {
      const config = {
        maxRequests: 100,
        windowMs: 500,
        enabled: true,
      };
      const errors = validateRateLimitConfig(config);
      expect(errors.some((e) => e.field === 'rateLimit.windowMs')).toBe(true);
    });
  });

  describe('validateConnectionPoolConfig', () => {
    it('should return no errors for valid config', () => {
      const config = {
        maxConnections: 5,
        minIdle: 1,
        idleTimeout: 30000,
        maxLifetime: 300000,
        enabled: true,
      };
      expect(validateConnectionPoolConfig(config)).toHaveLength(0);
    });

    it('should validate maxConnections', () => {
      const config = {
        maxConnections: 0,
        minIdle: 0,
        idleTimeout: 30000,
        maxLifetime: 300000,
        enabled: true,
      };
      const errors = validateConnectionPoolConfig(config);
      expect(errors.some((e) => e.field === 'connectionPool.maxConnections')).toBe(true);
    });

    it('should validate minIdle is less than maxConnections', () => {
      const config = {
        maxConnections: 5,
        minIdle: 10,
        idleTimeout: 30000,
        maxLifetime: 300000,
        enabled: true,
      };
      const errors = validateConnectionPoolConfig(config);
      expect(errors.some((e) => e.field === 'connectionPool.minIdle')).toBe(true);
    });

    it('should validate idleTimeout', () => {
      const config = {
        maxConnections: 5,
        minIdle: 1,
        idleTimeout: 500,
        maxLifetime: 300000,
        enabled: true,
      };
      const errors = validateConnectionPoolConfig(config);
      expect(errors.some((e) => e.field === 'connectionPool.idleTimeout')).toBe(true);
    });

    it('should validate maxLifetime is greater than idleTimeout', () => {
      const config = {
        maxConnections: 5,
        minIdle: 1,
        idleTimeout: 30000,
        maxLifetime: 20000,
        enabled: true,
      };
      const errors = validateConnectionPoolConfig(config);
      expect(errors.some((e) => e.field === 'connectionPool.maxLifetime')).toBe(true);
    });
  });

  describe('validateOAuth2Config', () => {
    it('should return no errors for valid config', () => {
      const config = {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'email profile',
      };
      expect(validateOAuth2Config(config)).toHaveLength(0);
    });

    it('should validate clientId', () => {
      const config = {
        clientId: '',
        clientSecret: 'secret',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'email',
      };
      const errors = validateOAuth2Config(config);
      expect(errors.some((e) => e.field === 'oauth2.clientId')).toBe(true);
    });

    it('should validate clientSecret', () => {
      const config = {
        clientId: 'client-id',
        clientSecret: '',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'email',
      };
      const errors = validateOAuth2Config(config);
      expect(errors.some((e) => e.field === 'oauth2.clientSecret')).toBe(true);
    });

    it('should validate authUrl is valid URL', () => {
      const config = {
        clientId: 'client-id',
        clientSecret: 'secret',
        authUrl: 'not-a-url',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'email',
      };
      const errors = validateOAuth2Config(config);
      expect(errors.some((e) => e.field === 'oauth2.authUrl')).toBe(true);
    });

    it('should validate tokenUrl is valid URL', () => {
      const config = {
        clientId: 'client-id',
        clientSecret: 'secret',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'not-a-url',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'email',
      };
      const errors = validateOAuth2Config(config);
      expect(errors.some((e) => e.field === 'oauth2.tokenUrl')).toBe(true);
    });

    it('should validate redirectUri is valid URL', () => {
      const config = {
        clientId: 'client-id',
        clientSecret: 'secret',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'not-a-url',
        scope: 'email',
      };
      const errors = validateOAuth2Config(config);
      expect(errors.some((e) => e.field === 'oauth2.redirectUri')).toBe(true);
    });

    it('should validate scope is present', () => {
      const config = {
        clientId: 'client-id',
        clientSecret: 'secret',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        redirectUri: 'http://localhost:3000/callback',
        scope: '',
      };
      const errors = validateOAuth2Config(config);
      expect(errors.some((e) => e.field === 'oauth2.scope')).toBe(true);
    });
  });
});
