import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { EmailService } from './EmailService';

import type { EmailAccountConfig, SendEmailInput } from './EmailService';
import type { EncryptionService } from './EncryptionService';

// Mock imapflow
const mockImapClient = {
  connect: vi.fn(),
  list: vi.fn(),
  mailbox: vi.fn(),
  search: vi.fn(),
  fetchOne: vi.fn(),
  fetch: vi.fn(),
  download: vi.fn(),
  messageFlags: {
    add: vi.fn(),
    remove: vi.fn(),
  },
  move: vi.fn(),
  delete: vi.fn(),
  logout: vi.fn(),
  on: vi.fn(),
  mailboxOpen: vi.fn(),
  messageFlagsAdd: vi.fn(),
  messageFlagsRemove: vi.fn(),
};

vi.mock('imapflow', () => ({
  ImapFlow: vi.fn(() => mockImapClient),
}));

// Mock nodemailer
const mockTransport = {
  verify: vi.fn(),
  sendMail: vi.fn(),
  close: vi.fn(),
};

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => mockTransport),
}));

describe('EmailService', () => {
  let emailService: EmailService;
  let mockEncryptionService: EncryptionService;
  let mockStorageService: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    getKeysByPrefix: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockEncryptionService = {
      encrypt: vi.fn((data: string) => Promise.resolve(data)),
      decrypt: vi.fn((data: string) => Promise.resolve(data)),
    } as unknown as EncryptionService;

    mockStorageService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getKeysByPrefix: vi.fn().mockResolvedValue([]),
    };

    emailService = new EmailService(mockEncryptionService, mockStorageService as any);
  });

  afterEach(async () => {
    try {
      // Clean up connections by closing the service
      await emailService.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should initialize service', async () => {
      await emailService.initialize();

      expect(mockStorageService.getKeysByPrefix).toHaveBeenCalledWith('email:account:');
    });

    it('should load accounts from storage', async () => {
      mockStorageService.getKeysByPrefix.mockResolvedValue(['email:account:account-1']);
      mockStorageService.get.mockResolvedValue(
        JSON.stringify({
          id: 'account-1',
          email: 'test@example.com',
          displayName: 'Test',
          userId: 'user-1',
          imap: {
            host: 'imap.example.com',
            port: 993,
            secure: true,
            auth: {
              user: 'test@example.com',
              pass: 'password',
            },
          },
          smtp: {
            host: 'smtp.example.com',
            port: 465,
            secure: true,
            auth: {
              user: 'test@example.com',
              pass: 'password',
            },
          },
        })
      );

      await emailService.initialize();

      const accounts = emailService.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].email).toBe('test@example.com');
    });
  });

  describe('addAccount', () => {
    beforeEach(async () => {
      await emailService.initialize();
    });

    it('should add email account', async () => {
      const accountConfig: EmailAccountConfig = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test',
        userId: 'user-1',
        imap: {
          host: 'imap.example.com',
          port: 993,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
        smtp: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
      };

      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([{ name: 'INBOX' }]);

      const added = await emailService.addAccount(accountConfig);

      expect(added).toEqual(accountConfig);
      expect(mockStorageService.set).toHaveBeenCalled();
      expect(emailService.getAccounts()).toHaveLength(1);
    });

    it('should handle connection errors', async () => {
      const accountConfig: EmailAccountConfig = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test',
        userId: 'user-1',
        imap: {
          host: 'invalid.example.com',
          port: 993,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
        smtp: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
      };

      mockImapClient.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(emailService.addAccount(accountConfig)).rejects.toThrow();
    });
  });

  describe('removeAccount', () => {
    beforeEach(async () => {
      await emailService.initialize();
    });

    it('should remove email account', async () => {
      const accountConfig: EmailAccountConfig = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test',
        userId: 'user-1',
        imap: {
          host: 'imap.example.com',
          port: 993,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
        smtp: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
      };

      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([{ name: 'INBOX' }]);
      mockImapClient.logout.mockResolvedValue(undefined);

      await emailService.addAccount(accountConfig);
      await emailService.removeAccount('account-1');

      expect(mockStorageService.delete).toHaveBeenCalledWith('email:account:account-1');
      expect(emailService.getAccounts()).toHaveLength(0);
    });
  });

  describe('getAccountById', () => {
    beforeEach(async () => {
      await emailService.initialize();
    });

    it('should get account by id', async () => {
      const accountConfig: EmailAccountConfig = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test',
        userId: 'user-1',
        imap: {
          host: 'imap.example.com',
          port: 993,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
        smtp: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
      };

      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([{ name: 'INBOX' }]);

      await emailService.addAccount(accountConfig);

      const account = emailService.getAccountById('account-1');
      expect(account).toBeDefined();
      expect(account?.email).toBe('test@example.com');
    });

    it('should return undefined for non-existent account', () => {
      const account = emailService.getAccountById('non-existent');
      expect(account).toBeUndefined();
    });
  });

  describe('fetchMessages', () => {
    beforeEach(async () => {
      await emailService.initialize();

      const accountConfig: EmailAccountConfig = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test',
        userId: 'user-1',
        imap: {
          host: 'imap.example.com',
          port: 993,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
        smtp: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
      };

      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([{ name: 'INBOX' }]);

      await emailService.addAccount(accountConfig);
    });

    it('should fetch messages from folder', async () => {
      mockImapClient.mailboxOpen.mockResolvedValue({
        exists: 10,
        recent: 2,
        unseen: 5,
      });

      mockImapClient.search.mockResolvedValue([1, 2, 3]);

      const mockMessage = {
        uid: 1,
        envelope: {
          messageId: '<msg-1@example.com>',
          subject: 'Test Subject',
          from: [{ name: 'Sender', address: 'sender@example.com' }],
          to: [{ name: 'Recipient', address: 'recipient@example.com' }],
          date: new Date(),
        },
        flags: [],
        size: 1000,
      };

      mockImapClient.fetch.mockReturnValue(
        (async function* () {
          yield mockMessage;
        })()
      );

      const messages = await emailService.fetchMessages('account-1', 'INBOX');

      expect(messages).toBeDefined();
      expect(mockImapClient.connect).toHaveBeenCalled();
      expect(mockImapClient.mailboxOpen).toHaveBeenCalledWith('INBOX');
      expect(mockImapClient.fetch).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      mockImapClient.mailboxOpen.mockRejectedValue(new Error('SELECT failed: Mailbox not found'));

      const messages = await emailService.fetchMessages('account-1', 'INVALID');
      expect(messages).toEqual([]);
    });
  });

  describe('sendEmail', () => {
    beforeEach(async () => {
      await emailService.initialize();

      const accountConfig: EmailAccountConfig = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test',
        userId: 'user-1',
        imap: {
          host: 'imap.example.com',
          port: 993,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
        smtp: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
      };

      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([{ name: 'INBOX' }]);
      mockTransport.verify.mockResolvedValue(undefined);
      mockTransport.sendMail.mockResolvedValue({ messageId: '<sent-msg@example.com>' });

      await emailService.addAccount(accountConfig);
    });

    it('should send email', async () => {
      const input: SendEmailInput = {
        accountId: 'account-1',
        to: [{ name: 'Recipient', address: 'recipient@example.com' }],
        subject: 'Test Subject',
        text: 'Test body',
      };

      await expect(emailService.sendEmail(input)).resolves.toBeUndefined();
      expect(mockTransport.sendMail).toHaveBeenCalled();
    });

    it('should handle send errors', async () => {
      mockTransport.sendMail.mockRejectedValue(new Error('Send failed'));

      const input: SendEmailInput = {
        accountId: 'account-1',
        to: [{ address: 'recipient@example.com' }],
        subject: 'Test',
        text: 'Test',
      };

      await expect(emailService.sendEmail(input)).rejects.toThrow();
    });
  });

  describe('markAsRead', () => {
    beforeEach(async () => {
      await emailService.initialize();

      const accountConfig: EmailAccountConfig = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test',
        userId: 'user-1',
        imap: {
          host: 'imap.example.com',
          port: 993,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
        smtp: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
      };

      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([{ name: 'INBOX' }]);
      mockImapClient.messageFlags.add.mockResolvedValue(undefined);

      await emailService.addAccount(accountConfig);
    });

    it('should mark message as read', async () => {
      await emailService.markAsRead('account-1', 1, true);

      expect(mockImapClient.messageFlagsAdd).toHaveBeenCalledWith({ uid: 1 }, ['\\Seen']);
    });

    it('should mark message as unread', async () => {
      mockImapClient.messageFlagsRemove.mockResolvedValue(undefined);

      await emailService.markAsRead('account-1', 1, false);

      expect(mockImapClient.messageFlagsRemove).toHaveBeenCalledWith({ uid: 1 }, ['\\Seen']);
    });
  });

  describe('getFolders', () => {
    beforeEach(async () => {
      await emailService.initialize();

      const accountConfig: EmailAccountConfig = {
        id: 'account-1',
        email: 'test@example.com',
        displayName: 'Test',
        userId: 'user-1',
        imap: {
          host: 'imap.example.com',
          port: 993,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
        smtp: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          auth: {
            user: 'test@example.com',
            pass: 'password',
          },
        },
      };

      mockImapClient.connect.mockResolvedValue(undefined);
      mockImapClient.list.mockResolvedValue([
        { name: 'INBOX', path: 'INBOX', listed: true, subscribed: true },
        { name: 'Sent', path: 'Sent', listed: true, subscribed: true },
      ]);

      await emailService.addAccount(accountConfig);
    });

    it('should get folders for account', async () => {
      const folders = await emailService.getFolders('account-1');

      expect(folders).toBeDefined();
      expect(folders.length).toBeGreaterThan(0);
      expect(mockImapClient.list).toHaveBeenCalled();
    });
  });
});
