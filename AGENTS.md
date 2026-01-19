# DOFTool - Cursor AI Rules

## Project Overview

DOFTool is an offline-first, end-to-end encrypted Electron application for family collaboration featuring P2P synchronization via mDNS discovery, CRDT-based conflict resolution, and comprehensive Calendar, Tasks, and Email management.

## Tech Stack

- **Runtime**: Electron 33+
- **Frontend**: React 19, TypeScript 5.5+
- **Build**: Vite
- **Styling**: Tailwind CSS 4, shadcn/ui, Framer Motion
- **Data**: Yjs (CRDT), LevelDB (y-leveldb), y-webrtc
- **Crypto**: libsodium-wrappers, @noble/ed25519
- **Email**: imapflow (IMAP), nodemailer (SMTP)
- **Calendar**: ical.js, date-fns
- **State**: Zustand, React Query (TanStack Query)
- **Testing**: Vitest, React Testing Library, Playwright

---

## Code Style Guidelines

### TypeScript

- Enable strict mode in all files
- Never use `any` type - use `unknown` with type guards instead
- Prefer `interface` over `type` for object shapes
- Use explicit return types for all public/exported functions
- Use `const` assertions for literal types
- Prefer `satisfies` operator for type checking without widening

```typescript
// Good
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export function createEvent(data: Omit<CalendarEvent, 'id'>): CalendarEvent {
  return { ...data, id: crypto.randomUUID() };
}

// Bad
type CalendarEvent = {
  id: any;
  title: string;
};

export function createEvent(data) {
  return { ...data, id: crypto.randomUUID() };
}
```

### React Components

- Use functional components exclusively
- Extract business logic into custom hooks
- Keep components focused and under 150 lines
- Use composition over prop drilling
- Prefer controlled components for forms

```typescript
// Good - Component with extracted logic
export function CalendarView(): JSX.Element {
  const { events, selectedDate, handleDateSelect } = useCalendarView();

  return (
    <div className="calendar-container">
      <CalendarHeader date={selectedDate} />
      <CalendarGrid
        events={events}
        onDateSelect={handleDateSelect}
      />
    </div>
  );
}

// Bad - Logic mixed with presentation
export function CalendarView() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  // ... 200 lines of mixed logic and JSX
}
```

### File Naming Conventions

```
Components:     PascalCase.tsx          (CalendarGrid.tsx)
Hooks:          useCamelCase.ts         (useCalendarEvents.ts)
Utilities:      camelCase.ts            (dateHelpers.ts)
Types:          PascalCase.types.ts     (Calendar.types.ts)
Stores:         camelCase.store.ts      (calendar.store.ts)
Constants:      SCREAMING_SNAKE.ts      (CALENDAR_CONSTANTS.ts)
Tests:          *.test.ts / *.spec.ts   (CalendarGrid.test.tsx)
```

### Import Organization

Always organize imports in this order with blank lines between groups:

```typescript
// 1. React and external libraries
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// 2. Internal modules (absolute paths)
import { useFamily } from '@/modules/family/hooks/useFamily';
import { Button } from '@/shared/components/ui/Button';

// 3. Relative imports
import { CalendarHeader } from './CalendarHeader';
import { useCalendarStore } from './calendar.store';

// 4. Types (if separate)
import type { CalendarEvent } from './Calendar.types';

// 5. Styles (if any)
import './Calendar.css';
```

### Directory Structure Per Module

```
modules/calendar/
├── components/           # React components
│   ├── CalendarView.tsx
│   ├── CalendarGrid.tsx
│   ├── EventCard.tsx
│   └── index.ts         # Barrel export
├── hooks/               # Custom hooks
│   ├── useCalendarEvents.ts
│   ├── useEventMutation.ts
│   └── index.ts
├── stores/              # Zustand stores
│   └── calendar.store.ts
├── utils/               # Module utilities
│   ├── icalParser.ts
│   └── recurrence.ts
├── types/               # TypeScript types
│   └── Calendar.types.ts
└── index.ts             # Public API
```

---

## Architecture Patterns

### Electron IPC Communication

Always use typed IPC channels with a consistent naming convention:

```typescript
// electron/ipc/channels.ts
export const IPC_CHANNELS = {
  // Family
  FAMILY_CREATE: 'family:create',
  FAMILY_JOIN: 'family:join',
  FAMILY_LEAVE: 'family:leave',

  // Calendar
  CALENDAR_SYNC: 'calendar:sync',
  CALENDAR_IMPORT: 'calendar:import',
  CALENDAR_EXPORT: 'calendar:export',

  // Email
  EMAIL_FETCH: 'email:fetch',
  EMAIL_SEND: 'email:send',
} as const;

// Type-safe IPC invoke
export interface IPCHandlers {
  [IPC_CHANNELS.FAMILY_CREATE]: (name: string) => Promise<Family>;
  [IPC_CHANNELS.CALENDAR_SYNC]: () => Promise<void>;
}
```

### Yjs Document Structure

Organize Yjs documents by feature domain:

```typescript
// Yjs document structure
const ydoc = new Y.Doc();

// Each feature has its own Y.Map
const familyMap = ydoc.getMap('family');
const calendarsMap = ydoc.getMap('calendars');
const tasksMap = ydoc.getMap('tasks');
const messagesMap = ydoc.getMap('messages');

// Events within a calendar use Y.Array
const calendarEvents = calendarsMap.get('cal-123').get('events') as Y.Array<Event>;
```

### State Management with Zustand + Yjs

```typescript
// stores/calendar.store.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as Y from 'yjs';

interface CalendarStore {
  events: CalendarEvent[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  syncFromYjs: (yArray: Y.Array<CalendarEvent>) => void;
}

export const useCalendarStore = create<CalendarStore>()(
  subscribeWithSelector((set) => ({
    events: [],
    selectedDate: new Date(),
    setSelectedDate: (date) => set({ selectedDate: date }),
    syncFromYjs: (yArray) => set({ events: yArray.toArray() }),
  }))
);
```

---

## Security Guidelines

### Encryption

- All data at rest must be encrypted using libsodium
- Use XChaCha20-Poly1305 for symmetric encryption
- Use X25519 for key exchange
- Never store encryption keys in plain text
- Derive keys from family passphrase using Argon2id

```typescript
// Good - Proper encryption pattern
import sodium from 'libsodium-wrappers';

async function encryptData(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(data, nonce, key);
  return new Uint8Array([...nonce, ...ciphertext]);
}
```

### Sensitive Data Handling

- Never log sensitive data (keys, tokens, passwords)
- Clear sensitive data from memory after use
- Use secure comparison for tokens
- Validate all IPC inputs in main process

---

## Testing Requirements

### Unit Tests (Vitest)

- Test all utility functions
- Test custom hooks with renderHook
- Mock Electron IPC in renderer tests
- Aim for 80%+ coverage on business logic

```typescript
// utils/dateHelpers.test.ts
import { describe, it, expect } from 'vitest';
import { formatEventDate, isOverlapping } from './dateHelpers';

describe('dateHelpers', () => {
  describe('formatEventDate', () => {
    it('should format single-day events correctly', () => {
      const event = { start: new Date('2024-01-15'), end: new Date('2024-01-15') };
      expect(formatEventDate(event)).toBe('January 15, 2024');
    });
  });
});
```

### Component Tests (React Testing Library)

- Test user interactions, not implementation
- Use accessible queries (getByRole, getByLabelText)
- Test error states and loading states

````typescript
// CalendarGrid.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarGrid } from './CalendarGrid';

describe('CalendarGrid', () => {
  it('should highlight selected date', async () => {
    const user = userEvent.setup();
    render(<CalendarGrid events={[]} onDateSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /january 15/i }));

    expect(screen.getByRole('button', { name: /january 15/i }))
      .toHaveClass('selected');
  });
});

### E2E Tests (Playwright)

- Test critical user flows end-to-end
- Test offline functionality
- Test sync between multiple windows

## Unit Test Notes (Electron Services)

- **Vitest `vi.mock` hoisting**
  - `vi.mock()` is hoisted. Avoid referencing top-level variables inside a mock factory (can cause `Cannot access ... before initialization`).
  - Prefer defining the mock object inside the `vi.mock` factory and returning it.

- **Timers (`vi.useFakeTimers`) vs Node globals**
  - Be careful enabling fake timers in tests for services that rely on real `setTimeout`/`setInterval` (retry/backoff logic).
  - In `YjsService` tests, fake timers led to `TypeError: setTimeout is not a function`. Prefer real timers or tightly scoped fake timers with explicit `vi.useRealTimers()` cleanup.

- **LevelDB iteration APIs**
  - `StorageService.getKeysByPrefix` relies on `db.keys({ gte, lt })` returning an async iterable.
  - Mock `keys()` using `[Symbol.asyncIterator]`.
  - ESLint may complain about `async generator has no await`; consider implementing an async iterator via `Symbol.asyncIterator: () => ({ next: async () => ... })` instead of `async function*` when needed.

- **Yjs + y-leveldb persistence + lock files**
  - `YjsService.initialize()` may attempt stale lock removal and retry (with sleep). Tests should expect retries and ensure proper cleanup (`close()`) to avoid leaking timers.
  - Prefer using a real `Y.Doc` in tests for CRDT merge behavior; mock only persistence + filesystem.

- **`libsodium-wrappers` + Vitest ESM resolution**
  - `libsodium-wrappers` ESM import can fail under Vitest (`Cannot find module ... libsodium.mjs`).
  - Prefer unit tests with a `libsodium-wrappers` mock (factory-inline) unless the toolchain is adjusted to support that ESM build.

- **Mock typing + lint**
  - Avoid `any` in mocks; use explicit interfaces/types for callback signatures (e.g., `https.get` callbacks).
  - `@typescript-eslint/unbound-method` can trigger when passing around mock methods; prefer arrow functions for mocked methods or bind explicitly.
  - Keep import groups separated by an empty line to satisfy lint.

---

## Sync Service Unit Testing Patterns

When testing P2P sync services, use these established patterns:

#### Mock Factory Pattern for Complex Objects

Create factory functions that return fresh mock instances with event simulation helpers:

```typescript
// WebRTC/DataChannel mock with event triggers
function createMockDataChannel(): DataChannelLike & {
  _triggerOpen: () => void;
  _triggerMessage: (data: string) => void;
} {
  const handlers = new Map<string, EventListener>();
  const channel = {
    send: vi.fn(),
    close: vi.fn(),
    readyState: 'connecting' as RTCDataChannelState,
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      handlers.set(event, handler);
    }),
    // Event simulation helpers
    _triggerOpen: () => {
      channel.readyState = 'open';
      handlers.get('open')?.({} as Event);
    },
    _triggerMessage: (data: string) => {
      handlers.get('message')?.({ data } as MessageEvent);
    },
  };
  return channel;
}
````

#### Yjs Mocking Requirements

When mocking Yjs, include all commonly used functions:

```typescript
vi.mock('yjs', () => ({
  Doc: vi.fn(() => mockYDoc),
  encodeStateAsUpdate: vi.fn(() => new Uint8Array([1, 2, 3])),
  encodeStateVector: vi.fn(() => new Uint8Array([1])),
  applyUpdate: vi.fn(),
  mergeUpdates: vi.fn((updates: Uint8Array[]) => new Uint8Array(updates[0] ?? [])),
}));
```

#### Awareness Protocol Mocking

Include all required methods for y-protocols/awareness:

```typescript
const mockAwareness = {
  setLocalState: vi.fn(),
  setLocalStateField: vi.fn(),
  getLocalState: vi.fn(() => ({})),
  getStates: vi.fn(() => new Map()),
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
  clientID: 12345,
};
```

#### bonjour-service Mocking for mDNS

```typescript
function createMockBrowser(): EventEmitter & { stop: Mock } {
  const browser = new EventEmitter();
  (browser as EventEmitter & { stop: Mock }).stop = vi.fn();
  return browser as EventEmitter & { stop: Mock };
}

vi.mock('bonjour-service', () => ({
  Bonjour: vi.fn(() => ({
    publish: vi.fn(() => ({ stop: vi.fn() })),
    find: vi.fn(() => mockBrowser),
    destroy: vi.fn(),
  })),
}));
```

#### TCP Socket/Server Mocking

```typescript
function createMockSocket(): Socket & EventEmitter {
  const socket = new EventEmitter() as Socket & EventEmitter;
  socket.write = vi.fn(() => true);
  socket.destroy = vi.fn();
  socket.setEncoding = vi.fn();
  return socket;
}
```

#### Test File Import Order

Always organize test imports following project conventions:

```typescript
// 1. Node built-ins
import { EventEmitter } from 'events';

// 2. Test framework
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 3. Module under test
import { ServiceUnderTest } from './ServiceUnderTest';

// 4. Types
import type { SomeType } from './Types';
```

#### Common Testing Pitfalls

- **Async tests**: Use promises instead of `done()` callback (deprecated in Vitest)
- **Mock calls typing**: Cast mock.calls to specific types: `(mock.calls[0] as [ArgType])[0]`
- **ESLint unbound-method**: False positives with mocks - add `// eslint-disable-next-line` when needed
- **EventEmitter mocks**: Extend from Node's EventEmitter for proper event simulation
- **Module mocks**: Place `vi.mock()` calls before describe blocks (hoisted but clearer)

---

## React Component Unit Testing Notes

### Known jsdom Limitations

When writing unit tests with Vitest and jsdom for React components:

1. **Radix UI Select/Popover components**: `userEvent.click()` on Select triggers causes `TypeError: target.hasPointerCapture is not a function`. Avoid testing Select interactions directly; instead test that the Select renders correctly.

2. **Virtual scrolling (`@tanstack/react-virtual`)**: Not fully simulated in jsdom. Test list rendering without relying on virtualization behavior.

3. **Pointer events**: jsdom doesn't support `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`. Add to setup if needed:
   ```typescript
   Element.prototype.hasPointerCapture = vi.fn(() => false);
   Element.prototype.setPointerCapture = vi.fn();
   Element.prototype.releasePointerCapture = vi.fn();
   ```

### Component Test Structure

```typescript
/**
 * ComponentName - Unit tests
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ComponentName } from './ComponentName';
import type { SomeType } from './types';

// Mock data with full type compliance
const mockData: SomeType = {
  /* all required properties */
};

// Module mocks (hoisted)
vi.mock('./hooks/useSomething', () => ({
  useSomething: vi.fn(() => ({ data: mockData, isLoading: false })),
}));

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    /* ... */
  });
  describe('user interactions', () => {
    /* ... */
  });
  describe('edge cases', () => {
    /* ... */
  });
});
```

### Type-Safe Mock Data

Always include **all required properties** when creating mock data to avoid TypeScript errors:

```typescript
// Example: EmailAccountSettings mock with all nested properties
const mockAccount: EmailAccountSettings = {
  id: 'acc-1',
  email: 'test@example.com',
  displayName: 'Test',
  provider: 'gmail',
  incoming: {
    protocol: 'imap',
    host: 'imap.gmail.com',
    port: 993,
    encryption: 'ssl',
    authMethod: 'password',
    username: 'test@example.com',
    password: undefined,
    timeout: 30000,
    retry: { maxAttempts: 3, delay: 1000, backoffMultiplier: 2 },
  },
  outgoing: {
    host: 'smtp.gmail.com',
    port: 587,
    encryption: 'tls',
    authMethod: 'password',
    username: 'test@example.com',
    password: undefined,
    timeout: 30000,
    retry: { maxAttempts: 3, delay: 1000, backoffMultiplier: 2 },
    rateLimit: { maxPerMinute: 30, maxPerHour: 500 },
  },
  syncInterval: 15,
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

### Hook Mocking Patterns

```typescript
// Static mock (same for all tests in file)
vi.mock('../../hooks/useEmail', () => ({
  useEmail: vi.fn(() => ({
    accounts: mockAccounts,
    messages: mockMessages,
    isLoading: false,
    error: null,
  })),
}));

// Dynamic mock (change per test)
import { useEmail } from '../../hooks/useEmail';

it('should show loading state', () => {
  vi.mocked(useEmail).mockReturnValue({
    accounts: [],
    messages: [],
    isLoading: true,
    error: null,
  });
  render(<Component />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

### Testing Async Operations

```typescript
// Use waitFor for async state changes
await waitFor(() => {
  expect(mockCallback).toHaveBeenCalled();
});

// Use findBy* for elements that appear asynchronously
const element = await screen.findByText('Success');

// Always use user.setup() for userEvent
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');
```

### Avoiding Common Pitfalls

- **Don't test Select/Combobox interactions** in jsdom - test that they render
- **Don't rely on `require()` for dynamic mocks** - causes lint errors and type issues
- **Include all nested object properties** in mock data to satisfy TypeScript
- **Use `vi.clearAllMocks()` in `beforeEach`** to reset mock state between tests
- **Prefer `screen.getByRole`** over `getByTestId` for accessibility-focused tests

---

## UI/UX Guidelines

### Design System

- Use shadcn/ui components as base
- Follow warm, friendly aesthetic with soft colors
- Use consistent spacing (4px grid system)
- Ensure WCAG 2.1 AA accessibility

### Animation Guidelines

- Use Framer Motion for complex animations
- Keep animations under 300ms for interactions
- Use CSS transitions for simple state changes
- Respect `prefers-reduced-motion`

```typescript
// Good - Respects user preferences
import { motion, useReducedMotion } from 'framer-motion';

function AnimatedCard({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
    >
      {children}
    </motion.div>
  );
}
```

### Color Palette (Tailwind Config)

```typescript
// Warm, family-friendly colors
colors: {
  primary: {
    50: '#fef7ee',
    100: '#fdedd3',
    // ... warm orange palette
    600: '#ea580c',
  },
  secondary: {
    // ... soft teal for accents
  },
  background: '#fefdfb',
  foreground: '#1c1917',
}
```

---

## Performance Guidelines

- Lazy load feature modules with React.lazy
- Use virtual scrolling for long lists (emails, events)
- Debounce search inputs (300ms)
- Memoize expensive computations
- Use Web Workers for encryption operations

---

## Error Handling

```typescript
// Centralized error types
export class FamilySyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'FamilySyncError';
  }
}

export class EncryptionError extends FamilySyncError {
  constructor(message: string) {
    super(message, 'ENCRYPTION_ERROR', false);
  }
}

export class SyncError extends FamilySyncError {
  constructor(message: string) {
    super(message, 'SYNC_ERROR', true);
  }
}
```

---

## Git Commit Convention

Use conventional commits:

```
feat(calendar): add recurring event support
fix(sync): resolve conflict in concurrent edits
docs(readme): update installation instructions
refactor(email): extract IMAP connection logic
test(tasks): add unit tests for task filtering
chore(deps): update electron to v33
```

---

## Linting Rules & Best Practices

### TypeScript ESLint Rules

- **No floating promises**: Always handle Promise rejections with `.catch()`, `void` operator, or `await`
- **No misused promises**: Async functions in event handlers must be properly handled - use `.then()` or make handlers synchronous
- **Require await**: Remove `async` keyword from functions that don't use `await`
- **Explicit function return types**: All exported/public functions must have explicit return types
- **Prefer nullish coalescing**: Use `??` instead of `||` for null/undefined checks (safer than falsy checks)
- **No unsafe any**: Replace `any` types with proper TypeScript types or `unknown` with type guards
- **No unused variables**: Prefix unused parameters with `_` or remove them
- **No explicit any**: Avoid `any` type - use `unknown` for truly unknown values

### React ESLint Rules

- **JSX accessibility**: Interactive elements need keyboard support - use `<button>` instead of `<div onClick>`
- **No unescaped entities**: Use `&ldquo;`/`&rdquo;` instead of `"` in JSX text content
- **Controlled components**: Always use controlled inputs with proper state management

### Import Rules

- **No unresolved imports**: Ensure all imports can be resolved (check tsconfig paths and node_modules)
- **Consistent type imports**: Use `import type` for type-only imports
- **Proper import organization**: Group imports by React/external/internal/relative/types/styles

## Do NOT

- Use `any` type
- Store unencrypted sensitive data
- Make synchronous IPC calls from renderer
- Use inline styles (use Tailwind classes)
- Create components over 200 lines
- Skip error boundaries for async operations
- Ignore accessibility requirements (WCAG 2.1 AA)
- Commit with failing tests
- Leave floating promises unhandled
- Use `||` for null/undefined checks when `??` is more appropriate
- Make divs clickable without keyboard support
- Use unescaped quotes in JSX
