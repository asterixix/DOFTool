/**
 * Email Module Types
 * Based on docs/DATA-MODEL.md
 */

// ============================================================================
// Email Account Types
// ============================================================================

export type EmailAccountType = 'imap' | 'internal';
export type EmailAccessLevel = 'read' | 'read_write' | 'send_as' | 'full';

export interface ImapConfig {
  /** IMAP server hostname */
  host: string;
  /** IMAP server port */
  port: number;
  /** Use TLS */
  tls: boolean;
  /** Username */
  username: string;
  /** Password (encrypted) */
  password: string;
}

export interface SmtpConfig {
  /** SMTP server hostname */
  host: string;
  /** SMTP server port */
  port: number;
  /** Use TLS */
  tls: boolean;
  /** Username */
  username: string;
  /** Password (encrypted) */
  password: string;
}

export interface SharedEmailAccess {
  /** Member ID */
  memberId: string;
  /** Access level */
  access: EmailAccessLevel;
  /** Folders this member can access (empty = all) */
  folders?: string[];
  /** When access was granted */
  sharedAt: number;
  /** Who shared access */
  sharedBy: string;
}

export interface EmailAccount {
  /** Account ID */
  id: string;
  /** Reference to family */
  familyId: string;
  /** Account owner member ID */
  ownerId: string;
  /** Email address */
  email: string;
  /** Display name for outgoing emails */
  displayName: string;
  /** Account type */
  type: EmailAccountType;
  /** IMAP configuration (encrypted) */
  imapConfig?: ImapConfig;
  /** SMTP configuration (encrypted) */
  smtpConfig?: SmtpConfig;
  /** Members who have access to this account */
  sharedWithMembers: SharedEmailAccess[];
  /** Devices that can access this account */
  allowedDeviceIds: string[];
  /** Account status */
  status: 'active' | 'error' | 'disabled';
  /** Last error message */
  lastError?: string;
  /** Last successful sync */
  lastSyncAt?: number;
  /** Sync interval in minutes */
  syncInterval: number;
  /** Account signature */
  signature?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

// ============================================================================
// Email Message Types
// ============================================================================

export interface EmailAddress {
  /** Display name */
  name?: string;
  /** Email address */
  address: string;
}

export interface EmailAttachment {
  /** Attachment ID */
  id: string;
  /** File name */
  filename: string;
  /** MIME type */
  contentType: string;
  /** File size in bytes */
  size: number;
  /** Content ID (for inline attachments) */
  contentId?: string;
  /** Whether attachment is inline */
  inline: boolean;
  /** Content (base64, loaded on demand) */
  content?: string;
}

export interface EmailMessage {
  /** Message ID */
  id: string;
  /** Reference to email account */
  accountId: string;
  /** Reference to family */
  familyId: string;
  /** Message UID from IMAP server */
  uid: number;
  /** Message ID header */
  messageId: string;
  /** In-Reply-To header */
  inReplyTo?: string;
  /** References header */
  references?: string[];
  /** Thread ID (for conversation grouping) */
  threadId: string;
  /** Folder path */
  folder: string;
  /** From address */
  from: EmailAddress;
  /** To addresses */
  to: EmailAddress[];
  /** CC addresses */
  cc?: EmailAddress[];
  /** BCC addresses */
  bcc?: EmailAddress[];
  /** Reply-To address */
  replyTo?: EmailAddress;
  /** Subject */
  subject: string;
  /** Plain text body */
  textBody?: string;
  /** HTML body */
  htmlBody?: string;
  /** Snippet (preview) */
  snippet: string;
  /** Date sent/received */
  date: number;
  /** Message size in bytes */
  size: number;
  /** Whether message has been read */
  read: boolean;
  /** Whether message is starred/flagged */
  starred: boolean;
  /** Whether message is a draft */
  draft: boolean;
  /** Message labels */
  labels: string[];
  /** Attachments */
  attachments: EmailAttachment[];
  /** Message flags from IMAP */
  flags: string[];
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

// ============================================================================
// Email Folder Types
// ============================================================================

export type EmailFolderType = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'custom';

export interface EmailFolder {
  /** Folder ID */
  id: string;
  /** Reference to email account */
  accountId: string;
  /** Folder path */
  path: string;
  /** Display name */
  name: string;
  /** Parent folder path */
  parent?: string;
  /** Folder type */
  type: EmailFolderType;
  /** Total message count */
  totalMessages: number;
  /** Unread message count */
  unreadMessages: number;
  /** Is folder selectable */
  selectable: boolean;
}

// ============================================================================
// Email Label Types
// ============================================================================

export interface EmailLabel {
  /** Label ID */
  id: string;
  /** Reference to email account (null = global label) */
  accountId: string | null;
  /** Reference to family */
  familyId: string;
  /** Label name */
  name: string;
  /** Label color (hex) */
  color: string;
  /** Label icon (optional) */
  icon?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

// ============================================================================
// Internal Messaging Types
// ============================================================================

export type ConversationType = 'direct' | 'group';
export type MessageType = 'text' | 'image' | 'file' | 'system';

export interface Conversation {
  /** Conversation ID */
  id: string;
  /** Reference to family */
  familyId: string;
  /** Conversation title (for group chats) */
  title?: string;
  /** Participant member IDs */
  participants: string[];
  /** Conversation type */
  type: ConversationType;
  /** Last message preview */
  lastMessage?: {
    text: string;
    senderId: string;
    sentAt: number;
  };
  /** Per-member read status */
  readStatus: Record<string, number>;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

export interface MessageAttachment {
  /** Attachment ID */
  id: string;
  /** File name */
  name: string;
  /** MIME type */
  mimeType: string;
  /** File size */
  size: number;
  /** Thumbnail (for images) */
  thumbnail?: string;
  /** Content (base64) */
  content: string;
}

export interface InternalMessage {
  /** Message ID */
  id: string;
  /** Reference to conversation */
  conversationId: string;
  /** Reference to family */
  familyId: string;
  /** Sender member ID */
  senderId: string;
  /** Message content (markdown supported) */
  content: string;
  /** Message type */
  type: MessageType;
  /** Attachments */
  attachments?: MessageAttachment[];
  /** Reply to message ID */
  replyToId?: string;
  /** Whether message has been edited */
  edited: boolean;
  /** Edit timestamp */
  editedAt?: number;
  /** Reactions */
  reactions: Record<string, string[]>; // emoji -> memberIds
  /** Read by member IDs */
  readBy: string[];
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

// ============================================================================
// Thread Types
// ============================================================================

export interface ThreadInfo {
  /** Thread ID */
  threadId: string;
  /** Messages in thread */
  messages: EmailMessage[];
  /** Subject (may differ from individual messages) */
  subject: string;
  /** Participants */
  participants: EmailAddress[];
  /** Latest message date */
  latestDate: number;
  /** Unread count */
  unreadCount: number;
  /** Has attachments */
  hasAttachments: boolean;
  /** Is starred */
  starred: boolean;
  /** Labels */
  labels: string[];
}

// ============================================================================
// UI State Types
// ============================================================================

export type EmailView = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'folder';
export type MessageListView = 'thread' | 'individual';
export type ComposerMode = 'new' | 'reply' | 'forward' | 'draft';

export interface EmailFilter {
  /** Filter by read/unread */
  read?: boolean;
  /** Filter by starred */
  starred?: boolean;
  /** Filter by has attachments */
  hasAttachments?: boolean;
  /** Filter by labels */
  labels?: string[];
  /** Filter by sender */
  from?: string;
  /** Date range */
  dateRange?: {
    start: number;
    end: number;
  };
}

export interface EmailSort {
  field: 'date' | 'sender' | 'subject' | 'size';
  order: 'asc' | 'desc';
}

// ============================================================================
// Input Types for Operations
// ============================================================================

export interface CreateAccountInput {
  email: string;
  displayName: string;
  type: EmailAccountType;
  imapConfig?: ImapConfig;
  smtpConfig?: SmtpConfig;
  syncInterval?: number;
  signature?: string;
}

export interface UpdateAccountInput {
  id: string;
  displayName?: string;
  imapConfig?: ImapConfig;
  smtpConfig?: SmtpConfig;
  syncInterval?: number;
  signature?: string;
  status?: EmailAccount['status'];
}

export interface SendEmailInput {
  accountId: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  attachments?: {
    filename: string;
    content: string; // base64
    contentType: string;
  }[];
  inReplyTo?: string;
  references?: string[];
}

export interface CreateConversationInput {
  participants: string[];
  title?: string;
  type: ConversationType;
}

export interface SendInternalMessageInput {
  conversationId: string;
  content: string;
  type?: MessageType;
  attachments?: MessageAttachment[];
  replyToId?: string;
}

/**
 * Email thread for conversation view
 */
export interface EmailThread {
  /** Thread ID (root message ID) */
  id: string;

  /** Thread subject (normalized) */
  subject: string;

  /** Message IDs in this thread */
  messageIds: string[];

  /** All messages in thread */
  messages: EmailMessage[];

  /** Thread metadata */
  messageCount: number;
  unreadCount: number;
  participantCount: number;
  hasAttachments: boolean;
  isStarred: boolean;
  latestDate: number;
  snippet: string;
}

/**
 * Thread node for hierarchical tree structure
 */
export interface ThreadNode {
  /** The message at this node */
  message: EmailMessage;

  /** Child nodes (replies) */
  children: ThreadNode[];

  /** Depth in thread (0 = root) */
  depth: number;
}
