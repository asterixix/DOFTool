# FamilySync - AI Copilot Instructions

FamilySync is an offline-first, E2EE Electron app for family collaboration with P2P sync via Yjs CRDTs. All data lives locally, syncs automatically over mDNS-discovered WebRTC connections.

## Architecture Overview

**Three-process Electron architecture:**
- **Main process** ([electron/main.ts](../electron/main.ts)): Runs services (Yjs, Encryption, Storage, Email)
- **Preload** ([electron/preload.ts](../electron/preload.ts)): Exposes typed IPC to renderer via `window.electronAPI`
- **Renderer** ([src/](../src/)): React 19 app with feature modules

**Data flow:** React UI → Zustand store → IPC → Main process → Yjs document → LevelDB persistence → WebRTC sync to peers

Key insight: **Yjs handles all sync/conflicts automatically**. Never manually merge data - Yjs CRDTs guarantee convergence.

## Critical Patterns

### 1. Yjs Document Structure ([YjsService.ts](../electron/services/YjsService.ts))
Every entity type has its own `Y.Map` in the doc:
```typescript
family: Y.Map<Family>
calendars: Y.Map<Calendar>
events: Y.Map<CalendarEvent>
tasks: Y.Map<Task>
// Never use Y.Text or nested Maps - keep flat for sync efficiency
```

**Lock file handling**: Dev mode restarts frequently. `YjsService` implements aggressive lock cleanup with 5 retries and 2s delays. Always call `close()` to release locks properly.

### 2. Feature Module Structure ([modules/calendar/](../src/modules/calendar/))
```
modules/{feature}/
├── components/      # UI only, no business logic
├── hooks/          # useCalendar.ts - main hook orchestrating all operations
├── stores/         # calendar.store.ts - Zustand with Yjs binding
├── types/          # Calendar.types.ts - strict TypeScript interfaces
└── utils/          # Pure functions (dateHelpers, recurrence, ical)
```

Pattern: Components call hooks → Hooks update Zustand → Zustand triggers IPC → Main process updates Yjs → Yjs syncs automatically.

### 3. Electron IPC ([electron/preload.ts](../electron/preload.ts))
**Always use typed channels**:
```typescript
// In preload.ts
calendar: {
  getAll: () => ipcRenderer.invoke('calendar:get-all'),
  createEvent: (data) => ipcRenderer.invoke('calendar:create-event', data)
}
// Never call ipcRenderer directly from renderer
```

### 4. State Management Pattern ([calendar.store.ts](../src/modules/calendar/stores/calendar.store.ts))
```typescript
// Zustand stores for UI state + Yjs data mirroring
interface CalendarStore {
  events: CalendarEvent[];           // Mirror of Yjs data
  currentView: 'month' | 'week';     // UI state
  syncFromYjs: (yMap) => void;       // Bind to Yjs changes
}
```

React Query for async operations (email fetching), Zustand for everything else.

### 5. Recurring Events ([recurrence.ts](../src/modules/calendar/utils/recurrence.ts))
**RFC 5545 RRULEs** stored in Yjs, expanded client-side for display:
```typescript
expandRecurringEvent(event, startRange, endRange) 
// Returns ExpandedEvent[] - never store instances
```

### 6. Encryption ([EncryptionService.ts](../electron/services/EncryptionService.ts))
**All data encrypted at rest with XChaCha20-Poly1305**. Family passphrase → Argon2id → master key. 
- Yjs updates encrypted before WebRTC transmission
- Email stored encrypted in LevelDB
- Keys never logged, cleared after use

## Common Tasks

**Add new calendar event:**
1. User creates event in UI → `useCalendar().createEvent(input)`
2. Hook validates → calls `window.electronAPI.calendar.createEvent(data)`
3. Main process receives IPC → gets Yjs `events` map → `eventsMap.set(id, event)`
4. Yjs auto-persists to LevelDB + broadcasts to connected peers
5. Hook calls `loadEvents()` to refresh UI from Yjs state

**Debug sync issues:**
- Check console for "Lock file" errors → `YjsService.forceUnlock()` in dev
- Verify mDNS discovery: peers on same subnet? Firewall blocking multicast?
- Check Yjs state vector encoding in WebRTC messages (binary, not JSON)

## Dev Workflow

```bash
npm run dev              # Starts Vite dev server, then Electron
npm test                 # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
npm run lint:fix         # Fix ESLint + Prettier issues
```

**Hot reload:** Renderer hot-reloads. Main process requires full restart (handled by vite-plugin-electron with 1s delay to prevent lock conflicts).

## Key Files to Read First
1. [AGENTS.md](../AGENTS.md) - Full style guide and conventions
2. [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - Component diagrams and data flows
3. [DATA-MODEL.md](../docs/DATA-MODEL.md) - All TypeScript interfaces
4. [SYNC-PROTOCOL.md](../docs/SYNC-PROTOCOL.md) - mDNS discovery and WebRTC setup
5. [calendar.store.ts](../src/modules/calendar/stores/calendar.store.ts) - Canonical Zustand pattern
6. [useCalendar.ts](../src/modules/calendar/hooks/useCalendar.ts) - Canonical hook pattern

## Code Style (Enforced by ESLint)

- **TypeScript strict mode**: Never `any`, use `unknown` with type guards
- **Explicit return types** on all exported functions
- **Prefer `??` over `||`** for null checks (safer)
- **No floating promises**: Always `await`, `.catch()`, or `void` prefix
- **Import order**: React/external → internal (`@/`) → relative → types → styles
- **Component size**: Max 150 lines. Extract hooks if larger.
- **Accessibility**: Use `<button>` not `<div onClick>`. WCAG 2.1 AA required.

## Common Pitfalls

❌ **Don't** store Yjs data in React state - use Zustand bound to Yjs observers  
❌ **Don't** manually merge conflicts - Yjs CRDTs handle this automatically  
❌ **Don't** make synchronous IPC calls from renderer - always `invoke()` with Promises  
❌ **Don't** forget to call `YjsService.close()` on shutdown - causes lock file errors  
❌ **Don't** use inline styles - Tailwind classes only (shadcn/ui components)  
❌ **Don't** log sensitive data (keys, passwords, tokens)  

✅ **Do** read `AGENTS.md` for full linting rules before contributing  
✅ **Do** use `expandRecurringEvent()` for displaying recurrence - never store instances  
✅ **Do** handle errors with custom `FamilySyncError` classes (see AGENTS.md)  
✅ **Do** test with Vitest (unit) and Playwright (E2E) - see [tests/](../tests/)  

## When You're Stuck

1. **Yjs sync not working?** Check [SYNC-PROTOCOL.md](../docs/SYNC-PROTOCOL.md) WebRTC flow
2. **Type errors?** See [DATA-MODEL.md](../docs/DATA-MODEL.md) for all interfaces
3. **Component patterns unclear?** Study existing modules: [calendar/](../src/modules/calendar/), [family/](../src/modules/family/)
4. **Build fails?** Check [vite.config.ts](../vite.config.ts) for libsodium/native handling
5. **E2E tests flaky?** See [playwright.config.ts](../playwright.config.ts) for Electron-specific setup

**Philosophy:** Local-first, zero-trust, offline-capable. All decisions favor data sovereignty over convenience.
