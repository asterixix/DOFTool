# DOFTool Architecture

## Overview

DOFTool is an offline-first, end-to-end encrypted (E2EE) desktop application built with Electron. It enables families to collaborate on calendars, tasks, and emails with automatic synchronization across devices on the same local network using peer-to-peer (P2P) technology.

## Design Principles

1. **Offline-First**: All operations work without network connectivity
2. **Local-First**: Data lives on user devices, not in the cloud
3. **Privacy by Design**: E2EE ensures only family members can read data
4. **Conflict-Free**: CRDT-based sync eliminates merge conflicts
5. **Zero Trust**: No central server to trust or compromise

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DOFTool Application                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Renderer Process (React)                      │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │  │
│  │  │  Family    │ │  Calendar  │ │   Tasks    │ │   Email    │    │  │
│  │  │  Module    │ │  Module    │ │   Module   │ │   Module   │    │  │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘    │  │
│  │        │              │              │              │            │  │
│  │  ┌─────┴──────────────┴──────────────┴──────────────┴─────┐     │  │
│  │  │              Shared UI Components (shadcn/ui)           │     │  │
│  │  └─────────────────────────────────────────────────────────┘     │  │
│  │        │                                                         │  │
│  │  ┌─────┴─────────────────────────────────────────────────────┐   │  │
│  │  │           State Management (Zustand + React Query)         │   │  │
│  │  └───────────────────────────┬───────────────────────────────┘   │  │
│  └──────────────────────────────┼───────────────────────────────────┘  │
│                                 │ IPC                                   │
│  ┌──────────────────────────────┼───────────────────────────────────┐  │
│  │                     Main Process (Node.js)                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │  Crypto Service │  │  Sync Service   │  │  Email Service  │   │  │
│  │  │  (libsodium)    │  │  (Yjs + WebRTC) │  │  (IMAP/SMTP)    │   │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │  │
│  │           │                    │                    │            │  │
│  │  ┌────────┴────────────────────┴────────────────────┴────────┐   │  │
│  │  │              Storage Service (LevelDB + Yjs)               │   │  │
│  │  └───────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
        ┌───────────────────┐          ┌───────────────────┐
        │   Local Network   │          │  Email Providers  │
        │  (mDNS + WebRTC)  │          │  (IMAP/SMTP)      │
        └───────────────────┘          └───────────────────┘
```

---

## Layer Architecture

### 1. Presentation Layer (Renderer Process)

The UI is built with React 19 and runs in Electron's renderer process.

#### Feature Modules

Each feature is a self-contained module with its own components, hooks, stores, and types:

```
src/modules/
├── family/          # Family management, invitations, permissions
├── calendar/        # Calendar views, event management, iCal
├── tasks/           # Task lists, assignments, due dates
└── email/           # Email client, IMAP sync, internal messaging
```

#### Shared Components

Reusable UI components built on shadcn/ui:

```
src/shared/
├── components/
│   ├── ui/          # shadcn/ui components (Button, Dialog, etc.)
│   ├── layout/      # App shell, navigation, sidebars
│   └── common/      # DatePicker, Avatar, SearchInput, etc.
├── hooks/           # useDebounce, useLocalStorage, useMediaQuery
└── lib/             # cn(), formatDate(), validators
```

#### State Management

- **Zustand**: Local UI state and Yjs document bindings
- **React Query**: Async operations (email fetching, external APIs)
- **Yjs Awareness**: Real-time presence (who's online, cursor positions)

```typescript
// Example: Calendar store with Yjs binding
interface CalendarState {
  calendars: Calendar[];
  selectedCalendarId: string | null;
  bindToYjs: (yMap: Y.Map<Calendar>) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  calendars: [],
  selectedCalendarId: null,
  bindToYjs: (yMap) => {
    // Subscribe to Yjs changes
    yMap.observe(() => {
      set({ calendars: Array.from(yMap.values()) });
    });
  },
}));
```

### 2. IPC Layer (Inter-Process Communication)

Typed IPC channels connect renderer and main processes:

```typescript
// electron/ipc/channels.ts
export const IPC_CHANNELS = {
  // Family Management
  'family:create': null,
  'family:join': null,
  'family:invite:generate': null,
  'family:member:update': null,
  
  // Calendar Operations
  'calendar:create': null,
  'calendar:update': null,
  'calendar:delete': null,
  'calendar:import': null,
  'calendar:export': null,
  
  // Sync Operations
  'sync:status': null,
  'sync:force': null,
  'sync:peers': null,
} as const;
```

### 3. Service Layer (Main Process)

Business logic runs in the main process for security and performance.

#### Crypto Service

Handles all encryption/decryption operations:

```typescript
class CryptoService {
  // Key derivation from family passphrase
  async deriveKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array>;
  
  // Symmetric encryption for data at rest
  async encrypt(plaintext: Uint8Array, key: Uint8Array): Promise<Uint8Array>;
  async decrypt(ciphertext: Uint8Array, key: Uint8Array): Promise<Uint8Array>;
  
  // Asymmetric encryption for key exchange
  async generateKeyPair(): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }>;
  async boxSeal(message: Uint8Array, publicKey: Uint8Array): Promise<Uint8Array>;
  async boxOpen(sealed: Uint8Array, keypair: KeyPair): Promise<Uint8Array>;
}
```

#### Sync Service

Manages P2P discovery and Yjs synchronization:

```typescript
class SyncService {
  private ydoc: Y.Doc;
  private provider: WebrtcProvider;
  private peers: Map<string, PeerConnection>;
  
  // mDNS discovery
  async startDiscovery(): Promise<void>;
  async stopDiscovery(): Promise<void>;
  
  // Peer management
  async connectToPeer(peerId: string): Promise<void>;
  async disconnectFromPeer(peerId: string): Promise<void>;
  
  // Sync operations
  async forceSyncWith(peerId: string): Promise<void>;
  getSyncStatus(): SyncStatus;
}
```

#### Storage Service

Persists Yjs documents to LevelDB:

```typescript
class StorageService {
  private db: Level;
  private persistence: LeveldbPersistence;
  
  // Document persistence
  async loadDocument(docId: string): Promise<Y.Doc>;
  async saveDocument(docId: string, doc: Y.Doc): Promise<void>;
  
  // Encrypted storage
  async storeEncrypted(key: string, value: unknown): Promise<void>;
  async getEncrypted<T>(key: string): Promise<T | null>;
}
```

#### Email Service

Handles external email integration:

```typescript
class EmailService {
  private imapConnections: Map<string, ImapFlow>;
  private smtpTransports: Map<string, Transporter>;
  
  // Account management
  async addAccount(config: EmailAccountConfig): Promise<void>;
  async removeAccount(accountId: string): Promise<void>;
  
  // Email operations
  async fetchMessages(accountId: string, folder: string): Promise<EmailMessage[]>;
  async sendMessage(accountId: string, message: OutgoingEmail): Promise<void>;
  async moveMessage(messageId: string, toFolder: string): Promise<void>;
}
```

### 4. Data Layer

#### Yjs Documents

Data is stored in Yjs CRDT documents organized by feature:

```typescript
// Document structure
const ydoc = new Y.Doc();

// Family data
const family = ydoc.getMap<Family>('family');
const members = ydoc.getMap<FamilyMember>('members');
const devices = ydoc.getMap<Device>('devices');
const permissions = ydoc.getMap<Permission>('permissions');

// Calendar data
const calendars = ydoc.getMap<Calendar>('calendars');
const events = ydoc.getMap<CalendarEvent>('events');

// Task data
const taskLists = ydoc.getMap<TaskList>('taskLists');
const tasks = ydoc.getMap<Task>('tasks');

// Internal messaging
const conversations = ydoc.getMap<Conversation>('conversations');
const messages = ydoc.getArray<Message>('messages');
```

#### LevelDB Storage

Persistent storage uses LevelDB through y-leveldb:

```
data/
├── yjs/              # Yjs document storage
│   ├── family.yjs
│   ├── calendars.yjs
│   ├── tasks.yjs
│   └── messages.yjs
├── email/            # Email cache (encrypted)
│   └── accounts/
└── config/           # App configuration (encrypted)
    └── settings.json
```

---

## Data Flow

### Creating a Calendar Event

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User UI   │────▶│  Zustand    │────▶│  Yjs Doc    │────▶│  LevelDB    │
│  (React)    │     │   Store     │     │  (CRDT)     │     │ (Persist)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  y-webrtc   │
                                        │  (Sync)     │
                                        └──────┬──────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         ▼                     ▼                     ▼
                  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
                  │  Device B   │       │  Device C   │       │  Device D   │
                  └─────────────┘       └─────────────┘       └─────────────┘
```

1. User creates event in UI
2. Zustand store dispatches action
3. Action updates Yjs document (CRDT operation)
4. y-leveldb persists to disk
5. y-webrtc broadcasts to connected peers
6. Peers apply CRDT update (automatic merge)

### Joining a Family

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Family Join Flow                                 │
└─────────────────────────────────────────────────────────────────────────┘

  Device A (Admin)                              Device B (Joining)
  ────────────────                              ─────────────────
        │                                              │
        │  1. Generate invite token                    │
        │  (contains: familyId, tempKey, expiry)       │
        │                                              │
        ├──────────────────────────────────────────────▶
        │              QR Code / Manual Entry          │
        │                                              │
        │                                     2. Parse token
        │                                        Verify not expired
        │                                              │
        │◀─────────────────────────────────────────────┤
        │     3. mDNS discovery + WebRTC connect       │
        │                                              │
        │  4. Verify token via                         │
        │     encrypted challenge                      │
        │                                              │
        ├──────────────────────────────────────────────▶
        │     5. Send family encryption key            │
        │        (encrypted with tempKey)              │
        │                                              │
        │                                     6. Decrypt family key
        │                                        Store securely
        │                                              │
        │◀─────────────────────────────────────────────┤
        │     7. Begin Yjs sync                        │
        │                                              │
        ▼                                              ▼
   [Family synced]                              [Family synced]
```

---

## P2P Network Architecture

### Discovery (mDNS)

Devices discover each other on the local network using mDNS (Multicast DNS):

```typescript
// Service advertisement
{
  name: 'FamilySync-<deviceId>',
  type: '_familysync._tcp',
  port: 45678,
  txt: {
    familyId: '<hashed-family-id>',
    deviceId: '<device-uuid>',
    publicKey: '<base64-public-key>'
  }
}
```

### Connection (WebRTC)

Peers connect using WebRTC data channels:

```
Device A                    Device B
    │                           │
    │  1. SDP Offer (via mDNS)  │
    ├──────────────────────────▶│
    │                           │
    │  2. SDP Answer            │
    │◀──────────────────────────┤
    │                           │
    │  3. ICE Candidates        │
    │◀─────────────────────────▶│
    │                           │
    │  4. Data Channel Open     │
    │══════════════════════════▶│
    │                           │
    │  5. Encrypted Yjs Updates │
    │◀════════════════════════▶│
```

### Sync Protocol

Yjs handles CRDT synchronization automatically:

1. **State Vector Exchange**: Devices share what updates they have
2. **Missing Updates**: Each device sends updates the other lacks
3. **CRDT Merge**: Updates merge automatically (no conflicts)
4. **Persistence**: Both devices save to LevelDB

---

## Security Architecture

### Encryption Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Encryption Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Layer 3: Transport (WebRTC DTLS)               │   │
│  │            - Peer-to-peer channel encryption              │   │
│  │            - Forward secrecy                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Layer 2: Application (libsodium)               │   │
│  │            - Yjs updates encrypted before sync            │   │
│  │            - XChaCha20-Poly1305                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Layer 1: Storage (Encrypted at Rest)           │   │
│  │            - LevelDB values encrypted                     │   │
│  │            - Keys derived from master key                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Hierarchy

```
Family Master Key (derived from admin's passphrase)
    │
    ├── Data Encryption Key (DEK)
    │       └── Encrypts all Yjs documents
    │
    ├── Member Keys (per member)
    │       └── Individual key pairs for secure communication
    │
    └── Device Keys (per device)
            └── Used for device authentication
```

---

## Module Architecture

### Family Module

```
modules/family/
├── components/
│   ├── FamilySetup.tsx        # Initial family creation
│   ├── InviteGenerator.tsx    # QR code generation
│   ├── JoinFamily.tsx         # Token entry / QR scan
│   ├── MemberList.tsx         # Family member management
│   ├── DeviceList.tsx         # Connected devices
│   └── PermissionEditor.tsx   # Role & permission UI
├── hooks/
│   ├── useFamily.ts           # Family state & operations
│   ├── useInvite.ts           # Invitation generation
│   ├── usePermissions.ts      # Permission checking
│   └── useDevices.ts          # Device management
├── stores/
│   └── family.store.ts        # Zustand store
└── types/
    └── Family.types.ts        # TypeScript interfaces
```

### Calendar Module

```
modules/calendar/
├── components/
│   ├── CalendarView.tsx       # Main calendar container
│   ├── MonthView.tsx          # Month grid view
│   ├── WeekView.tsx           # Week view
│   ├── DayView.tsx            # Day view
│   ├── EventCard.tsx          # Event display
│   ├── EventEditor.tsx        # Create/edit event
│   ├── RecurrenceEditor.tsx   # Recurring event settings
│   └── CalendarSidebar.tsx    # Calendar list & quick nav
├── hooks/
│   ├── useCalendars.ts        # Calendar CRUD
│   ├── useEvents.ts           # Event operations
│   ├── useRecurrence.ts       # Recurrence expansion
│   └── useIcalImport.ts       # iCal file handling
├── utils/
│   ├── icalParser.ts          # iCal parsing
│   ├── icalGenerator.ts       # iCal export
│   └── recurrence.ts          # RRule expansion
└── types/
    └── Calendar.types.ts
```

### Tasks Module

```
modules/tasks/
├── components/
│   ├── TaskListView.tsx       # Task list container
│   ├── TaskBoard.tsx          # Kanban view
│   ├── TaskCard.tsx           # Task display
│   ├── TaskEditor.tsx         # Create/edit task
│   ├── SubtaskList.tsx        # Subtask management
│   └── TaskFilters.tsx        # Filter & sort controls
├── hooks/
│   ├── useTaskLists.ts        # List CRUD
│   ├── useTasks.ts            # Task operations
│   └── useTaskFilters.ts      # Filtering logic
└── types/
    └── Task.types.ts
```

### Email Module

```
modules/email/
├── components/
│   ├── EmailClient.tsx        # Main email view
│   ├── MailboxList.tsx        # Folder navigation
│   ├── MessageList.tsx        # Email list
│   ├── MessageView.tsx        # Email reader
│   ├── ComposeEmail.tsx       # Email composer
│   ├── AccountSettings.tsx    # IMAP/SMTP config
│   └── InternalChat.tsx       # Family messaging
├── hooks/
│   ├── useEmailAccounts.ts    # Account management
│   ├── useMailbox.ts          # Folder operations
│   ├── useMessages.ts         # Email fetching
│   └── useInternalMessages.ts # Family chat
└── types/
    └── Email.types.ts
```

---

## Performance Considerations

### Lazy Loading

Feature modules are loaded on demand:

```typescript
// Router.tsx
const CalendarModule = lazy(() => import('@/modules/calendar'));
const TasksModule = lazy(() => import('@/modules/tasks'));
const EmailModule = lazy(() => import('@/modules/email'));
```

### Virtual Scrolling

Long lists use windowing:

```typescript
// For email lists with thousands of messages
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList({ messages }: { messages: EmailMessage[] }) {
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
  });
  // ...
}
```

### Web Workers

CPU-intensive operations run off main thread:

```typescript
// Encryption worker
const cryptoWorker = new Worker(
  new URL('./workers/crypto.worker.ts', import.meta.url)
);

// iCal parsing worker
const icalWorker = new Worker(
  new URL('./workers/ical.worker.ts', import.meta.url)
);
```

---

## Future Extensibility

### Mobile Support

Architecture supports future React Native / Capacitor migration:

- Feature modules are UI-framework agnostic
- Business logic in hooks (portable)
- Storage abstraction (LevelDB → SQLite on mobile)
- Sync protocol unchanged (WebRTC works on mobile)

### Cloud Relay (Optional)

For sync across different networks:

```
                    ┌─────────────────┐
                    │  Relay Server   │
                    │  (E2EE - just   │
                    │   forwards)     │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
     ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐
     │  Home WiFi  │  │   Mobile    │  │  Work WiFi  │
     │   Device    │  │   Device    │  │   Device    │
     └─────────────┘  └─────────────┘  └─────────────┘
```

### Plugin System

Future support for third-party integrations:

```typescript
interface FamilySyncPlugin {
  id: string;
  name: string;
  version: string;
  
  onInstall(): Promise<void>;
  onUninstall(): Promise<void>;
  
  // Optional hooks
  onEventCreated?(event: CalendarEvent): void;
  onTaskCompleted?(task: Task): void;
}
```
