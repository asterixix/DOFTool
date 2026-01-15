---
name: FamilySync Architecture Plan
overview: Create comprehensive documentation and architecture for FamilySync - an offline-first, E2EE family collaboration app with Calendar, Tasks, and Email features, using P2P sync with Yjs CRDTs.
todos:
  - id: create-cursorrules
    content: Create .cursorrules file with project-specific AI coding guidelines
    status: completed
  - id: create-architecture-doc
    content: Create docs/ARCHITECTURE.md with detailed system architecture
    status: completed
  - id: create-data-model-doc
    content: Create docs/DATA-MODEL.md with TypeScript interfaces and schemas
    status: completed
  - id: create-security-doc
    content: Create docs/SECURITY.md with E2EE encryption model
    status: completed
  - id: create-sync-protocol-doc
    content: Create docs/SYNC-PROTOCOL.md with P2P sync specification
    status: completed
  - id: create-contributing-doc
    content: Create docs/CONTRIBUTING.md with code guidelines
    status: completed
  - id: create-readme
    content: Create README.md with project overview and setup instructions
    status: completed
  - id: create-package-json
    content: Create package.json with all dependencies and scripts
    status: completed
---

# FamilySync - Architecture & Documentation Plan

## Project Summary

FamilySync is an offline-first, end-to-end encrypted Electron application for family collaboration. It features P2P synchronization via mDNS discovery, CRDT-based conflict resolution, and comprehensive Calendar, Tasks, and Email management.

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph ElectronApp [Electron Application]
        MainProcess[Main Process]
        RendererProcess[Renderer Process - React]
        
        subgraph CoreServices [Core Services Layer]
            SyncEngine[P2P Sync Engine]
            CryptoService[E2EE Crypto Service]
            StorageService[Storage Service]
        end
        
        subgraph DataLayer [Data Layer]
            YjsDoc[Yjs Documents]
            LevelDB[(LevelDB)]
            IndexedDB[(IndexedDB - Web)]
        end
        
        subgraph FeatureModules [Feature Modules]
            CalendarModule[Calendar Module]
            TasksModule[Tasks Module]
            EmailModule[Email Module]
            FamilyModule[Family Management]
        end
    end
    
    subgraph Network [Network Layer]
        mDNS[mDNS Discovery]
        WebRTC[WebRTC Data Channels]
        IMAP[IMAP/SMTP - External Email]
    end
    
    RendererProcess --> FeatureModules
    FeatureModules --> CoreServices
    CoreServices --> DataLayer
    SyncEngine --> mDNS
    SyncEngine --> WebRTC
    EmailModule --> IMAP
    CryptoService --> YjsDoc
```

---

## Tech Stack Decisions

### Core Framework

| Technology | Purpose | Rationale |

|------------|---------|-----------|

| Electron 33+ | Desktop runtime | Cross-platform, future Capacitor compatibility |

| React 19 | UI framework | Component model, ecosystem, mobile portability |

| TypeScript 5.5+ | Type safety | Better DX, refactoring support |

| Vite | Build tool | Fast HMR, ESM-first, Electron plugin available |

### Data & Sync

| Technology | Purpose | Rationale |

|------------|---------|-----------|

| Yjs | CRDT implementation | Best-in-class CRDT, automatic conflict resolution |

| y-leveldb | Persistence provider | Fast, embeddable, works with Electron |

| y-webrtc | P2P transport | Works with mDNS signaling |

| libp2p | P2P networking | mDNS discovery, NAT traversal |

### Security

| Technology | Purpose | Rationale |

|------------|---------|-----------|

| libsodium-wrappers | Encryption primitives | Industry standard, fast, audited |

| @noble/ed25519 | Key derivation | Modern, audited cryptography |

| electron-store | Secure storage | Encrypted config storage |

### UI/UX

| Technology | Purpose | Rationale |

|------------|---------|-----------|

| shadcn/ui | Component library | Customizable, accessible, Tailwind-based |

| Tailwind CSS 4 | Styling | Utility-first, consistent design |

| Framer Motion | Animations | Declarative, performant |

| Radix UI | Primitives | Accessible, unstyled components |

| Lucide React | Icons | Clean, consistent icon set |

### Feature-Specific

| Technology | Purpose | Rationale |

|------------|---------|-----------|

| ical.js | iCal parsing/generation | RFC 5545 compliant |

| date-fns | Date manipulation | Lightweight, tree-shakeable |

| @electron/ipcMain | Email protocols | Full IMAP/SMTP support |

| imapflow | IMAP client | Modern, promise-based |

| nodemailer | SMTP client | Battle-tested |

### Development

| Technology | Purpose |

|------------|---------|

| ESLint 9 (flat config) | Linting |

| Prettier | Formatting |

| Husky + lint-staged | Git hooks |

| Vitest | Unit/Integration tests |

| React Testing Library | Component tests |

| Playwright | E2E tests |

---

## Data Model Architecture

```mermaid
erDiagram
    Family ||--o{ FamilyMember : contains
    Family ||--o{ Calendar : owns
    Family ||--o{ TaskList : owns
    Family ||--o{ EmailAccount : configures
    
    FamilyMember ||--o{ Device : uses
    FamilyMember ||--o{ Permission : has
    
    Calendar ||--o{ Event : contains
    Event ||--o{ EventPermission : has
    
    TaskList ||--o{ Task : contains
    Task ||--o{ Subtask : has
    
    EmailAccount ||--o{ EmailMessage : stores
    EmailAccount ||--o{ EmailFolder : organizes
    
    Family {
        string id PK
        string name
        string encryptionKey
        timestamp createdAt
        string adminDeviceId
    }
    
    FamilyMember {
        string id PK
        string familyId FK
        string displayName
        string publicKey
        string role
        boolean isAdmin
    }
    
    Calendar {
        string id PK
        string familyId FK
        string name
        string color
        string defaultPermission
        string ownerId FK
    }
    
    Event {
        string id PK
        string calendarId FK
        string title
        timestamp start
        timestamp end
        string recurrence
        string location
        string description
        string[] attendees
    }
    
    Task {
        string id PK
        string taskListId FK
        string title
        string description
        string priority
        timestamp dueDate
        boolean completed
        string assigneeId FK
    }
    
    EmailAccount {
        string id PK
        string familyId FK
        string email
        string imapConfig
        string smtpConfig
        string[] sharedWithMembers
    }
```

---

## P2P Sync Architecture

```mermaid
sequenceDiagram
    participant DeviceA as Device A - Admin
    participant mDNS as mDNS Service
    participant DeviceB as Device B - Member
    
    Note over DeviceA: Family created, generates keys
    
    DeviceB->>mDNS: Broadcast presence
    mDNS->>DeviceA: Discover Device B
    
    DeviceA->>DeviceB: WebRTC signaling via mDNS
    DeviceB->>DeviceA: Accept connection
    
    Note over DeviceA, DeviceB: Establish encrypted WebRTC channel
    
    DeviceB->>DeviceA: Request join (with invite token)
    DeviceA->>DeviceA: Verify token
    DeviceA->>DeviceB: Share family encryption key
    
    Note over DeviceA, DeviceB: Yjs sync begins
    
    DeviceA->>DeviceB: Sync Yjs state vector
    DeviceB->>DeviceA: Send missing updates
    DeviceA->>DeviceB: Send missing updates
    
    Note over DeviceA, DeviceB: Continuous CRDT sync
```

---

## Folder Structure

```
FamilySync/
├── .husky/                     # Git hooks
├── .vscode/                    # VS Code settings
├── docs/                       # Project documentation
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   ├── SECURITY.md
│   └── API.md
├── electron/                   # Electron main process
│   ├── main.ts
│   ├── preload.ts
│   └── services/
│       ├── crypto.service.ts
│       ├── storage.service.ts
│       ├── sync.service.ts
│       └── email.service.ts
├── src/                        # React renderer
│   ├── app/                    # App shell
│   │   ├── App.tsx
│   │   ├── Router.tsx
│   │   └── providers/
│   ├── modules/                # Feature modules
│   │   ├── family/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── types/
│   │   ├── calendar/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   ├── utils/
│   │   │   └── types/
│   │   ├── tasks/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── types/
│   │   └── email/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── stores/
│   │       └── types/
│   ├── shared/                 # Shared code
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Shared hooks
│   │   ├── lib/                # Utilities
│   │   ├── stores/             # Global stores
│   │   └── types/              # Shared types
│   ├── styles/                 # Global styles
│   └── index.tsx
├── tests/                      # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                    # Build scripts
├── .cursorrules                # Cursor AI rules
├── .eslintrc.cjs
├── .prettierrc
├── electron-builder.json
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Code Guidelines Summary

### TypeScript Standards

- Strict mode enabled, no `any` types
- Interface over type for objects
- Explicit return types for public functions
- Barrel exports per module

### React Patterns

- Functional components only
- Custom hooks for business logic
- Zustand for state management (integrates well with Yjs)
- React Query for async state (email fetching)

### Naming Conventions

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils: `camelCase.ts`
- Types: `PascalCase.types.ts`
- Stores: `camelCase.store.ts`

### Import Order

1. React/external libraries
2. Internal modules (absolute paths)
3. Relative imports
4. Styles

---

## Development Phases (Vertical Slices)

### Phase 1: Foundation (Weeks 1-2)

- Project scaffolding with Vite + Electron
- Base UI with shadcn/ui + Tailwind
- Yjs + LevelDB integration
- Basic encryption service setup

### Phase 2: Family Module (Weeks 3-4)

- Family creation flow
- QR code invitation system
- Device management
- Permission system foundation

### Phase 3: Calendar Module (Weeks 5-7)

- Calendar CRUD operations
- Event management with recurrence
- iCal import/export
- Calendar sharing with permissions

### Phase 4: Tasks Module (Weeks 8-9)

- Task list management
- Task CRUD with subtasks
- JSON import/export
- Assignment and due dates

### Phase 5: Email Module (Weeks 10-13)

- IMAP/SMTP integration
- Internal messaging system
- Shared inbox functionality
- Send-as permissions

### Phase 6: P2P Sync (Weeks 14-16)

- mDNS discovery implementation
- WebRTC data channels
- Yjs sync protocol
- Conflict visualization (if needed)

### Phase 7: Polish & Testing (Weeks 17-18)

- Comprehensive E2E tests
- Performance optimization
- Security audit
- Documentation finalization

---

## Documentation Files to Create

1. **[.cursorrules](.cursorrules)** - AI coding guidelines
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Detailed system architecture
3. **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Contribution guidelines
4. **[docs/SECURITY.md](docs/SECURITY.md)** - Security model documentation
5. **[docs/DATA-MODEL.md](docs/DATA-MODEL.md)** - Complete data schema
6. **[docs/SYNC-PROTOCOL.md](docs/SYNC-PROTOCOL.md)** - P2P sync documentation
7. **[README.md](README.md)** - Project overview and setup

---

## Next Steps

Upon approval, I will create all documentation files with detailed specifications including:

- Complete `.cursorrules` with project-specific guidelines
- Full architecture documentation with sequence diagrams
- Data model specifications with TypeScript interfaces
- Security model with encryption flow diagrams
- API contracts for IPC communication
- Testing strategy documentation