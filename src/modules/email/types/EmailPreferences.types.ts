/**
 * Email Preferences Types
 * User-configurable display and behavior preferences for the email module
 */

// ============================================================================
// Display Preferences
// ============================================================================

export type MessageListDensity = 'compact' | 'comfortable' | 'spacious';
export type PreviewPanePosition = 'right' | 'bottom' | 'hidden';
export type DateFormat = 'relative' | 'absolute' | 'short';
export type ThreadDisplayMode = 'conversation' | 'individual';

export interface DisplayPreferences {
  /** Message list item density */
  density: MessageListDensity;
  /** Preview pane position */
  previewPane: PreviewPanePosition;
  /** Date/time format */
  dateFormat: DateFormat;
  /** Show thread conversations or individual messages */
  threadMode: ThreadDisplayMode;
  /** Show message preview snippets */
  showSnippets: boolean;
  /** Number of snippet lines to show */
  snippetLines: 1 | 2 | 3;
  /** Show sender avatars */
  showAvatars: boolean;
  /** Show attachment indicators */
  showAttachmentIndicators: boolean;
  /** Enable keyboard shortcuts */
  keyboardShortcuts: boolean;
}

// ============================================================================
// Compose Preferences
// ============================================================================

export type ComposeWindowMode = 'dialog' | 'fullscreen' | 'inline';
export type DefaultReplyBehavior = 'reply' | 'reply_all';
export type SignaturePosition = 'before_quote' | 'after_quote';

export interface ComposePreferences {
  /** Default compose window mode */
  windowMode: ComposeWindowMode;
  /** Default reply behavior */
  defaultReply: DefaultReplyBehavior;
  /** Include original message in replies */
  includeOriginal: boolean;
  /** Signature position in replies */
  signaturePosition: SignaturePosition;
  /** Enable rich text editor */
  richTextEditor: boolean;
  /** Auto-save drafts interval in seconds (0 = disabled) */
  autoSaveInterval: number;
  /** Confirm before sending */
  confirmBeforeSend: boolean;
  /** Undo send delay in seconds (0 = disabled) */
  undoSendDelay: number;
}

// ============================================================================
// Security Preferences
// ============================================================================

export type ExternalContentPolicy = 'block' | 'ask' | 'allow';
export type LinkBehavior = 'preview' | 'open' | 'copy';

export interface SecurityPreferences {
  /** External images policy */
  externalImages: ExternalContentPolicy;
  /** External links behavior */
  linkBehavior: LinkBehavior;
  /** Block tracking pixels */
  blockTrackingPixels: boolean;
  /** Show phishing warnings */
  showPhishingWarnings: boolean;
  /** Mark external sender warnings */
  externalSenderWarnings: boolean;
}

// ============================================================================
// Notification Preferences
// ============================================================================

export interface NotificationPreferences {
  /** Enable desktop notifications */
  desktopNotifications: boolean;
  /** Play sound on new message */
  soundEnabled: boolean;
  /** Notification sound */
  notificationSound: 'default' | 'chime' | 'bell' | 'none';
  /** Show notification content preview */
  showPreview: boolean;
  /** Only notify for important messages */
  importantOnly: boolean;
}

// ============================================================================
// Combined Email Preferences
// ============================================================================

export interface EmailPreferences {
  /** Display preferences */
  display: DisplayPreferences;
  /** Compose preferences */
  compose: ComposePreferences;
  /** Security preferences */
  security: SecurityPreferences;
  /** Notification preferences */
  notifications: NotificationPreferences;
  /** Last updated timestamp */
  updatedAt: number;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  density: 'comfortable',
  previewPane: 'right',
  dateFormat: 'relative',
  threadMode: 'conversation',
  showSnippets: true,
  snippetLines: 2,
  showAvatars: true,
  showAttachmentIndicators: true,
  keyboardShortcuts: true,
};

export const DEFAULT_COMPOSE_PREFERENCES: ComposePreferences = {
  windowMode: 'dialog',
  defaultReply: 'reply',
  includeOriginal: true,
  signaturePosition: 'before_quote',
  richTextEditor: true,
  autoSaveInterval: 30,
  confirmBeforeSend: false,
  undoSendDelay: 5,
};

export const DEFAULT_SECURITY_PREFERENCES: SecurityPreferences = {
  externalImages: 'block',
  linkBehavior: 'preview',
  blockTrackingPixels: true,
  showPhishingWarnings: true,
  externalSenderWarnings: true,
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  desktopNotifications: true,
  soundEnabled: true,
  notificationSound: 'default',
  showPreview: true,
  importantOnly: false,
};

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  display: DEFAULT_DISPLAY_PREFERENCES,
  compose: DEFAULT_COMPOSE_PREFERENCES,
  security: DEFAULT_SECURITY_PREFERENCES,
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  updatedAt: Date.now(),
};
