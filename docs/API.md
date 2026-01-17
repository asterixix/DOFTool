# DOFTool API Reference

This document provides a comprehensive reference for DOFTool's IPC (Inter-Process Communication) channels and service APIs.

---

## Table of Contents

1. [IPC Architecture](#ipc-architecture)
2. [Family API](#family-api)
3. [Calendar API](#calendar-api)
4. [Tasks API](#tasks-api)
5. [Email API](#email-api)
6. [Sync API](#sync-api)
7. [Settings API](#settings-api)
8. [Notification API](#notification-api)

---

## IPC Architecture

DOFTool uses Electron's IPC for communication between the renderer (React) and main (Node.js) processes.

### Communication Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  Renderer Process (React)                                    │
│  ─────────────────────────                                  │
│  window.electronAPI.family.create(...)                      │
│         │                                                   │
│         │ ipcRenderer.invoke('family:create', args)         │
│         ▼                                                   │
├─────────────────────────────────────────────────────────────┤
│  Preload Script (Bridge)                                    │
│  ────────────────────────                                   │
│  Exposes safe API to renderer                               │
│         │                                                   │
│         ▼                                                   │
├─────────────────────────────────────────────────────────────┤
│  Main Process (Node.js)                                     │
│  ──────────────────────                                     │
│  ipcMain.handle('family:create', handler)                   │
└─────────────────────────────────────────────────────────────┘
```

### Preload API Structure

```typescript
// Available in renderer as window.electronAPI
interface ElectronAPI {
  family: FamilyAPI;
  calendar: CalendarAPI;
  tasks: TasksAPI;
  email: EmailAPI;
  sync: SyncAPI;
  settings: SettingsAPI;
  notifications: NotificationAPI;
}
```

---

## Family API

### `family:create`

Creates a new family.

**Channel:** `family:create`

**Parameters:**

```typescript
interface CreateFamilyParams {
  name: string; // Family display name
  displayName: string; // Admin's display name
  passphrase: string; // Encryption passphrase
}
```

**Returns:**

```typescript
interface CreateFamilyResult {
  familyId: string;
  memberId: string;
  deviceId: string;
}
```

**Example:**

```typescript
const result = await window.electronAPI.family.create({
  name: 'The Smiths',
  displayName: 'John',
  passphrase: 'my-secure-passphrase',
});
```

---

### `family:join`

Joins an existing family using an invite token.

**Channel:** `family:join`

**Parameters:**

```typescript
interface JoinFamilyParams {
  inviteToken: string; // Base64-encoded invite token
  displayName: string; // Member's display name
  deviceName: string; // Device name
}
```

**Returns:**

```typescript
interface JoinFamilyResult {
  familyId: string;
  memberId: string;
  deviceId: string;
  role: MemberRole;
}
```

---

### `family:invite:generate`

Generates an invite token for new members.

**Channel:** `family:invite:generate`

**Parameters:**

```typescript
interface GenerateInviteParams {
  role: 'parent' | 'child' | 'guest';
  expiresInHours?: number; // Default: 24
  maxUses?: number; // Default: 1
  message?: string; // Optional welcome message
}
```

**Returns:**

```typescript
interface InviteResult {
  token: string; // Base64-encoded token
  qrCode: string; // Data URL for QR code image
  expiresAt: string; // ISO 8601 timestamp
}
```

---

### `family:member:list`

Lists all family members.

**Channel:** `family:member:list`

**Returns:**

```typescript
interface FamilyMember[] {
  id: string;
  displayName: string;
  role: MemberRole;
  status: 'active' | 'invited' | 'suspended';
  avatar?: string;
  lastSeenAt?: string;
}
```

---

### `family:member:update`

Updates a family member's details.

**Channel:** `family:member:update`

**Parameters:**

```typescript
interface UpdateMemberParams {
  memberId: string;
  updates: {
    displayName?: string;
    role?: MemberRole;
    status?: 'active' | 'suspended';
    avatar?: string;
  };
}
```

---

### `family:member:remove`

Removes a member from the family.

**Channel:** `family:member:remove`

**Parameters:**

```typescript
interface RemoveMemberParams {
  memberId: string;
}
```

---

### `family:device:list`

Lists all registered devices.

**Channel:** `family:device:list`

**Returns:**

```typescript
interface Device[] {
  id: string;
  name: string;
  memberId: string;
  platform: 'windows' | 'macos' | 'linux';
  lastSyncAt?: string;
  status: 'active' | 'revoked';
}
```

---

### `family:device:revoke`

Revokes a device's access.

**Channel:** `family:device:revoke`

**Parameters:**

```typescript
interface RevokeDeviceParams {
  deviceId: string;
}
```

---

## Calendar API

### `calendar:list`

Lists all calendars.

**Channel:** `calendar:list`

**Returns:**

```typescript
interface Calendar[] {
  id: string;
  name: string;
  color: string;
  ownerId: string;
  isVisible: boolean;
  permission: CalendarPermission;
}
```

---

### `calendar:create`

Creates a new calendar.

**Channel:** `calendar:create`

**Parameters:**

```typescript
interface CreateCalendarParams {
  name: string;
  color: string;
  description?: string;
  defaultVisibility?: 'public' | 'private' | 'family';
}
```

**Returns:**

```typescript
interface Calendar {
  id: string;
  name: string;
  // ... full calendar object
}
```

---

### `calendar:update`

Updates a calendar.

**Channel:** `calendar:update`

**Parameters:**

```typescript
interface UpdateCalendarParams {
  calendarId: string;
  updates: Partial<Calendar>;
}
```

---

### `calendar:delete`

Deletes a calendar.

**Channel:** `calendar:delete`

**Parameters:**

```typescript
interface DeleteCalendarParams {
  calendarId: string;
}
```

---

### `calendar:event:list`

Lists events for a date range.

**Channel:** `calendar:event:list`

**Parameters:**

```typescript
interface ListEventsParams {
  calendarIds?: string[]; // Filter by calendars (omit for all)
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
}
```

**Returns:**

```typescript
interface CalendarEvent[] {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarId: string;
  // ... full event object
}
```

---

### `calendar:event:create`

Creates a new event.

**Channel:** `calendar:event:create`

**Parameters:**

```typescript
interface CreateEventParams {
  calendarId: string;
  event: {
    title: string;
    start: string;
    end: string;
    allDay?: boolean;
    description?: string;
    location?: EventLocation;
    recurrence?: RecurrenceRule;
    reminders?: EventReminder[];
  };
}
```

---

### `calendar:event:update`

Updates an event.

**Channel:** `calendar:event:update`

**Parameters:**

```typescript
interface UpdateEventParams {
  eventId: string;
  updates: Partial<CalendarEvent>;
  updateMode?: 'single' | 'future' | 'all'; // For recurring events
}
```

---

### `calendar:event:delete`

Deletes an event.

**Channel:** `calendar:event:delete`

**Parameters:**

```typescript
interface DeleteEventParams {
  eventId: string;
  deleteMode?: 'single' | 'future' | 'all'; // For recurring events
}
```

---

### `calendar:import`

Imports events from an iCal file.

**Channel:** `calendar:import`

**Parameters:**

```typescript
interface ImportCalendarParams {
  filePath: string;
  targetCalendarId?: string; // Create new if omitted
}
```

**Returns:**

```typescript
interface ImportResult {
  eventsImported: number;
  calendarId: string;
  errors: string[];
}
```

---

### `calendar:export`

Exports a calendar to iCal format.

**Channel:** `calendar:export`

**Parameters:**

```typescript
interface ExportCalendarParams {
  calendarId: string;
  filePath: string;
}
```

---

## Tasks API

### `tasks:list:list`

Lists all task lists.

**Channel:** `tasks:list:list`

**Returns:**

```typescript
interface TaskList[] {
  id: string;
  name: string;
  color: string;
  ownerId: string;
  taskCount: number;
  completedCount: number;
}
```

---

### `tasks:list:create`

Creates a new task list.

**Channel:** `tasks:list:create`

**Parameters:**

```typescript
interface CreateTaskListParams {
  name: string;
  color: string;
  description?: string;
}
```

---

### `tasks:task:list`

Lists tasks in a list.

**Channel:** `tasks:task:list`

**Parameters:**

```typescript
interface ListTasksParams {
  taskListId?: string; // Filter by list
  status?: TaskStatus[]; // Filter by status
  assigneeId?: string; // Filter by assignee
  dueBefore?: string; // Filter by due date
  includeCompleted?: boolean; // Default: false
}
```

---

### `tasks:task:create`

Creates a new task.

**Channel:** `tasks:task:create`

**Parameters:**

```typescript
interface CreateTaskParams {
  taskListId: string;
  task: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    assignees?: string[];
    labels?: string[];
    checklist?: ChecklistItem[];
  };
}
```

---

### `tasks:task:update`

Updates a task.

**Channel:** `tasks:task:update`

**Parameters:**

```typescript
interface UpdateTaskParams {
  taskId: string;
  updates: Partial<Task>;
}
```

---

### `tasks:task:complete`

Marks a task as complete.

**Channel:** `tasks:task:complete`

**Parameters:**

```typescript
interface CompleteTaskParams {
  taskId: string;
}
```

---

### `tasks:task:delete`

Deletes a task.

**Channel:** `tasks:task:delete`

**Parameters:**

```typescript
interface DeleteTaskParams {
  taskId: string;
}
```

---

## Email API

> ⚠️ **Note**: The Email module is currently being rebuilt. These APIs may change.

### `email:account:list`

Lists configured email accounts.

**Channel:** `email:account:list`

---

### `email:account:add`

Adds a new email account.

**Channel:** `email:account:add`

**Parameters:**

```typescript
interface AddEmailAccountParams {
  email: string;
  displayName: string;
  imapConfig: ImapConfig;
  smtpConfig: SmtpConfig;
}
```

---

### `email:fetchMessages`

Fetches messages from a folder.

**Channel:** `email:fetchMessages`

**Parameters:**

```typescript
interface FetchMessagesParams {
  accountId: string;
  folder: string;
  limit?: number;
  offset?: number;
}
```

---

### `email:sendMessage`

Sends an email.

**Channel:** `email:sendMessage`

**Parameters:**

```typescript
interface SendMessageParams {
  accountId: string;
  message: {
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    subject: string;
    body: string;
    attachments?: Attachment[];
  };
}
```

---

## Sync API

### `sync:status`

Gets current sync status.

**Channel:** `sync:status`

**Returns:**

```typescript
interface SyncStatus {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncAt?: string;
  connectedPeers: number;
  error?: string;
}
```

---

### `sync:force`

Forces an immediate sync.

**Channel:** `sync:force`

---

### `sync:peers`

Lists connected peers.

**Channel:** `sync:peers`

**Returns:**

```typescript
interface Peer[] {
  deviceId: string;
  deviceName: string;
  memberId: string;
  memberName: string;
  connectedAt: string;
  latency?: number;
}
```

---

### Sync Events (Renderer → Main)

Listen for sync events in the renderer:

```typescript
window.electronAPI.sync.onStatusChange((status: SyncStatus) => {
  console.log('Sync status changed:', status);
});

window.electronAPI.sync.onPeerConnected((peer: Peer) => {
  console.log('Peer connected:', peer);
});

window.electronAPI.sync.onPeerDisconnected((peerId: string) => {
  console.log('Peer disconnected:', peerId);
});
```

---

## Settings API

### `settings:get`

Gets a setting value.

**Channel:** `settings:get`

**Parameters:**

```typescript
interface GetSettingParams {
  key: string;
}
```

---

### `settings:set`

Sets a setting value.

**Channel:** `settings:set`

**Parameters:**

```typescript
interface SetSettingParams {
  key: string;
  value: unknown;
}
```

---

### `settings:getAll`

Gets all settings.

**Channel:** `settings:getAll`

**Returns:**

```typescript
interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStartDay: 0 | 1;
  notifications: NotificationSettings;
  sync: SyncSettings;
}
```

---

## Notification API

### `notification:show`

Shows a system notification.

**Channel:** `notification:show`

**Parameters:**

```typescript
interface ShowNotificationParams {
  title: string;
  body: string;
  icon?: string;
  actions?: NotificationAction[];
}
```

---

### `notification:schedule`

Schedules a future notification.

**Channel:** `notification:schedule`

**Parameters:**

```typescript
interface ScheduleNotificationParams {
  id: string;
  title: string;
  body: string;
  scheduledFor: string; // ISO 8601
}
```

---

### `notification:cancel`

Cancels a scheduled notification.

**Channel:** `notification:cancel`

**Parameters:**

```typescript
interface CancelNotificationParams {
  id: string;
}
```

---

## Error Handling

All IPC calls can throw errors. Handle them appropriately:

```typescript
try {
  const result = await window.electronAPI.calendar.create({
    name: 'My Calendar',
    color: '#3b82f6',
  });
} catch (error) {
  if (error instanceof Error) {
    console.error('Failed to create calendar:', error.message);
  }
}
```

### Common Error Codes

| Code               | Description                           |
| ------------------ | ------------------------------------- |
| `UNAUTHORIZED`     | User lacks permission for this action |
| `NOT_FOUND`        | Resource not found                    |
| `VALIDATION_ERROR` | Invalid parameters                    |
| `ENCRYPTION_ERROR` | Encryption/decryption failed          |
| `SYNC_ERROR`       | Sync operation failed                 |
| `NETWORK_ERROR`    | Network request failed                |

---

## TypeScript Types

All types are available from the shared types package:

```typescript
import type {
  Family,
  FamilyMember,
  Calendar,
  CalendarEvent,
  TaskList,
  Task,
  EmailAccount,
  EmailMessage,
} from '@/shared/types';
```

See [Data Model](DATA-MODEL.md) for complete type definitions.
