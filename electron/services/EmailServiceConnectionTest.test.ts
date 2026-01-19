import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  testImapConnection,
  testSmtpConnection,
  testEmailConnections,
} from './EmailServiceConnectionTest';

import type { ImapConfig, SmtpConfig } from './EmailService';

// Mock imapflow
const mockImapClient = {
  connect: vi.fn(),
  list: vi.fn(),
  logout: vi.fn(),
};

vi.mock('imapflow', () => ({
  ImapFlow: vi.fn(() => mockImapClient),
}));

// Mock nodemailer
const mockTransport = {
  verify: vi.fn(),
  close: vi.fn(),
};

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => mockTransport),
}));

describe('EmailServiceConnectionTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('testImapConnection', () => {
    const imapConfig: ImapConfig = {
      host: 'imap.example.com',
      port: 993,
      secure: true,
      auth: {
        user: 'test@example.com',
        pass: 'password',
      },
    };

    it('should test successful IMAP connection', async () => {
      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([{ name: 'INBOX' }, { name: 'Sent' }]);

      const result = await testImapConnection(imapConfig);

      expect(result.success).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(mockImapClient.connect).toHaveBeenCalled();
      expect(mockImapClient.list).toHaveBeenCalled();
      expect(mockImapClient.logout).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockImapClient.connect.mockRejectedValue(new Error('Connection refused'));

      const result = await testImapConnection(imapConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle timeout', async () => {
      mockImapClient.connect.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50000))
      );

      const result = await testImapConnection(imapConfig, 100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should handle no mailboxes found', async () => {
      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([]);

      const result = await testImapConnection(imapConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No mailboxes found');
    });

    it('should cleanup on error', async () => {
      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockRejectedValue(new Error('List failed'));

      const result = await testImapConnection(imapConfig);

      expect(result.success).toBe(false);
      expect(mockImapClient.logout).toHaveBeenCalled();
    });
  });

  describe('testSmtpConnection', () => {
    const smtpConfig: SmtpConfig = {
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: {
        user: 'test@example.com',
        pass: 'password',
      },
    };

    it('should test successful SMTP connection', async () => {
      mockTransport.verify.mockResolvedValue(undefined);

      const result = await testSmtpConnection(smtpConfig);

      expect(result.success).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(mockTransport.verify).toHaveBeenCalled();
      expect(mockTransport.close).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockTransport.verify.mockRejectedValue(new Error('Authentication failed'));

      const result = await testSmtpConnection(smtpConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle timeout', async () => {
      mockTransport.verify.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50000))
      );

      const result = await testSmtpConnection(smtpConfig, 100);

      expect(result.success).toBe(false);
    });
  });

  describe('testEmailConnections', () => {
    const imapConfig: ImapConfig = {
      host: 'imap.example.com',
      port: 993,
      secure: true,
      auth: {
        user: 'test@example.com',
        pass: 'password',
      },
    };

    const smtpConfig: SmtpConfig = {
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: {
        user: 'test@example.com',
        pass: 'password',
      },
    };

    it('should test both connections', async () => {
      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([{ name: 'INBOX' }]);
      mockTransport.verify.mockResolvedValue(undefined);

      const result = await testEmailConnections({
        testType: 'both',
        imap: imapConfig,
        smtp: smtpConfig,
      });

      expect(result.success).toBe(true);
      expect(result.incoming?.success).toBe(true);
      expect(result.outgoing?.success).toBe(true);
    });

    it('should test incoming only', async () => {
      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([{ name: 'INBOX' }]);

      const result = await testEmailConnections({
        testType: 'incoming',
        imap: imapConfig,
      });

      expect(result.success).toBe(true);
      expect(result.incoming?.success).toBe(true);
      expect(result.outgoing).toBeUndefined();
    });

    it('should test outgoing only', async () => {
      mockTransport.verify.mockResolvedValue(undefined);

      const result = await testEmailConnections({
        testType: 'outgoing',
        smtp: smtpConfig,
      });

      expect(result.success).toBe(true);
      expect(result.outgoing?.success).toBe(true);
      expect(result.incoming).toBeUndefined();
    });

    it('should return false if one connection fails', async () => {
      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([{ name: 'INBOX' }]);
      mockTransport.verify.mockRejectedValue(new Error('SMTP failed'));

      const result = await testEmailConnections({
        testType: 'both',
        imap: imapConfig,
        smtp: smtpConfig,
      });

      expect(result.success).toBe(false);
      expect(result.incoming?.success).toBe(true);
      expect(result.outgoing?.success).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockImapClient.connect.mockRejectedValue(new Error('IMAP failed'));

      const result = await testEmailConnections({
        testType: 'both',
        imap: imapConfig,
        smtp: smtpConfig,
      });

      expect(result.success).toBe(false);
      expect(result.incoming?.success).toBe(false);
    });
  });
});
