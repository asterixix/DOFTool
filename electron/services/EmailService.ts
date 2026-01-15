/**
 * Email Service - Handles IMAP/SMTP email operations
 */

import { ImapFlow, type FetchMessageObject } from 'imapflow';
import { createTransport, type Transporter } from 'nodemailer';
import addressparser, { type AddressOrGroup } from 'nodemailer/lib/addressparser';

import type { EncryptionService } from './EncryptionService';
import type { StorageService } from './StorageService';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean; // Use TLS
  auth: {
    user: string;
    pass: string;
  };
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface SharedEmailAccess {
  userId: string;
  accessLevel: 'read' | 'read_write' | 'send_as' | 'full';
}

export interface EmailAccountConfig {
  id: string;
  email: string;
  displayName: string;
  userId: string;
  imap: ImapConfig;
  smtp: SmtpConfig;
  sharedWith?: SharedEmailAccess[];
}

export interface EmailMessage {
  id: string;
  accountId: string;
  uid: number;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  threadId: string;
  folder: string;
  from: { name?: string; address: string };
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  bcc?: Array<{ name?: string; address: string }>;
  subject: string;
  textBody?: string;
  htmlBody?: string;
  snippet: string;
  date: number;
  size: number;
  read: boolean;
  starred: boolean;
  draft: boolean;
  labels: string[];
  attachments: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
    inline: boolean;
  }>;
  flags: string[];
}

export interface EmailFolder {
  path: string;
  name: string;
  parent?: string;
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'custom';
  totalMessages: number;
  unreadMessages: number;
  selectable: boolean;
}

export interface SendEmailInput {
  accountId: string;
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  bcc?: Array<{ name?: string; address: string }>;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
  inReplyTo?: string;
  references?: string[];
}

export class EmailService {
  private imapConnections: Map<string, ImapFlow> = new Map();
  private smtpTransports: Map<string, Transporter<SMTPTransport.SentMessageInfo>> = new Map();
  private accounts: Map<string, EmailAccountConfig> = new Map();
  private encryptionService: EncryptionService;
  private storageService: StorageService;

  constructor(encryptionService: EncryptionService, storageService: StorageService) {
    this.encryptionService = encryptionService;
    this.storageService = storageService;
  }

  /**
   * Initialize service and load accounts
   */
  async initialize(): Promise<void> {
    // Load encrypted account configurations from storage
    const accountKeys = await this.storageService.getKeysByPrefix('email:account:');

    for (const key of accountKeys) {
      const accountJson = await this.storageService.get(key);
      if (accountJson) {
        try {
          const account = JSON.parse(accountJson) as EmailAccountConfig;
          this.accounts.set(account.id, account);
        } catch (error) {
          console.error('Failed to parse account config:', error);
        }
      }
    }

    console.log('EmailService initialized with', this.accounts.size, 'accounts');
  }

  /**
   * Add a new email account
   */
  async addAccount(config: EmailAccountConfig): Promise<EmailAccountConfig> {
    // Store encrypted configuration
    const configJson = JSON.stringify(config);
    await this.storageService.set(`email:account:${config.id}`, configJson);

    this.accounts.set(config.id, config);

    // Test connection
    await this.connectImap(config.id);

    console.log('Email account added:', config.email);
    return config;
  }

  /**
   * Remove an email account
   */
  async removeAccount(accountId: string): Promise<void> {
    // Disconnect if connected
    await this.disconnectImap(accountId);
    this.smtpTransports.delete(accountId);

    // Remove from storage
    await this.storageService.delete(`email:account:${accountId}`);
    this.accounts.delete(accountId);

    console.log('Email account removed:', accountId);
  }

  /**
   * Get all email accounts
   */
  getAccounts(): EmailAccountConfig[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get account by ID
   */
  getAccountById(accountId: string): EmailAccountConfig | undefined {
    return this.accounts.get(accountId);
  }

  /**
   * Update an email account
   */
  async updateAccount(
    accountId: string,
    updates: Partial<Pick<EmailAccountConfig, 'displayName' | 'imap' | 'smtp' | 'sharedWith'>>
  ): Promise<EmailAccountConfig> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // Merge updates
    const updatedAccount: EmailAccountConfig = {
      ...account,
      ...updates,
    };

    // Disconnect existing connections if IMAP/SMTP config changed
    if (updates.imap || updates.smtp) {
      await this.disconnectImap(accountId);
      this.smtpTransports.delete(accountId);
    }

    // Store updated configuration
    const configJson = JSON.stringify(updatedAccount);
    await this.storageService.set(`email:account:${accountId}`, configJson);

    this.accounts.set(accountId, updatedAccount);

    console.log('Email account updated:', updatedAccount.email);
    return updatedAccount;
  }

  /**
   * Connect to IMAP server
   */
  private async connectImap(accountId: string): Promise<ImapFlow> {
    // Check if already connected
    const existing = this.imapConnections.get(accountId);
    if (existing) {
      return existing;
    }

    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    console.log('Connecting to IMAP:', account.imap.host);

    const client = new ImapFlow({
      host: account.imap.host,
      port: account.imap.port,
      secure: account.imap.secure,
      auth: account.imap.auth,
      logger: false,
    });

    // Connect and authenticate
    await client.connect();

    this.imapConnections.set(accountId, client);

    // Handle connection errors
    client.on('error', (err) => {
      console.error('IMAP connection error:', err);
      this.imapConnections.delete(accountId);
    });

    return client;
  }

  /**
   * Disconnect from IMAP server
   */
  private async disconnectImap(accountId: string): Promise<void> {
    const client = this.imapConnections.get(accountId);
    if (client) {
      await client.logout();
      this.imapConnections.delete(accountId);
    }
  }

  /**
   * Fetch messages from a folder
   */
  async fetchMessages(accountId: string, folder = 'INBOX', limit = 50): Promise<EmailMessage[]> {
    const client = await this.connectImap(accountId);

    // Select folder (mailbox) - handle non-existent folders
    let mailbox;
    try {
      mailbox = await client.mailboxOpen(folder);
    } catch (error) {
      console.error(`Failed to open folder '${folder}':`, error);
      // If folder doesn't exist, return empty array
      if (error instanceof Error && error.message.includes('SELECT failed')) {
        console.log(`Folder '${folder}' does not exist or is not accessible`);
        return [];
      }
      throw error;
    }

    // Fetch recent messages
    const messages: EmailMessage[] = [];

    // Get message count
    if (!mailbox) {
      return [];
    }

    const total = mailbox.exists;

    // If mailbox is empty, return empty array
    if (total === 0) {
      return [];
    }

    const start = Math.max(1, total - limit + 1);

    // Fetch messages in reverse order (newest first)
    for await (const msg of client.fetch(`${start}:*`, {
      envelope: true,
      bodyStructure: true,
      flags: true,
      uid: true,
      internalDate: true,
      size: true,
    })) {
      try {
        const message = this.parseImapMessage(msg, accountId, folder);
        messages.push(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    }

    // Sort by date descending
    messages.sort((a, b) => b.date - a.date);

    return messages;
  }

  /**
   * Fetch a single message with full body content
   */
  async fetchMessage(accountId: string, folder: string, uid: number): Promise<EmailMessage> {
    console.log('EmailService: fetchMessage called', { accountId, folder, uid });

    try {
      const client = await this.connectImap(accountId);
      console.log('EmailService: IMAP client connected');

      // Select folder - handle non-existent folders
      let mailbox;
      try {
        mailbox = await client.mailboxOpen(folder);
        console.log('EmailService: Mailbox opened:', folder);
      } catch (error) {
        console.error(`Failed to open folder '${folder}':`, error);
        if (error instanceof Error && error.message.includes('SELECT failed')) {
          throw new Error(`Folder '${folder}' does not exist or is not accessible`);
        }
        throw error;
      }
      console.log('EmailService: Mailbox info:', {
        exists: mailbox?.exists,
        flags: mailbox?.flags,
        uidNext: mailbox?.uidNext,
        uidValidity: mailbox?.uidValidity,
        total: mailbox?.exists,
      });

      // Fetch message metadata and body structure using UID
      console.log('EmailService: Attempting to fetch message', {
        uid,
        uidNext: mailbox?.uidNext,
        uidValidity: mailbox?.uidValidity,
        exists: mailbox?.exists,
      });

      // Check if UID is within valid range
      if (uid > (mailbox?.uidNext || 0)) {
        throw new Error(`UID ${uid} is beyond the highest UID ${mailbox?.uidNext || 0} in mailbox`);
      }

      const msg = await client.fetchOne(
        uid.toString(),
        {
          envelope: true,
          bodyStructure: true,
          flags: true,
          internalDate: true,
          size: true,
        },
        { uid: true }
      );

      console.log('EmailService: Message fetched:', { uid, hasMessage: !!msg });

      if (!msg) {
        throw new Error('Message not found');
      }

      // Get the parsed message
      const emailMessage = this.parseImapMessage(msg, accountId, folder);
      console.log('EmailService: Parsed message:', {
        id: emailMessage.id,
        subject: emailMessage.subject,
      });

      // Download full message to get body content using UID
      const messageStream = await client.download(uid.toString(), undefined, { uid: true });
      console.log('EmailService: Message stream downloaded:', !!messageStream?.content);

      if (messageStream?.content) {
        try {
          // Parse the raw message content
          const rawContent = await this.streamToString(messageStream.content);
          const parsed = this.parseRawMessage(rawContent);
          console.log('EmailService: Parsed raw message:', {
            hasHtml: !!parsed.html,
            hasText: !!parsed.text,
          });

          emailMessage.htmlBody = parsed.html;
          emailMessage.textBody = parsed.text;

          // Update snippet from text body
          if (parsed.text) {
            emailMessage.snippet = parsed.text.substring(0, 150).trim();
          } else if (parsed.html) {
            // Extract text from HTML for snippet
            const textOnly = parsed.html
              .replace(/<[^>]*>/g, '')
              .substring(0, 150)
              .trim();
            emailMessage.snippet = textOnly;
          }
        } catch (error) {
          console.error('Failed to parse message body:', error);
          // Continue with message without body content
        }
      }

      console.log('EmailService: Returning message:', {
        id: emailMessage.id,
        hasHtmlBody: !!emailMessage.htmlBody,
        hasTextBody: !!emailMessage.textBody,
      });

      return emailMessage;
    } catch (error) {
      console.error('EmailService: fetchMessage failed:', error);
      throw error;
    }
  }

  /**
   * Convert stream to string
   */
  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  /**
   * Decode quoted-printable encoded text
   */
  private decodeQuotedPrintable(text: string): string {
    return text
      .replace(/=([0-9A-F]{2})/gi, (_: string, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16))
      )
      .replace(/=\r?\n/g, ''); // Remove soft line breaks
  }

  /**
   * Parse raw email message to extract HTML and text body
   * Handles nested multipart MIME structures recursively
   */
  private parseRawMessage(rawMessage: string): { html?: string; text?: string } {
    console.log('EmailService: parseRawMessage input length:', rawMessage.length);

    const result: { html?: string; text?: string } = {};
    const cidMap = new Map<string, string>();

    // Recursively parse MIME parts
    this.parseMimePart(rawMessage, result, cidMap);

    // Replace CID references in HTML with data URLs
    if (result.html && cidMap.size > 0) {
      for (const [cid, dataUrl] of cidMap.entries()) {
        result.html = result.html.replace(
          new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
          dataUrl
        );
      }
    }

    console.log('EmailService: Parsed result:', {
      hasHtml: !!result.html,
      hasText: !!result.text,
      htmlLength: result.html?.length ?? 0,
      textLength: result.text?.length ?? 0,
      cidCount: cidMap.size,
    });

    return result;
  }

  /**
   * Recursively parse a MIME part (handles nested multipart)
   */
  private parseMimePart(
    part: string,
    result: { html?: string; text?: string },
    cidMap: Map<string, string>
  ): void {
    // Find header/body separator
    const separatorMatch = part.match(/\r?\n\r?\n/);
    if (!separatorMatch) {
      return;
    }

    const separatorIndex = part.indexOf(separatorMatch[0]);
    const headers = part.substring(0, separatorIndex);
    const body = part.substring(separatorIndex + separatorMatch[0].length);

    // Parse headers into object
    const headerObj: Record<string, string> = {};
    let currentHeader = '';
    let currentValue = '';

    for (const line of headers.split(/\r?\n/)) {
      if (line.match(/^\s/) && currentHeader) {
        // Continuation of previous header
        currentValue += ' ' + line.trim();
      } else if (line.includes(':')) {
        // Save previous header
        if (currentHeader) {
          headerObj[currentHeader.toLowerCase()] = currentValue;
        }
        const colonIndex = line.indexOf(':');
        currentHeader = line.substring(0, colonIndex).trim();
        currentValue = line.substring(colonIndex + 1).trim();
      }
    }
    // Save last header
    if (currentHeader) {
      headerObj[currentHeader.toLowerCase()] = currentValue;
    }

    const contentType = headerObj['content-type'] || '';
    const encoding = (headerObj['content-transfer-encoding'] || '').toLowerCase();
    const contentId = headerObj['content-id']?.replace(/[<>]/g, '');

    // Check if this is a multipart
    if (contentType.toLowerCase().includes('multipart/')) {
      // Extract boundary
      const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/i);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const parts = body.split(
          new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
        );

        for (const subPart of parts) {
          const trimmed = subPart.trim();
          // Skip empty parts and end boundary
          if (!trimmed || trimmed === '--' || trimmed.startsWith('--')) {
            continue;
          }
          // Recursively parse nested parts
          this.parseMimePart(subPart, result, cidMap);
        }
      }
      return;
    }

    // Decode content based on encoding
    let decodedBody = body;
    if (encoding === 'base64') {
      try {
        decodedBody = Buffer.from(body.replace(/\r?\n/g, ''), 'base64').toString('utf-8');
      } catch (e) {
        console.error('Failed to decode base64:', e);
        decodedBody = body;
      }
    } else if (encoding === 'quoted-printable') {
      decodedBody = this.decodeQuotedPrintable(body);
    }

    // Handle different content types
    if (contentType.toLowerCase().includes('text/html') && !result.html) {
      result.html = decodedBody.trim();
    } else if (contentType.toLowerCase().includes('text/plain') && !result.text) {
      result.text = decodedBody.trim();
    } else if (contentType.toLowerCase().startsWith('image/') && contentId) {
      // Inline image with Content-ID
      let imageData = body.replace(/\r?\n/g, '');
      if (encoding !== 'base64') {
        imageData = Buffer.from(imageData).toString('base64');
      }
      const mimeType = contentType.split(';')[0].trim();
      cidMap.set(contentId, `data:${mimeType};base64,${imageData}`);
    }
  }

  /**
   * Parse IMAP message to our EmailMessage format
   */
  private parseImapMessage(
    msg: FetchMessageObject,
    accountId: string,
    folder: string
  ): EmailMessage {
    const envelope = msg.envelope;
    if (!envelope) {
      throw new Error('Message envelope is missing');
    }

    const uid = msg.uid;
    if (uid === undefined) {
      throw new Error('Message UID is missing');
    }

    const messageId = envelope.messageId ?? `${accountId}-${uid}`;
    const inReplyTo = envelope.inReplyTo ?? undefined;
    const references: string[] | undefined = undefined;

    // Parse addresses
    const parseAddress = (
      addr?: Array<{ name?: string; address?: string }>
    ): Array<{ name?: string; address: string }> => {
      if (!addr || addr.length === 0) {
        return [];
      }
      return addr
        .filter((a): a is { name?: string; address: string } => !!a.address)
        .map((a) => ({
          name: a.name,
          address: a.address,
        }));
    };

    const from = parseAddress(envelope.from)[0] ?? { address: 'unknown@unknown.com' };
    const to = parseAddress(envelope.to);
    const cc = parseAddress(envelope.cc);
    const bcc = parseAddress(envelope.bcc);

    // Extract subject and body
    const subject = envelope.subject ?? '(No Subject)';
    const date = msg.internalDate
      ? msg.internalDate instanceof Date
        ? msg.internalDate.getTime()
        : new Date(msg.internalDate).getTime()
      : Date.now();

    // Generate thread ID from message-id or subject
    const threadId = this.generateThreadId(messageId, subject);

    // Parse flags
    const flags = msg.flags ?? [];
    const flagsArray = Array.isArray(flags) ? flags : Array.from(flags);
    const read = flagsArray.includes('\\Seen');
    const starred = flagsArray.includes('\\Flagged');
    const draft = flagsArray.includes('\\Draft');

    // Create snippet (will be populated when body is fetched)
    const snippet = subject.substring(0, 100);

    // Parse attachments from body structure
    const attachments = this.extractAttachments(msg.bodyStructure);

    return {
      id: `${accountId}-${uid}`,
      accountId,
      uid,
      messageId,
      inReplyTo,
      references,
      threadId,
      folder,
      from,
      to,
      cc,
      bcc,
      subject,
      textBody: undefined, // Fetch on demand
      htmlBody: undefined, // Fetch on demand
      snippet,
      date,
      size: msg.size ?? 0,
      read,
      starred,
      draft,
      labels: [],
      attachments,
      flags: Array.from(flags),
    };
  }

  /**
   * Generate thread ID from message-id or subject
   */
  private generateThreadId(messageId: string, subject: string): string {
    // Use message-id as thread base, or fallback to normalized subject
    const normalizedSubject = subject
      .replace(/^(Re|Fwd?):\s*/i, '')
      .trim()
      .toLowerCase();

    return this.encryptionService.hashString(messageId ?? normalizedSubject);
  }

  /**
   * Extract attachments from body structure
   */
  private extractAttachments(_bodyStructure?: unknown): Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
    inline: boolean;
  }> {
    // TODO: Implement body structure parsing for attachments
    return [];
  }

  /**
   * Send email via SMTP
   */
  async sendEmail(input: SendEmailInput): Promise<void> {
    const account = this.accounts.get(input.accountId);
    if (!account) {
      throw new Error(`Account not found: ${input.accountId}`);
    }

    // Get or create SMTP transport
    let transport = this.smtpTransports.get(input.accountId);
    if (!transport) {
      transport = createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: account.smtp.auth,
      });
      this.smtpTransports.set(input.accountId, transport);
    }

    const normalizeAddresses = (
      addresses: Array<{ name?: string; address: string }> | undefined,
      label: 'to' | 'cc' | 'bcc'
    ): Array<{ name: string; address: string }> | undefined => {
      if (!addresses) {
        return undefined;
      }

      return addresses.map((addr, index) => {
        const address = typeof addr.address === 'string' ? addr.address.trim() : '';
        if (!address) {
          throw new Error(`Invalid ${label} address at index ${index}`);
        }

        const trimmedName = typeof addr.name === 'string' ? addr.name.trim() : '';
        const name = trimmedName.length > 0 ? trimmedName : address;

        return {
          name,
          address,
        };
      });
    };

    // Build email
    const mailOptions = {
      from: {
        name: account.displayName ?? account.email,
        address: account.email,
      },
      to: normalizeAddresses(input.to, 'to'),
      cc: normalizeAddresses(input.cc, 'cc'),
      bcc: normalizeAddresses(input.bcc, 'bcc'),
      subject: input.subject,
      text: input.text,
      html: input.html,
      inReplyTo: input.inReplyTo,
      references: input.references,
      attachments: input.attachments?.map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType,
      })),
    };

    // Send email
    await transport.sendMail(mailOptions);

    console.log('Email sent:', input.subject);
  }

  /**
   * Send message (simplified interface for IPC)
   */
  async sendMessage(
    accountId: string,
    message: {
      to: Array<string | { name?: string; address: string }>;
      cc?: Array<string | { name?: string; address: string }>;
      bcc?: Array<string | { name?: string; address: string }>;
      subject: string;
      text?: string;
      html?: string;
      textBody?: string;
      htmlBody?: string;
      attachments?: Array<{
        filename: string;
        content: string;
        contentType: string;
      }>;
      inReplyTo?: string;
      references?: string[];
    }
  ): Promise<void> {
    const flattenAddressEntries = (
      entries: AddressOrGroup[],
      label: 'to' | 'cc' | 'bcc',
      index: number
    ): Array<{ name: string; address: string }> => {
      const results: Array<{ name: string; address: string }> = [];

      for (const entry of entries) {
        if ('address' in entry && typeof entry.address === 'string') {
          const address = entry.address.trim();
          if (!address) {
            continue;
          }
          const name =
            typeof entry.name === 'string' && entry.name.trim().length > 0
              ? entry.name.trim()
              : address;
          results.push({ name, address });
        } else if ('group' in entry && Array.isArray(entry.group)) {
          results.push(...flattenAddressEntries(entry.group, label, index));
        }
      }

      if (results.length === 0) {
        throw new Error(`Invalid ${label} address at index ${index}`);
      }

      return results;
    };

    const parseRecipientList = (
      list: Array<string | { name?: string; address: string }> | undefined,
      label: 'to' | 'cc' | 'bcc'
    ): Array<{ name: string; address: string }> | undefined => {
      if (!list) {
        return undefined;
      }

      const parsed = list.flatMap((raw, index) => {
        if (typeof raw === 'string') {
          const trimmed = raw.trim();
          if (!trimmed) {
            return [];
          }
          const entries = addressparser(trimmed);
          if (!entries.length) {
            throw new Error(`Invalid ${label} address at index ${index}`);
          }
          return flattenAddressEntries(entries, label, index);
        }

        const address = typeof raw.address === 'string' ? raw.address.trim() : '';
        if (!address) {
          throw new Error(`Invalid ${label} address at index ${index}`);
        }

        const name =
          typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : address;

        return [{ name, address }];
      });

      if (!parsed.length) {
        throw new Error(`No valid ${label} addresses provided`);
      }

      return parsed;
    };

    await this.sendEmail({
      accountId,
      to: parseRecipientList(message.to, 'to') ?? [],
      cc: parseRecipientList(message.cc, 'cc'),
      bcc: parseRecipientList(message.bcc, 'bcc'),
      subject: message.subject,
      text: message.text ?? message.textBody,
      html: message.html ?? message.htmlBody,
      attachments: message.attachments,
      inReplyTo: message.inReplyTo,
      references: message.references,
    });
  }

  /**
   * Mark message as read/unread
   */
  async markAsRead(accountId: string, uid: number, read: boolean): Promise<void> {
    const client = await this.connectImap(accountId);

    if (read) {
      await client.messageFlagsAdd({ uid }, ['\\Seen']);
    } else {
      await client.messageFlagsRemove({ uid }, ['\\Seen']);
    }
  }

  /**
   * Mark message as starred/unstarred
   */
  async markAsStarred(accountId: string, uid: number, starred: boolean): Promise<void> {
    const client = await this.connectImap(accountId);

    if (starred) {
      await client.messageFlagsAdd({ uid }, ['\\Flagged']);
    } else {
      await client.messageFlagsRemove({ uid }, ['\\Flagged']);
    }
  }

  /**
   * Move message to another folder
   */
  async moveMessage(
    accountId: string,
    uid: number,
    sourceFolder: string,
    targetFolder: string
  ): Promise<void> {
    const client = await this.connectImap(accountId);

    // Select source folder - handle non-existent folders
    try {
      await client.mailboxOpen(sourceFolder);
    } catch (error) {
      console.error(`Failed to open folder '${sourceFolder}':`, error);
      if (error instanceof Error && error.message.includes('SELECT failed')) {
        throw new Error(`Source folder '${sourceFolder}' does not exist or is not accessible`);
      }
      throw error;
    }

    // Move message
    await client.messageMove({ uid }, targetFolder);
  }

  /**
   * Delete message (move to Trash)
   */
  async deleteMessage(accountId: string, uid: number, folder: string): Promise<void> {
    const client = await this.connectImap(accountId);

    // Select folder - handle non-existent folders
    try {
      await client.mailboxOpen(folder);
    } catch (error) {
      console.error(`Failed to open folder '${folder}':`, error);
      if (error instanceof Error && error.message.includes('SELECT failed')) {
        throw new Error(`Folder '${folder}' does not exist or is not accessible`);
      }
      throw error;
    }

    // Delete message (flags as deleted and expunges)
    await client.messageDelete({ uid }, { uid: true });
  }

  /**
   * Get folder list
   */
  async getFolders(accountId: string): Promise<EmailFolder[]> {
    const client = await this.connectImap(accountId);

    const folders: EmailFolder[] = [];

    // List all folders
    const mailboxes = await client.list();
    for (const mailbox of mailboxes) {
      const folder: EmailFolder = {
        path: mailbox.path,
        name: mailbox.name,
        parent: mailbox.parent ? mailbox.parent.join('/') : undefined,
        type: this.getFolderType(mailbox.specialUse ?? mailbox.path),
        totalMessages: 0,
        unreadMessages: 0,
        selectable: !mailbox.flags?.has('\\Noselect'),
      };

      // Get folder status
      if (folder.selectable) {
        try {
          const status = await client.status(mailbox.path, {
            messages: true,
            unseen: true,
          });
          folder.totalMessages = status.messages ?? 0;
          folder.unreadMessages = status.unseen ?? 0;
        } catch (error) {
          console.error('Failed to get folder status:', error);
        }
      }

      folders.push(folder);
    }

    return folders;
  }

  /**
   * Create a new folder
   */
  async createFolder(accountId: string, folderPath: string): Promise<void> {
    const client = await this.connectImap(accountId);
    await client.mailboxCreate(folderPath);
    console.log('Folder created:', folderPath);
  }

  /**
   * Rename a folder
   */
  async renameFolder(accountId: string, oldPath: string, newPath: string): Promise<void> {
    const client = await this.connectImap(accountId);
    await client.mailboxRename(oldPath, newPath);
    console.log('Folder renamed:', oldPath, '->', newPath);
  }

  /**
   * Delete a folder
   * Optionally move messages to another folder before deletion
   */
  async deleteFolder(
    accountId: string,
    folderPath: string,
    moveMessagesTo?: string
  ): Promise<void> {
    const client = await this.connectImap(accountId);

    // If moveMessagesTo is specified, move all messages first
    if (moveMessagesTo) {
      try {
        await client.mailboxOpen(folderPath);
        const mailbox = client.mailbox;
        if (mailbox && mailbox.exists > 0) {
          // Move all messages
          await client.messageMove({ seq: '1:*' }, moveMessagesTo);
        }
      } catch (error) {
        console.error('Failed to move messages before folder deletion:', error);
        if (error instanceof Error && error.message.includes('SELECT failed')) {
          throw new Error(`Folder '${folderPath}' does not exist or is not accessible`);
        }
        throw error;
      }
    }

    // Delete the folder
    try {
      await client.mailboxDelete(folderPath);
    } catch (error) {
      console.error('Failed to delete folder:', error);
      if (error instanceof Error && error.message.includes('DELETE failed')) {
        throw new Error(
          `Cannot delete folder '${folderPath}'. It may not exist or be a system folder.`
        );
      }
      throw error;
    }
    console.log('Folder deleted:', folderPath);
  }

  /**
   * Determine folder type from special use flag or path
   */
  private getFolderType(flag: string): EmailFolder['type'] {
    const lowerFlag = flag.toLowerCase();

    if (lowerFlag.includes('inbox')) {
      return 'inbox';
    }
    if (lowerFlag.includes('sent')) {
      return 'sent';
    }
    if (lowerFlag.includes('draft')) {
      return 'drafts';
    }
    if (lowerFlag.includes('trash') || lowerFlag.includes('deleted')) {
      return 'trash';
    }
    if (lowerFlag.includes('spam') || lowerFlag.includes('junk')) {
      return 'spam';
    }
    if (lowerFlag.includes('archive')) {
      return 'archive';
    }

    return 'custom';
  }

  /**
   * Cleanup connections on service shutdown
   */
  async close(): Promise<void> {
    // Disconnect all IMAP connections
    for (const [accountId, _client] of this.imapConnections) {
      await this.disconnectImap(accountId);
    }

    // Close SMTP transports
    for (const transport of this.smtpTransports.values()) {
      transport.close();
    }

    this.smtpTransports.clear();

    console.log('EmailService closed');
  }
}
