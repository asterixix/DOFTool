# DOFTool Data Model

This document defines the complete data model for DOFTool, including TypeScript interfaces, Yjs document structure, and schema validation.

---

## Table of Contents

1. [Core Entities](#core-entities)
2. [Family Module](#family-module)
3. [Calendar Module](#calendar-module)
4. [Tasks Module](#tasks-module)
5. [Email Module](#email-module)
6. [Yjs Document Structure](#yjs-document-structure)
7. [Permission System](#permission-system)

---

## Core Entities

### Base Entity

All entities extend from a common base:

```typescript
// src/shared/types/Base.types.ts

export interface BaseEntity {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Last update timestamp (ISO 8601) */
  updatedAt: string;

  /** ID of the user who created this entity */
  createdBy: string;

  /** ID of the user who last modified this entity */
  updatedBy: string;
}

export interface SoftDeletable {
  /** Whether this entity is deleted */
  deleted: boolean;

  /** Deletion timestamp (ISO 8601) */
  deletedAt?: string;

  /** ID of the user who deleted this entity */
  deletedBy?: string;
}

export type WithSoftDelete<T> = T & SoftDeletable;
```

### Timestamps

```typescript
// src/shared/types/Timestamp.types.ts

/** ISO 8601 date string */
export type ISODateString = string;

/** Unix timestamp in milliseconds */
export type UnixTimestamp = number;

export interface TimeRange {
  start: ISODateString;
  end: ISODateString;
}

export interface DateRange {
  /** Date only (YYYY-MM-DD) */
  startDate: string;
  /** Date only (YYYY-MM-DD) */
  endDate: string;
}
```

---

## Family Module

### Family

```typescript
// src/modules/family/types/Family.types.ts

export interface Family extends BaseEntity {
  /** Family display name */
  name: string;

  /** Family description (optional) */
  description?: string;

  /** Family avatar/icon (base64 or URL) */
  avatar?: string;

  /** ID of the device that created the family (admin) */
  adminDeviceId: string;

  /** Family encryption key hash (for verification) */
  encryptionKeyHash: string;

  /** Family creation timezone */
  timezone: string;

  /** Family settings */
  settings: FamilySettings;
}

export interface FamilySettings {
  /** Default calendar view (month/week/day) */
  defaultCalendarView: 'month' | 'week' | 'day';

  /** Week start day (0 = Sunday, 1 = Monday) */
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;

  /** Default task sort order */
  defaultTaskSort: 'dueDate' | 'priority' | 'created';

  /** Enable email notifications for important events */
  emailNotifications: boolean;

  /** Auto-sync interval in minutes (0 = manual only) */
  autoSyncInterval: number;
}
```

### Family Member

```typescript
// src/modules/family/types/FamilyMember.types.ts

export type MemberRole = 'admin' | 'parent' | 'child' | 'guest';

export interface FamilyMember extends BaseEntity {
  /** Reference to family */
  familyId: string;

  /** Display name */
  displayName: string;

  /** Member avatar (base64 or URL) */
  avatar?: string;

  /** Member color (for calendar events, etc.) */
  color: string;

  /** Member role in the family */
  role: MemberRole;

  /** Whether this member is an admin */
  isAdmin: boolean;

  /** Member's public key for E2EE (base64) */
  publicKey: string;

  /** Email address (optional, for notifications) */
  email?: string;

  /** Member status */
  status: 'active' | 'invited' | 'suspended';

  /** Last seen timestamp */
  lastSeenAt?: ISODateString;

  /** Member preferences */
  preferences: MemberPreferences;
}

export interface MemberPreferences {
  /** Preferred language */
  language: string;

  /** Preferred date format */
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

  /** Preferred time format */
  timeFormat: '12h' | '24h';

  /** UI theme preference */
  theme: 'light' | 'dark' | 'system';

  /** Notification preferences */
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  /** Enable desktop notifications */
  desktop: boolean;

  /** Enable sound notifications */
  sound: boolean;

  /** Notify on new events */
  newEvents: boolean;

  /** Notify on event reminders */
  eventReminders: boolean;

  /** Notify on task assignments */
  taskAssignments: boolean;

  /** Notify on new messages */
  newMessages: boolean;
}
```

### Device

```typescript
// src/modules/family/types/Device.types.ts

export type DevicePlatform = 'windows' | 'macos' | 'linux';

export interface Device extends BaseEntity {
  /** Reference to family */
  familyId: string;

  /** Reference to family member */
  memberId: string;

  /** Device name (user-provided or auto-generated) */
  name: string;

  /** Operating system */
  platform: DevicePlatform;

  /** OS version */
  osVersion: string;

  /** App version */
  appVersion: string;

  /** Device public key (base64) */
  publicKey: string;

  /** Whether this device is trusted */
  trusted: boolean;

  /** Device status */
  status: 'active' | 'pending' | 'revoked';

  /** Last sync timestamp */
  lastSyncAt?: ISODateString;

  /** Device-specific settings */
  settings: DeviceSettings;
}

export interface DeviceSettings {
  /** Sync on startup */
  syncOnStartup: boolean;

  /** Background sync enabled */
  backgroundSync: boolean;

  /** Email accounts accessible from this device */
  emailAccessIds: string[];
}
```

### Invitation

```typescript
// src/modules/family/types/Invitation.types.ts

export interface Invitation extends BaseEntity {
  /** Reference to family */
  familyId: string;

  /** Invite token (hashed) */
  tokenHash: string;

  /** Expiration timestamp */
  expiresAt: ISODateString;

  /** Role to assign to new member */
  assignedRole: MemberRole;

  /** Custom message for invitee */
  message?: string;

  /** Whether invitation has been used */
  used: boolean;

  /** ID of member who used the invitation */
  usedBy?: string;

  /** Timestamp when invitation was used */
  usedAt?: ISODateString;

  /** Maximum uses (0 = unlimited) */
  maxUses: number;

  /** Current use count */
  useCount: number;
}

/** Data encoded in QR code / shareable token */
export interface InviteTokenPayload {
  /** Family ID */
  familyId: string;

  /** Temporary encryption key for handshake */
  tempKey: string;

  /** Token for verification */
  token: string;

  /** Expiration timestamp */
  exp: number;

  /** Assigned role */
  role: MemberRole;
}
```

---

## Calendar Module

### Calendar

```typescript
// src/modules/calendar/types/Calendar.types.ts

export interface Calendar extends BaseEntity {
  /** Reference to family */
  familyId: string;

  /** Calendar name */
  name: string;

  /** Calendar description */
  description?: string;

  /** Calendar color (hex) */
  color: string;

  /** Calendar icon (emoji or icon name) */
  icon?: string;

  /** Owner member ID */
  ownerId: string;

  /** Default visibility for new events */
  defaultVisibility: EventVisibility;

  /** Default permission for family members */
  defaultPermission: CalendarPermission;

  /** Per-member permission overrides */
  memberPermissions: Record<string, CalendarPermission>;

  /** Calendar visibility */
  isVisible: boolean;

  /** Sort order in UI */
  sortOrder: number;

  /** External calendar source (if imported) */
  source?: CalendarSource;
}

export type EventVisibility = 'public' | 'private' | 'family';

export type CalendarPermission = 'none' | 'view' | 'edit' | 'admin';

export interface CalendarSource {
  /** Source type */
  type: 'ical' | 'google' | 'outlook' | 'local';

  /** Source URL (for subscribed calendars) */
  url?: string;

  /** Last sync timestamp */
  lastSyncAt?: ISODateString;

  /** Sync interval in minutes */
  syncInterval?: number;
}
```

### Calendar Event

```typescript
// src/modules/calendar/types/Event.types.ts

export interface CalendarEvent extends BaseEntity {
  /** Reference to calendar */
  calendarId: string;

  /** Reference to family */
  familyId: string;

  /** Event title */
  title: string;

  /** Event description (markdown supported) */
  description?: string;

  /** Event location */
  location?: EventLocation;

  /** Start timestamp */
  start: ISODateString;

  /** End timestamp */
  end: ISODateString;

  /** Whether this is an all-day event */
  allDay: boolean;

  /** Event timezone */
  timezone: string;

  /** Event color override (if different from calendar) */
  color?: string;

  /** Event visibility */
  visibility: EventVisibility;

  /** Per-member permission overrides */
  memberPermissions?: Record<string, EventPermission>;

  /** Recurrence rule (RFC 5545 RRULE) */
  recurrence?: RecurrenceRule;

  /** For recurring events: ID of the master event */
  recurringEventId?: string;

  /** For recurring events: original start time of this instance */
  originalStartTime?: ISODateString;

  /** Event reminders */
  reminders: EventReminder[];

  /** Event attendees */
  attendees: EventAttendee[];

  /** Event attachments */
  attachments: EventAttachment[];

  /** Event status */
  status: 'confirmed' | 'tentative' | 'cancelled';

  /** Busy/free status */
  showAs: 'busy' | 'free' | 'tentative' | 'outOfOffice';

  /** External event ID (from iCal import) */
  externalId?: string;

  /** iCal UID for export */
  icalUid: string;
}

export type EventPermission = 'view' | 'edit' | 'admin';

export interface EventLocation {
  /** Location name or address */
  name: string;

  /** Full address */
  address?: string;

  /** Latitude */
  latitude?: number;

  /** Longitude */
  longitude?: number;

  /** Virtual meeting URL */
  url?: string;
}

export interface RecurrenceRule {
  /** Frequency (RFC 5545) */
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';

  /** Interval between occurrences */
  interval: number;

  /** Days of week (for weekly recurrence) */
  byDay?: ('MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU')[];

  /** Days of month (for monthly recurrence) */
  byMonthDay?: number[];

  /** Months (for yearly recurrence) */
  byMonth?: number[];

  /** End after count occurrences */
  count?: number;

  /** End by date */
  until?: ISODateString;

  /** Exception dates */
  exdates?: ISODateString[];
}

export interface EventReminder {
  /** Reminder ID */
  id: string;

  /** Minutes before event */
  minutesBefore: number;

  /** Reminder method */
  method: 'notification' | 'email';
}

export interface EventAttendee {
  /** Attendee ID (member ID or external) */
  id: string;

  /** Attendee type */
  type: 'member' | 'external';

  /** Display name */
  name: string;

  /** Email (for external attendees) */
  email?: string;

  /** Response status */
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction';

  /** Whether this attendee is required */
  optional: boolean;

  /** Whether this attendee is the organizer */
  organizer: boolean;
}

export interface EventAttachment {
  /** Attachment ID */
  id: string;

  /** File name */
  name: string;

  /** MIME type */
  mimeType: string;

  /** File size in bytes */
  size: number;

  /** File content (base64) or URL */
  content: string;
}
```

---

## Tasks Module

### Task List

```typescript
// src/modules/tasks/types/TaskList.types.ts

export interface TaskList extends BaseEntity {
  /** Reference to family */
  familyId: string;

  /** List name */
  name: string;

  /** List description */
  description?: string;

  /** List color (hex) */
  color: string;

  /** List icon (emoji or icon name) */
  icon?: string;

  /** Owner member ID */
  ownerId: string;

  /** Default permission for family members */
  defaultPermission: TaskListPermission;

  /** Per-member permission overrides */
  memberPermissions: Record<string, TaskListPermission>;

  /** Sort order in UI */
  sortOrder: number;

  /** Whether list is archived */
  archived: boolean;

  /** List view mode */
  viewMode: 'list' | 'board' | 'calendar';
}

export type TaskListPermission = 'none' | 'view' | 'edit' | 'admin';
```

### Task

```typescript
// src/modules/tasks/types/Task.types.ts

export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

export interface Task extends BaseEntity {
  /** Reference to task list */
  taskListId: string;

  /** Reference to family */
  familyId: string;

  /** Reference to parent task (for subtasks) */
  parentTaskId?: string;

  /** Task title */
  title: string;

  /** Task description (markdown supported) */
  description?: string;

  /** Task status */
  status: TaskStatus;

  /** Task priority */
  priority: TaskPriority;

  /** Due date */
  dueDate?: ISODateString;

  /** Due time (if not all-day) */
  dueTime?: string;

  /** Start date (for scheduled tasks) */
  startDate?: ISODateString;

  /** Completion date */
  completedAt?: ISODateString;

  /** Completed by member ID */
  completedBy?: string;

  /** Assigned member IDs */
  assignees: string[];

  /** Task labels/tags */
  labels: string[];

  /** Estimated duration in minutes */
  estimatedDuration?: number;

  /** Actual duration in minutes */
  actualDuration?: number;

  /** Task reminders */
  reminders: TaskReminder[];

  /** Task attachments */
  attachments: TaskAttachment[];

  /** Checklist items */
  checklist: ChecklistItem[];

  /** Related calendar event ID */
  linkedEventId?: string;

  /** Sort order within list */
  sortOrder: number;

  /** Board column (for kanban view) */
  boardColumn?: string;

  /** Recurrence rule */
  recurrence?: TaskRecurrence;
}

export interface TaskReminder {
  /** Reminder ID */
  id: string;

  /** Reminder timestamp */
  remindAt: ISODateString;

  /** Whether reminder has been sent */
  sent: boolean;

  /** Member IDs to notify */
  notifyMembers: string[];
}

export interface TaskAttachment {
  /** Attachment ID */
  id: string;

  /** File name */
  name: string;

  /** MIME type */
  mimeType: string;

  /** File size in bytes */
  size: number;

  /** File content (base64) */
  content: string;
}

export interface ChecklistItem {
  /** Item ID */
  id: string;

  /** Item text */
  text: string;

  /** Whether item is completed */
  completed: boolean;

  /** Sort order */
  sortOrder: number;
}

export interface TaskRecurrence {
  /** Recurrence frequency */
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';

  /** Interval between occurrences */
  interval: number;

  /** Days of week */
  daysOfWeek?: number[];

  /** End after count */
  count?: number;

  /** End by date */
  until?: ISODateString;
}

/** For JSON export/import */
export interface TaskExportFormat {
  version: '1.0';
  exportedAt: ISODateString;
  exportedBy: string;
  taskLists: TaskList[];
  tasks: Task[];
}
```

---

## Email Module

### Email Account

```typescript
// src/modules/email/types/EmailAccount.types.ts

export interface EmailAccount extends BaseEntity {
  /** Reference to family */
  familyId: string;

  /** Account owner member ID */
  ownerId: string;

  /** Email address */
  email: string;

  /** Display name for outgoing emails */
  displayName: string;

  /** Account type */
  type: 'imap' | 'internal';

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
  lastSyncAt?: ISODateString;

  /** Sync interval in minutes */
  syncInterval: number;

  /** Account signature */
  signature?: string;
}

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
}

export type EmailAccessLevel = 'read' | 'read_write' | 'send_as' | 'full';
```

### Email Message

```typescript
// src/modules/email/types/EmailMessage.types.ts

export interface EmailMessage extends BaseEntity {
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
  date: ISODateString;

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
}

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

export interface EmailFolder {
  /** Folder path */
  path: string;

  /** Display name */
  name: string;

  /** Parent folder path */
  parent?: string;

  /** Folder type */
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'custom';

  /** Total message count */
  totalMessages: number;

  /** Unread message count */
  unreadMessages: number;

  /** Is folder selectable */
  selectable: boolean;
}
```

### Internal Message (Family Chat)

```typescript
// src/modules/email/types/InternalMessage.types.ts

export interface Conversation extends BaseEntity {
  /** Reference to family */
  familyId: string;

  /** Conversation title (for group chats) */
  title?: string;

  /** Participant member IDs */
  participants: string[];

  /** Conversation type */
  type: 'direct' | 'group';

  /** Last message preview */
  lastMessage?: {
    text: string;
    senderId: string;
    sentAt: ISODateString;
  };

  /** Per-member read status */
  readStatus: Record<string, ISODateString>;
}

export interface InternalMessage extends BaseEntity {
  /** Reference to conversation */
  conversationId: string;

  /** Reference to family */
  familyId: string;

  /** Sender member ID */
  senderId: string;

  /** Message content (markdown supported) */
  content: string;

  /** Message type */
  type: 'text' | 'image' | 'file' | 'system';

  /** Attachments */
  attachments?: MessageAttachment[];

  /** Reply to message ID */
  replyToId?: string;

  /** Whether message has been edited */
  edited: boolean;

  /** Edit timestamp */
  editedAt?: ISODateString;

  /** Reactions */
  reactions: Record<string, string[]>; // emoji -> memberIds

  /** Read by member IDs */
  readBy: string[];
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
```

---

## Yjs Document Structure

The entire family data is stored in Yjs documents for CRDT sync:

```typescript
// src/shared/lib/yjs/documentStructure.ts

import * as Y from 'yjs';

export interface YjsDocumentStructure {
  // Family core data
  family: Y.Map<Family>;
  members: Y.Map<FamilyMember>;
  devices: Y.Map<Device>;
  invitations: Y.Map<Invitation>;

  // Calendar data
  calendars: Y.Map<Calendar>;
  events: Y.Map<CalendarEvent>;

  // Tasks data
  taskLists: Y.Map<TaskList>;
  tasks: Y.Map<Task>;

  // Email/messaging data
  emailAccounts: Y.Map<EmailAccount>;
  conversations: Y.Map<Conversation>;
  internalMessages: Y.Array<InternalMessage>;

  // Permissions
  permissions: Y.Map<Permission>;
}

export function initializeYjsDocument(ydoc: Y.Doc): YjsDocumentStructure {
  return {
    family: ydoc.getMap('family'),
    members: ydoc.getMap('members'),
    devices: ydoc.getMap('devices'),
    invitations: ydoc.getMap('invitations'),
    calendars: ydoc.getMap('calendars'),
    events: ydoc.getMap('events'),
    taskLists: ydoc.getMap('taskLists'),
    tasks: ydoc.getMap('tasks'),
    emailAccounts: ydoc.getMap('emailAccounts'),
    conversations: ydoc.getMap('conversations'),
    internalMessages: ydoc.getArray('internalMessages'),
    permissions: ydoc.getMap('permissions'),
  };
}
```

---

## Permission System

### Permission Types

```typescript
// src/shared/types/Permission.types.ts

export type ResourceType =
  | 'family'
  | 'calendar'
  | 'event'
  | 'taskList'
  | 'task'
  | 'emailAccount'
  | 'conversation';

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'share' | 'manage';

export interface Permission {
  /** Permission ID */
  id: string;

  /** Resource type */
  resourceType: ResourceType;

  /** Resource ID (or '*' for all) */
  resourceId: string;

  /** Member ID this permission applies to */
  memberId: string;

  /** Allowed actions */
  actions: Action[];

  /** Permission source */
  source: 'role' | 'explicit' | 'inherited';

  /** Granted by member ID */
  grantedBy: string;

  /** Grant timestamp */
  grantedAt: ISODateString;

  /** Expiration (optional) */
  expiresAt?: ISODateString;
}

/** Role-based default permissions */
export const ROLE_PERMISSIONS: Record<MemberRole, Partial<Record<ResourceType, Action[]>>> = {
  admin: {
    family: ['view', 'edit', 'manage'],
    calendar: ['view', 'create', 'edit', 'delete', 'share', 'manage'],
    event: ['view', 'create', 'edit', 'delete', 'share'],
    taskList: ['view', 'create', 'edit', 'delete', 'share', 'manage'],
    task: ['view', 'create', 'edit', 'delete', 'share'],
    emailAccount: ['view', 'create', 'edit', 'delete', 'share', 'manage'],
    conversation: ['view', 'create', 'edit', 'delete'],
  },
  parent: {
    family: ['view'],
    calendar: ['view', 'create', 'edit', 'delete', 'share'],
    event: ['view', 'create', 'edit', 'delete'],
    taskList: ['view', 'create', 'edit', 'delete', 'share'],
    task: ['view', 'create', 'edit', 'delete'],
    emailAccount: ['view', 'create', 'edit'],
    conversation: ['view', 'create', 'edit'],
  },
  child: {
    family: ['view'],
    calendar: ['view'],
    event: ['view', 'create'],
    taskList: ['view'],
    task: ['view', 'create', 'edit'],
    emailAccount: ['view'],
    conversation: ['view', 'create'],
  },
  guest: {
    family: ['view'],
    calendar: ['view'],
    event: ['view'],
    taskList: ['view'],
    task: ['view'],
    emailAccount: [],
    conversation: ['view'],
  },
};
```

### Permission Check Utility

```typescript
// src/shared/lib/permissions/checkPermission.ts

export function checkPermission(
  memberId: string,
  memberRole: MemberRole,
  resourceType: ResourceType,
  resourceId: string,
  action: Action,
  explicitPermissions: Permission[]
): boolean {
  // Check explicit permissions first
  const explicit = explicitPermissions.find(
    (p) =>
      p.memberId === memberId &&
      p.resourceType === resourceType &&
      (p.resourceId === resourceId || p.resourceId === '*') &&
      p.actions.includes(action) &&
      (!p.expiresAt || new Date(p.expiresAt) > new Date())
  );

  if (explicit) return true;

  // Fall back to role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[memberRole]?.[resourceType] ?? [];
  return rolePermissions.includes(action);
}
```

---

## Schema Validation (Zod)

```typescript
// src/shared/lib/validation/schemas.ts

import { z } from 'zod';

export const calendarEventSchema = z
  .object({
    id: z.string().uuid(),
    calendarId: z.string().uuid(),
    familyId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().max(10000).optional(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    allDay: z.boolean(),
    timezone: z.string(),
    visibility: z.enum(['public', 'private', 'family']),
    status: z.enum(['confirmed', 'tentative', 'cancelled']),
    reminders: z.array(
      z.object({
        id: z.string(),
        minutesBefore: z.number().min(0).max(40320), // Max 4 weeks
        method: z.enum(['notification', 'email']),
      })
    ),
    // ... more fields
  })
  .refine((data) => new Date(data.end) >= new Date(data.start), {
    message: 'End date must be after start date',
  });

export const taskSchema = z.object({
  id: z.string().uuid(),
  taskListId: z.string().uuid(),
  familyId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'cancelled']),
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']),
  dueDate: z.string().datetime().optional(),
  assignees: z.array(z.string().uuid()),
  labels: z.array(z.string().max(50)),
  // ... more fields
});

export type ValidatedCalendarEvent = z.infer<typeof calendarEventSchema>;
export type ValidatedTask = z.infer<typeof taskSchema>;
```
