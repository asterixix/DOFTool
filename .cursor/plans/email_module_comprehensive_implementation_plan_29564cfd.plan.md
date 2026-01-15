---
name: Email Module Comprehensive Implementation Plan
overview: Comprehensive implementation plan for the FamilySync email module covering external email integration (IMAP/SMTP), internal family messaging, advanced email features (snooze, scheduled send, templates), shared inbox functionality, and full-text search. The plan is organized by priority and functional category with detailed technical specifications.
todos:
  - id: phase1-search
    content: Implement full-text search with indexing (EmailSearchService, SearchBar, searchIndexer)
    status: completed
  - id: phase1-labels
    content: Implement labels and tags system (labels.store, LabelManager, LabelBadge, IPC handlers)
    status: completed
  - id: phase1-folders
    content: Enhance folder management (FolderManager, folder CRUD operations, IPC handlers)
    status: in_progress
  - id: phase1-html
    content: Enhance HTML email rendering (SecureEmailRenderer, enhanced sanitization)
    status: in_progress
  - id: phase2-snooze
    content: Implement email snooze (snooze types, store, SnoozeDialog, EmailSnoozeService)
    status: pending
  - id: phase2-scheduled
    content: Implement scheduled send (schedule types, ScheduleSendDialog, EmailScheduleService)
    status: pending
  - id: phase2-templates
    content: Implement email templates (template types, store, TemplateManager, TemplateSelector)
    status: pending
  - id: phase2-quickreply
    content: Implement quick reply interface (QuickReply component, integrate with MessageView)
    status: pending
  - id: phase2-undosend
    content: Implement undo send (undoSend store, EmailUndoSendService, composer integration)
    status: pending
  - id: phase2-readreceipts
    content: Implement read receipt requests (read receipt types, dialog, EmailReadReceiptService)
    status: pending
  - id: phase2-priority
    content: Implement priority inbox/smart sorting (priorityInbox utils, PriorityInboxView, store)
    status: pending
  - id: phase3-shared
    content: Implement shared inbox UI (SharedInboxView, useSharedEmail hook, sidebar integration)
    status: pending
  - id: phase3-sendas
    content: Implement send-as permission UI (SendAsSelector, PermissionManager)
    status: pending
  - id: phase3-assignment
    content: Implement email assignment workflow (assignment types, EmailAssignmentDialog, AssignedEmailsView)
    status: pending
  - id: phase3-notes
    content: Implement internal notes (note types, EmailNotesPanel, NoteEditor)
    status: pending
  - id: phase4-conversations
    content: Implement conversation list UI (ConversationList, ConversationItem, useConversations hook, store)Implement direct messaging UI (DirectMessageView, MessageBubble, routing)Implement group chat UI (GroupChatView, GroupChatSettings, ParticipantList)Implement message reactions (ReactionPicker, ReactionBadge, message integration)Implement file sharing in conversations (FileUploadButton, FilePreview, message integration)
    status: pending
  - id: phase4-typing
    content: Implement typing indicators (typingIndicator utils, Yjs Awareness integration)
    status: pending
    dependencies:
      - phase4-direct
      - phase4-group
  - id: phase4-readreceipts
    content: Implement read receipts for internal messages (read status updates, UI indicators)
    status: pending
    dependencies:
      - phase4-direct
  - id: phase4-search
    content: Implement message search for conversations (ConversationSearch, extend search indexer)
    status: pending
    dependencies:
      - phase1-search
  - id: phase5-offline
    content: Implement offline queue (EmailOfflineQueue, EmailService integration)
    status: pending
  - id: phase5-pooling
    content: Enhance connection pooling (EmailService optimization)
    status: pending
  - id: phase5-errors
    content: Enhance error handling (retry logic, errorHandler utils)
    status: pending
  - id: phase5-ratelimit
    content: Implement rate limiting (EmailRateLimiter, EmailService integration)
    status: pending
---

# Email Module Comprehensive Implementation Plan

## Current State Analysis

### What's Already Implemented

**Core Infrastructure:**

- Basic EmailService with IMAP/SMTP support ([electron/services/EmailService.ts](electron/services/EmailService.ts))
- Email account configuration UI ([src/modules/email/components/settings](src/modules/email/components/settings))
- Basic UI components: EmailClient, EmailSidebar, MessageList, MessageView, MessageComposer
- Threading utilities ([src/modules/email/utils/threading.ts](src/modules/email/utils/threading.ts)) - comprehensive implementation
- Email types defined ([src/modules/email/types/Email.types.ts](src/modules/email/types/Email.types.ts))
- Internal messaging types defined ([docs/DATA-MODEL.md](docs/DATA-MODEL.md)) - but no UI implementation
- Yjs structure for emailAccounts, conversations, internalMessages ([electron/services/YjsService.ts](electron/services/YjsService.ts))

**Partially Implemented:**

- Rich text composer (basic HTML support)
- Folder management (basic IMAP folder listing)
- Attachment handling (basic send/receive)
- Multi-account support (account switching works)

### What's Missing

**External Email Integration:**

- Advanced folder management (create, rename, delete, hierarchy)
- Labels/tags system (beyond IMAP flags)
- Full-text search with indexing
- Provider-specific optimizations (Gmail, Outlook, Yahoo)
- Enhanced HTML email rendering with security
- Attachment preview capabilities

**Internal Family Messaging:**

- Complete UI for conversations (currently only types defined)
- Direct messaging interface
- Group chat functionality
- Message reactions
- File sharing within conversations
- Typing indicators
- Read receipts
- Message search

**Advanced Email Features:**

- Email snooze
- Scheduled send
- Email templates
- Quick reply interface
- Undo send
- Read receipt requests
- Priority inbox/smart sorting

**Shared Email Features:**

- Shared inbox UI
- Send-as permission UI
- Email assignment workflow
- Internal notes system

**Technical Enhancements:**

- Full-text indexing (full-text search)
- Offline queue for email operations
- Connection pooling optimization
- Rate limiting enforcement
- Enhanced error handling and retry logic

---

## Implementation Roadmap

### Phase 1: Core Email Enhancements (Priority: High)

#### 1.1 Full-Text Search with Indexing

**Files to Create:**

- `electron/services/EmailSearchService.ts` - Full-text indexing service
- `src/modules/email/components/SearchBar.tsx` - Search UI component
- `src/modules/email/utils/searchIndexer.ts` - Index building utilities

**Implementation Details:**

- Use SQLite FTS5 or Minisearch for indexing
- Index: subject, body (text + HTML), sender, recipients, attachment names
- Support boolean operators (AND, OR, NOT)
- Date range filters
- Sender/recipient filters
- Attachment name search
- Real-time index updates when new messages arrive

**Data Model:**

```typescript
interface EmailSearchIndex {
  messageId: string;
  accountId: string;
  subject: string;
  bodyText: string;
  sender: string;
  recipients: string[];
  date: number;
  folder: string;
  attachmentNames: string[];
  indexedAt: number;
}
```

**IPC Handlers:**

- `email:search` - Execute search query
- `email:searchIndex:rebuild` - Rebuild index for account

#### 1.2 Labels and Tags System

**Files to Create/Modify:**

- Extend `src/modules/email/types/Email.types.ts` with Label type
- `src/modules/email/stores/labels.store.ts` - Label management store
- `src/modules/email/components/LabelManager.tsx` - Label creation/editing UI
- `src/modules/email/components/LabelBadge.tsx` - Label display component

**Data Model:**

```typescript
interface EmailLabel {
  id: string;
  accountId: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: number;
}

interface EmailMessage {
  // ... existing fields
  labels: string[]; // Label IDs (already exists in type)
  customLabels: string[]; // Custom labels beyond IMAP
}
```

**Storage:**

- Store labels in Yjs: `emailLabels` Y.Map
- Sync labels across devices via Yjs
- Map IMAP flags to labels (Seen, Flagged, Draft, etc.)

**IPC Handlers:**

- `email:labels:create` - Create new label
- `email:labels:update` - Update label
- `email:labels:delete` - Delete label
- `email:labels:apply` - Apply label to messages
- `email:labels:remove` - Remove label from messages

#### 1.3 Enhanced Folder Management

**Files to Create/Modify:**

- `src/modules/email/components/FolderManager.tsx` - Folder CRUD UI
- `electron/services/EmailService.ts` - Add folder operations

**Features:**

- Create custom folders
- Rename folders
- Delete folders (with move option)
- Folder hierarchy visualization
- Folder-specific settings (sync behavior, filters)

**IPC Handlers:**

- `email:folders:create` - Create folder
- `email:folders:rename` - Rename folder
- `email:folders:delete` - Delete folder
- `email:folders:move` - Move messages to folder

#### 1.4 Enhanced HTML Email Rendering

**Files to Create/Modify:**

- `src/modules/email/components/SecureEmailRenderer.tsx` - Secure HTML renderer
- `src/modules/email/utils/emailSanitizer.ts` - Enhanced sanitization (extend existing)

**Features:**

- Sanitize HTML with DOMPurify
- Block external image loading by default (with opt-in)
- Render tables, lists, images inline
- Support for CSS (sanitized)
- Dark mode email rendering
- Print-friendly rendering

---

### Phase 2: Advanced Email Features (Priority: Medium-High)

#### 2.1 Email Snooze

**Files to Create:**

- `src/modules/email/types/EmailSnooze.types.ts` - Snooze types
- `src/modules/email/stores/snooze.store.ts` - Snooze state management
- `src/modules/email/components/SnoozeDialog.tsx` - Snooze UI
- `electron/services/EmailSnoozeService.ts` - Snooze scheduling service

**Data Model:**

```typescript
interface EmailSnooze {
  id: string;
  messageId: string;
  accountId: string;
  snoozeUntil: number; // Timestamp
  originalFolder: string;
  createdAt: number;
}
```

**Implementation:**

- Store snoozed emails in Yjs: `emailSnoozes` Y.Map
- Move message to "Snoozed" virtual folder
- Schedule notification via Electron Notification API
- Auto-move back to original folder when snooze expires
- Support: "Later today", "Tomorrow", "Next week", custom datetime

**IPC Handlers:**

- `email:snooze:add` - Snooze message
- `email:snooze:remove` - Remove snooze
- `email:snooze:list` - List snoozed messages

#### 2.2 Scheduled Send

**Files to Create:**

- `src/modules/email/types/EmailSchedule.types.ts` - Schedule types
- `src/modules/email/components/ScheduleSendDialog.tsx` - Schedule UI
- `electron/services/EmailScheduleService.ts` - Schedule management

**Data Model:**

```typescript
interface ScheduledEmail {
  id: string;
  accountId: string;
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  bcc?: Array<{ name?: string; address: string }>;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; content: string; contentType: string }>;
  scheduledFor: number; // Timestamp
  timezone: string;
  createdAt: number;
}
```

**Implementation:**

- Store scheduled emails in Yjs: `scheduledEmails` Y.Map
- Use Electron's scheduled tasks or cron-like scheduling
- Show scheduled emails in "Scheduled" folder
- Allow editing/canceling before send time
- Send via EmailService when time arrives

**IPC Handlers:**

- `email:schedule:create` - Schedule email
- `email:schedule:update` - Update scheduled email
- `email:schedule:cancel` - Cancel scheduled email
- `email:schedule:list` - List scheduled emails

#### 2.3 Email Templates

**Files to Create:**

- `src/modules/email/types/EmailTemplate.types.ts` - Template types
- `src/modules/email/stores/templates.store.ts` - Template store
- `src/modules/email/components/TemplateManager.tsx` - Template CRUD UI
- `src/modules/email/components/TemplateSelector.tsx` - Template picker in composer

**Data Model:**

```typescript
interface EmailTemplate {
  id: string;
  accountId?: string; // null = global template
  name: string;
  category: string;
  subject: string;
  body: string; // HTML
  variables: string[]; // e.g., ["{{name}}", "{{date}}"]
  createdAt: number;
  updatedAt: number;
}
```

**Implementation:**

- Store templates in Yjs: `emailTemplates` Y.Map
- Variable replacement: `{{variableName}}`
- Template categories (e.g., "Work", "Personal", "Support")
- Quick insertion in composer
- Preview mode

**IPC Handlers:**

- `email:templates:create` - Create template
- `email:templates:update` - Update template
- `email:templates:delete` - Delete template
- `email:templates:list` - List templates
- `email:templates:render` - Render template with variables

#### 2.4 Quick Reply

**Files to Create/Modify:**

- `src/modules/email/components/QuickReply.tsx` - Quick reply component
- Modify `src/modules/email/components/MessageView.tsx` to include QuickReply

**Features:**

- Inline reply within conversation view
- Pre-filled recipient (reply-to address)
- Subject prefix handling (Re:, Fwd:)
- Send without opening full composer
- Support for attachments (optional)

#### 2.5 Undo Send

**Files to Create:**

- `src/modules/email/stores/undoSend.store.ts` - Undo send state
- `electron/services/EmailUndoSendService.ts` - Undo send logic
- Modify `src/modules/email/components/MessageComposer.tsx` for undo UI

**Implementation:**

- Delay actual send by configurable grace period (default 5 seconds)
- Show "Undo" button in toast notification
- Store pending send in memory (not persistent)
- Cancel SMTP send if undo clicked within grace period
- Configurable grace period in settings (5-30 seconds)

**IPC Handlers:**

- `email:send:undo` - Cancel pending send

#### 2.6 Read Receipts

**Files to Create:**

- `src/modules/email/types/ReadReceipt.types.ts` - Read receipt types
- `src/modules/email/components/ReadReceiptDialog.tsx` - Read receipt UI
- `electron/services/EmailReadReceiptService.ts` - Read receipt handling

**Data Model:**

```typescript
interface ReadReceipt {
  id: string;
  messageId: string;
  accountId: string;
  requestedAt: number;
  readBy: Array<{
    email: string;
    readAt: number;
  }>;
}
```

**Implementation:**

- Add `X-Read-Receipt-Requested` header when sending
- Parse `Disposition-Notification-To` header in received emails
- Send MDN (Message Disposition Notification) when user reads email (if requested)
- Display read status in email view
- Respect user privacy (opt-in for sending receipts)

**IPC Handlers:**

- `email:readReceipt:request` - Request read receipt for outgoing
- `email:readReceipt:send` - Send read receipt for incoming
- `email:readReceipt:status` - Get read receipt status

#### 2.7 Priority Inbox / Smart Sorting

**Files to Create:**

- `src/modules/email/utils/priorityInbox.ts` - Priority scoring algorithm
- `src/modules/email/components/PriorityInboxView.tsx` - Priority inbox UI
- `src/modules/email/stores/priorityInbox.store.ts` - Priority inbox state

**Algorithm:**

- Score based on:
  - Sender importance (frequent contacts, family members)
  - User interaction (opens, replies, deletes)
  - Content analysis (keywords, urgency indicators)
  - Time-based factors (recent emails prioritized)
- Machine learning optional (future enhancement)

**IPC Handlers:**

- `email:priority:score` - Calculate priority score for message
- `email:priority:train` - Update scoring model based on user actions

---

### Phase 3: Shared Email Features (Priority: Medium)

#### 3.1 Shared Inbox UI

**Files to Create/Modify:**

- `src/modules/email/components/SharedInboxView.tsx` - Shared inbox component
- Modify `src/modules/email/components/EmailSidebar.tsx` to show shared accounts
- `src/modules/email/hooks/useSharedEmail.ts` - Shared email hook

**Features:**

- Display shared accounts in sidebar
- Filter by access level (read, read_write, send_as, full)
- Show account owner
- Permission indicators
- Unified inbox view (all shared accounts)

**Data Model:**

- Already defined in `SharedEmailAccess` interface
- Access levels: 'read' | 'read_write' | 'send_as' | 'full'

**IPC Handlers:**

- `email:shared:list` - List shared accounts for current user
- `email:shared:share` - Share account with member
- `email:shared:unshare` - Unshare account

#### 3.2 Send-As Permission UI

**Files to Create:**

- `src/modules/email/components/SendAsSelector.tsx` - Send-as selector in composer
- `src/modules/email/components/PermissionManager.tsx` - Permission management UI

**Features:**

- Show available "send-as" accounts in composer
- Display sender name with account indicator
- Permission management UI for account owners
- Audit log of sent emails (who sent what)

**Implementation:**

- Check `send_as` permission before allowing send
- Store sent message metadata (sender member ID)
- Display in message view: "Sent by [Member Name] on behalf of [Account]"

#### 3.3 Email Assignment Workflow

**Files to Create:**

- `src/modules/email/types/EmailAssignment.types.ts` - Assignment types
- `src/modules/email/components/EmailAssignmentDialog.tsx` - Assignment UI
- `src/modules/email/components/AssignedEmailsView.tsx` - Assigned emails view

**Data Model:**

```typescript
interface EmailAssignment {
  id: string;
  messageId: string;
  accountId: string;
  assignedTo: string; // Member ID
  assignedBy: string; // Member ID
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  assignedAt: number;
  completedAt?: number;
}
```

**Implementation:**

- Store assignments in Yjs: `emailAssignments` Y.Map
- Show assigned emails in dedicated view
- Status tracking (pending, in progress, completed)
- Notification when email is assigned
- Filter by assignee in email list

**IPC Handlers:**

- `email:assignment:create` - Assign email to member
- `email:assignment:update` - Update assignment status
- `email:assignment:delete` - Remove assignment
- `email:assignment:list` - List assignments

#### 3.4 Internal Notes

**Files to Create:**

- `src/modules/email/types/EmailNote.types.ts` - Note types
- `src/modules/email/components/EmailNotesPanel.tsx` - Notes panel
- `src/modules/email/components/NoteEditor.tsx` - Note editor

**Data Model:**

```typescript
interface EmailNote {
  id: string;
  messageId: string;
  accountId: string;
  authorId: string; // Member ID
  content: string; // Markdown supported
  createdAt: number;
  updatedAt: number;
}
```

**Implementation:**

- Store notes in Yjs: `emailNotes` Y.Map
- Notes are private to family (not sent externally)
- Markdown support for formatting
- Show notes in email view sidebar
- Edit/delete notes (author only, or with permission)

**IPC Handlers:**

- `email:notes:create` - Create note
- `email:notes:update` - Update note
- `email:notes:delete` - Delete note
- `email:notes:list` - List notes for message

---

### Phase 4: Internal Family Messaging (Priority: High)

#### 4.1 Conversation List UI

**Files to Create:**

- `src/modules/email/components/ConversationList.tsx` - Conversation list
- `src/modules/email/components/ConversationItem.tsx` - Conversation list item
- `src/modules/email/hooks/useConversations.ts` - Conversation hook
- `src/modules/email/stores/conversations.store.ts` - Conversation store

**Features:**

- List all conversations (direct + group)
- Show last message preview
- Unread count badge
- Participant avatars
- Sort by last message time
- Search conversations

**Data Model:**

- Already defined: `Conversation` interface in `docs/DATA-MODEL.md`
- Store in Yjs: `conversations` Y.Map

**IPC Handlers:**

- `conversations:list` - List conversations
- `conversations:get` - Get conversation by ID
- `conversations:create` - Create new conversation
- `conversations:update` - Update conversation metadata

#### 4.2 Direct Messaging UI

**Files to Create:**

- `src/modules/email/components/DirectMessageView.tsx` - Direct message view
- `src/modules/email/components/MessageBubble.tsx` - Message bubble component
- Modify routing to support `/messages` route

**Features:**

- One-to-one conversation interface
- Message bubbles (sent/received styling)
- Timestamp display
- Read status indicators
- Message reactions (emoji)
- File attachments
- Reply threading

**Implementation:**

- Use existing `InternalMessage` type
- Store messages in Yjs: `internalMessages` Y.Array
- Real-time sync via Yjs awareness

#### 4.3 Group Chat UI

**Files to Create:**

- `src/modules/email/components/GroupChatView.tsx` - Group chat view
- `src/modules/email/components/GroupChatSettings.tsx` - Group settings
- `src/modules/email/components/ParticipantList.tsx` - Participant list

**Features:**

- Multi-member conversations
- Conversation title
- Add/remove participants
- Participant list sidebar
- Group settings (title, permissions)

**IPC Handlers:**

- `conversations:addParticipant` - Add participant to group
- `conversations:removeParticipant` - Remove participant
- `conversations:updateTitle` - Update group chat title

#### 4.4 Message Reactions

**Files to Create:**

- `src/modules/email/components/ReactionPicker.tsx` - Emoji picker
- `src/modules/email/components/ReactionBadge.tsx` - Reaction display
- Modify `MessageBubble.tsx` to show reactions

**Features:**

- Click message to add reaction
- Emoji picker (common emojis + full picker)
- Show reaction counts
- Show who reacted (tooltip)
- Remove own reaction (click again)

**Data Model:**

- Already in `InternalMessage`: `reactions: Record<string, string[]>` (emoji -> memberIds)

**IPC Handlers:**

- `messages:react` - Add/remove reaction
- Real-time sync via Yjs (reactions stored in message)

#### 4.5 File Sharing in Conversations

**Files to Create:**

- `src/modules/email/components/FileUploadButton.tsx` - File upload
- `src/modules/email/components/FilePreview.tsx` - File preview
- Modify `DirectMessageView.tsx` and `GroupChatView.tsx` for file support

**Features:**

- Drag-and-drop file upload
- File preview (images, PDFs)
- File download
- File size limits
- Progress indicator

**Data Model:**

- Already defined: `MessageAttachment` interface

**IPC Handlers:**

- `messages:uploadFile` - Upload file attachment
- `messages:downloadFile` - Download file
- Files stored in LevelDB or encrypted storage

#### 4.6 Typing Indicators

**Files to Create:**

- `src/modules/email/utils/typingIndicator.ts` - Typing indicator logic
- Modify message views to show typing indicators

**Features:**

- Real-time typing indicators via Yjs Awareness
- Show "User is typing..." message
- Debounce typing events (2 second timeout)
- Per-conversation typing state

**Implementation:**

- Use Yjs Awareness API
- Store typing state: `awareness.setLocalStateField('typing', { conversationId, isTyping })`
- Listen to awareness changes to show indicators

#### 4.7 Read Receipts for Internal Messages

**Features:**

- Show read status per message (already in `InternalMessage.readBy`)
- Update read status when message is viewed
- Show "Read by [Name]" in message view
- Timestamp of read time

**Implementation:**

- Update `readBy` array when message is viewed
- Sync via Yjs
- Show read indicators in message list

#### 4.8 Message Search for Conversations

**Files to Create:**

- Extend search to include internal messages
- `src/modules/email/components/ConversationSearch.tsx` - Conversation search

**Features:**

- Search message content
- Search by sender
- Search by attachment name
- Date filters
- Search within specific conversation

**IPC Handlers:**

- `messages:search` - Search internal messages
- Reuse existing search indexer (extend for internal messages)

---

### Phase 5: Technical Enhancements (Priority: Medium-Low)

#### 5.1 Offline Queue

**Files to Create:**

- `electron/services/EmailOfflineQueue.ts` - Offline operation queue
- Modify `EmailService.ts` to use queue

**Features:**

- Queue email sends when offline
- Queue folder operations (move, delete)
- Queue label operations
- Retry when connection restored
- Show queued operations in UI

**Data Model:**

```typescript
interface QueuedEmailOperation {
  id: string;
  type: 'send' | 'move' | 'delete' | 'label';
  accountId: string;
  data: unknown; // Operation-specific data
  retryCount: number;
  createdAt: number;
}
```

#### 5.2 Connection Pooling Optimization

**Files to Modify:**

- `electron/services/EmailService.ts` - Enhance connection pooling

**Features:**

- Reuse IMAP connections (already partially done)
- Connection pool per account
- Idle connection timeout
- Max connection limits
- Connection health checks

#### 5.3 Enhanced Error Handling

**Files to Modify:**

- `electron/services/EmailService.ts` - Add retry logic
- `src/modules/email/utils/errorHandler.ts` - Error handling utilities

**Features:**

- Retry with exponential backoff
- Network error detection
- Authentication error handling
- User-friendly error messages
- Error logging and reporting

#### 5.4 Rate Limiting Enforcement

**Files to Create:**

- `electron/services/EmailRateLimiter.ts` - Rate limiting service
- Modify `EmailService.ts` to use rate limiter

**Features:**

- Per-account rate limits
- Configurable limits (max requests per window)
- Queue requests when limit exceeded
- Show rate limit status in UI

---

## Data Model Summary

### Yjs Document Structure Extensions

```typescript
// Additional Yjs maps/arrays needed:
{
  emailLabels: Y.Map<EmailLabel>,
  emailSnoozes: Y.Map<EmailSnooze>,
  scheduledEmails: Y.Map<ScheduledEmail>,
  emailTemplates: Y.Map<EmailTemplate>,
  emailAssignments: Y.Map<EmailAssignment>,
  emailNotes: Y.Map<EmailNote>,
  // Already exist:
  emailAccounts: Y.Map<EmailAccount>,
  conversations: Y.Map<Conversation>,
  internalMessages: Y.Array<InternalMessage>,
}
```

### Storage Requirements

- **LevelDB**: Email search index, scheduled emails queue, offline queue
- **Yjs**: All shared state (labels, templates, assignments, notes, conversations, messages)
- **Encrypted Storage**: Email credentials (already implemented)

---

## Security Considerations

1. **Email Credentials**: Already encrypted using EncryptionService
2. **HTML Sanitization**: Use DOMPurify for all HTML email rendering
3. **File Upload Limits**: Enforce size limits (configurable, default 10MB)
4. **Rate Limiting**: Prevent abuse of email sending
5. **Permission Checks**: Verify permissions before all operations
6. **Read Receipts**: Opt-in only, respect privacy
7. **Internal Notes**: Encrypted in Yjs (E2EE)

---

## Testing Strategy

### Unit Tests

- Threading utilities
- Search indexing
- Priority inbox scoring
- Template variable replacement
- Email sanitization

### Integration Tests

- IMAP/SMTP operations
- Yjs sync for conversations
- Permission checks
- Offline queue operations

### E2E Tests (Playwright)

- Email sending/receiving flow
- Shared inbox access
- Internal messaging
- Scheduled send
- Email snooze

---

## Accessibility Requirements

1. **Keyboard Navigation**: Full keyboard support for all features
2. **Screen Readers**: Proper ARIA labels and roles
3. **Color Contrast**: WCAG 2.1 AA compliance
4. **Focus Management**: Logical focus order
5. **Reduced Motion**: Respect `prefers-reduced-motion`

---

## Performance Considerations

1. **Virtual Scrolling**: For long email lists (react-window or similar)
2. **Lazy Loading**: Load email bodies on demand
3. **Indexing**: Background index updates
4. **Caching**: Cache frequently accessed emails
5. **Debouncing**: Search input debouncing (300ms)

---

## Implementation Priority Summary

**Phase 1 (Weeks 1-4):** Core Email Enhancements

- Full-text search
- Labels/tags
- Enhanced folder management
- Enhanced HTML rendering

**Phase 2 (Weeks 5-8):** Advanced Email Features

- Email snooze
- Scheduled send
- Email templates
- Quick reply
- Undo send
- Read receipts
- Priority inbox

**Phase 3 (Weeks 9-10):** Shared Email Features

- Shared inbox UI
- Send-as permissions UI
- Email assignment
- Internal notes

**Phase 4 (Weeks 11-14):** Internal Family Messaging

- Conversation list UI
- Direct messaging UI
- Group chat UI
- Message reactions
- File sharing
- Typing indicators
- Read receipts
- Message search

**Phase 5 (Weeks 15-16):** Technical Enhancements

- Offline queue
- Connection pooling
- Error handling
- Rate limiting

**Total Estimated Time:** 16 weeks (4 months) for full implementation