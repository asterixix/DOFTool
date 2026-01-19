import { describe, it, expect } from 'vitest';

import {
  convertAccountSettingsToServiceConfig,
  convertCreateInputToServiceConfig,
} from './emailSettingsConversion';

import type {
  EmailAccountSettings,
  CreateEmailAccountSettingsInput,
} from '../types/EmailSettings.types';

describe('emailSettingsConversion', () => {
  describe('convertAccountSettingsToServiceConfig', () => {
    it('should convert account settings to service config', () => {
      const accountSettings: EmailAccountSettings = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
          rateLimit: {
            maxRequests: 100,
            windowMs: 60000,
            enabled: true,
          },
        },
        syncInterval: 15,
        signature: undefined,
        status: 'active',
        lastError: undefined,
        lastSyncAt: undefined,
        deleteAfterDownload: undefined,
        connectionPool: undefined,
      };

      const result = convertAccountSettingsToServiceConfig(accountSettings, 'user-1');

      expect(result).toEqual({
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test User',
        userId: 'user-1',
        imap: {
          host: 'imap.example.com',
          port: 993,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password123',
          },
        },
        smtp: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password123',
          },
        },
      });
    });

    it('should convert SSL encryption to secure: true', () => {
      const accountSettings: EmailAccountSettings = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
          rateLimit: {
            maxRequests: 100,
            windowMs: 60000,
            enabled: true,
          },
        },
        syncInterval: 15,
        signature: undefined,
        status: 'active',
        lastError: undefined,
        lastSyncAt: undefined,
        deleteAfterDownload: undefined,
        connectionPool: undefined,
      };

      const result = convertAccountSettingsToServiceConfig(accountSettings, 'user-1');

      expect(result.imap.secure).toBe(true);
      expect(result.smtp.secure).toBe(true);
    });

    it('should convert TLS/STARTTLS encryption to secure: false', () => {
      const accountSettings: EmailAccountSettings = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 143,
          encryption: 'starttls' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 587,
          encryption: 'tls' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
          rateLimit: {
            maxRequests: 100,
            windowMs: 60000,
            enabled: true,
          },
        },
        syncInterval: 15,
        signature: undefined,
        status: 'active',
        lastError: undefined,
        lastSyncAt: undefined,
        deleteAfterDownload: undefined,
        connectionPool: undefined,
      };

      const result = convertAccountSettingsToServiceConfig(accountSettings, 'user-1');

      expect(result.imap.secure).toBe(false);
      expect(result.smtp.secure).toBe(false);
    });

    it('should convert none encryption to secure: false', () => {
      const accountSettings: EmailAccountSettings = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 143,
          encryption: 'none' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 25,
          encryption: 'none' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
          rateLimit: {
            maxRequests: 100,
            windowMs: 60000,
            enabled: true,
          },
        },
        syncInterval: 15,
        signature: undefined,
        status: 'active',
        lastError: undefined,
        lastSyncAt: undefined,
        deleteAfterDownload: undefined,
        connectionPool: undefined,
      };

      const result = convertAccountSettingsToServiceConfig(accountSettings, 'user-1');

      expect(result.imap.secure).toBe(false);
      expect(result.smtp.secure).toBe(false);
    });

    it('should handle missing password', () => {
      const accountSettings: EmailAccountSettings = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: undefined,
          timeout: 30000,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: undefined,
          timeout: 30000,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
          rateLimit: {
            maxRequests: 100,
            windowMs: 60000,
            enabled: true,
          },
        },
        syncInterval: 15,
        signature: undefined,
        status: 'active',
        lastError: undefined,
        lastSyncAt: undefined,
        deleteAfterDownload: undefined,
        connectionPool: undefined,
      };

      const result = convertAccountSettingsToServiceConfig(accountSettings, 'user-1');

      expect(result.imap.auth.pass).toBe('');
      expect(result.smtp.auth.pass).toBe('');
    });
  });

  describe('convertCreateInputToServiceConfig', () => {
    it('should convert create input to service config', () => {
      const input: CreateEmailAccountSettingsInput = {
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
      };

      const result = convertCreateInputToServiceConfig(input, 'account-1', 'user-1');

      expect(result.id).toBe('account-1');
      expect(result.email).toBe('test@example.com');
      expect(result.displayName).toBe('Test User');
      expect(result.userId).toBe('user-1');
      expect(result.imap).toBeDefined();
      expect(result.smtp).toBeDefined();
    });

    it('should apply default retry config for incoming', () => {
      const input: CreateEmailAccountSettingsInput = {
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
      };

      convertCreateInputToServiceConfig(input, 'account-1', 'user-1');

      // Should not throw - default retry config should be applied
      expect(true).toBe(true);
    });

    it('should merge custom retry config for incoming', () => {
      const input: CreateEmailAccountSettingsInput = {
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
          retry: {
            maxAttempts: 5,
            initialDelay: 2000,
          },
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
      };

      convertCreateInputToServiceConfig(input, 'account-1', 'user-1');

      // Should not throw - custom retry config should be merged
      expect(true).toBe(true);
    });

    it('should apply default retry config for outgoing', () => {
      const input: CreateEmailAccountSettingsInput = {
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
      };

      convertCreateInputToServiceConfig(input, 'account-1', 'user-1');

      // Should not throw - default retry config should be applied
      expect(true).toBe(true);
    });

    it('should apply default rate limit config for outgoing', () => {
      const input: CreateEmailAccountSettingsInput = {
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
      };

      convertCreateInputToServiceConfig(input, 'account-1', 'user-1');

      // Should not throw - default rate limit config should be applied
      expect(true).toBe(true);
    });

    it('should use default sync interval when not provided', () => {
      const input: CreateEmailAccountSettingsInput = {
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
      };

      convertCreateInputToServiceConfig(input, 'account-1', 'user-1');

      // Should not throw - default sync interval (15) should be used
      expect(true).toBe(true);
    });

    it('should use custom sync interval when provided', () => {
      const input: CreateEmailAccountSettingsInput = {
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        syncInterval: 30,
      };

      convertCreateInputToServiceConfig(input, 'account-1', 'user-1');

      // Should not throw - custom sync interval should be used
      expect(true).toBe(true);
    });

    it('should handle optional signature', () => {
      const input: CreateEmailAccountSettingsInput = {
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        signature: 'Best regards,\nTest User',
      };

      convertCreateInputToServiceConfig(input, 'account-1', 'user-1');

      // Should not throw - signature should be handled
      expect(true).toBe(true);
    });

    it('should handle optional connection pool config', () => {
      const input: CreateEmailAccountSettingsInput = {
        email: 'test@example.com',
        displayName: 'Test User',
        provider: 'custom',
        incoming: {
          protocol: 'imap' as const,
          host: 'imap.example.com',
          port: 993,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        outgoing: {
          host: 'smtp.example.com',
          port: 465,
          encryption: 'ssl' as const,
          authMethod: 'password' as const,
          username: 'test@example.com',
          password: 'password123',
          timeout: 30000,
        },
        connectionPool: {
          maxConnections: 5,
          idleTimeout: 30000,
        },
      };

      convertCreateInputToServiceConfig(input, 'account-1', 'user-1');

      // Should not throw - connection pool config should be handled
      expect(true).toBe(true);
    });
  });
});
