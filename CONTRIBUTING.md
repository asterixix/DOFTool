# Contributing to DOFTool

Thank you for your interest in contributing to DOFTool! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Security](#security)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **Git** >= 2.40

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/DOFTool.git
cd DOFTool

# Install dependencies
npm install

# Start development server
npm run dev
```

### Project Structure

```
DOFTool/
├── electron/               # Electron main process
│   ├── main.ts             # Main entry point
│   ├── preload.ts          # Preload script (IPC bridge)
│   └── services/           # Core services (crypto, sync, storage)
├── src/                    # React renderer
│   ├── app/                # App shell, routing, providers
│   ├── components/ui/      # Shared UI components (shadcn/ui)
│   ├── hooks/              # Shared React hooks
│   └── modules/            # Feature modules
│       ├── family/         # Family management
│       ├── calendar/       # Calendar feature
│       ├── tasks/          # Tasks feature
│       ├── email/          # Email client
│       └── sync/           # Sync status
├── docs/                   # Technical documentation
└── tests/                  # Test files
```

---

## Development Workflow

1. **Create a branch** from `main` for your work:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make your changes** following our [code style guidelines](#code-style-guidelines)

3. **Run tests and linting**:

   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```

4. **Commit your changes** using [conventional commits](#commit-convention)

5. **Push and create a Pull Request**

---

## Code Style Guidelines

### TypeScript

- Enable strict mode in all files
- **Never use `any`** - use `unknown` with type guards instead
- Prefer `interface` over `type` for object shapes
- Use explicit return types for all exported functions
- Use `const` assertions for literal types

```typescript
// ✅ Good
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export function createEvent(data: Omit<CalendarEvent, 'id'>): CalendarEvent {
  return { ...data, id: crypto.randomUUID() };
}

// ❌ Bad
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
// ✅ Good - Component with extracted logic
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
```

### File Naming Conventions

| Type       | Convention            | Example                 |
| ---------- | --------------------- | ----------------------- |
| Components | PascalCase.tsx        | `CalendarGrid.tsx`      |
| Hooks      | useCamelCase.ts       | `useCalendarEvents.ts`  |
| Utilities  | camelCase.ts          | `dateHelpers.ts`        |
| Types      | PascalCase.types.ts   | `Calendar.types.ts`     |
| Stores     | camelCase.store.ts    | `calendar.store.ts`     |
| Constants  | SCREAMING_SNAKE.ts    | `CALENDAR_CONSTANTS.ts` |
| Tests      | _.test.ts / _.spec.ts | `CalendarGrid.test.tsx` |

### Import Organization

Always organize imports in this order with blank lines between groups:

```typescript
// 1. React and external libraries
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// 2. Internal modules (absolute paths)
import { useFamily } from '@/modules/family/hooks/useFamily';
import { Button } from '@/components/ui/Button';

// 3. Relative imports
import { CalendarHeader } from './CalendarHeader';
import { useCalendarStore } from './calendar.store';

// 4. Types (if separate)
import type { CalendarEvent } from './Calendar.types';
```

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Code style (formatting, semicolons, etc.)               |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or updating tests                                |
| `chore`    | Maintenance tasks (deps, build, etc.)                   |

### Examples

```
feat(calendar): add recurring event support
fix(sync): resolve conflict in concurrent edits
docs(readme): update installation instructions
refactor(email): extract IMAP connection logic
test(tasks): add unit tests for task filtering
chore(deps): update electron to v33
```

---

## Pull Request Process

1. **Before submitting:**
   - Ensure all tests pass: `npm run test`
   - Ensure linting passes: `npm run lint`
   - Ensure types check: `npm run typecheck`
   - Update documentation if needed

2. **PR Title:** Use conventional commit format

3. **PR Description:** Include:
   - What changes were made and why
   - Screenshots/videos for UI changes
   - Breaking changes (if any)
   - Related issue numbers

4. **Review Process:**
   - All PRs require at least one approval
   - Address review feedback promptly
   - Keep PRs focused and reasonably sized

---

## Testing

### Unit Tests (Vitest)

```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

- Test all utility functions
- Test custom hooks with `renderHook`
- Mock Electron IPC in renderer tests
- Aim for 80%+ coverage on business logic

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

- Test critical user flows end-to-end
- Test offline functionality
- Test sync between multiple windows

### Writing Tests

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

---

## Security

### Sensitive Data Handling

- **Never log sensitive data** (keys, tokens, passwords)
- Clear sensitive data from memory after use
- Use secure comparison for tokens
- Validate all IPC inputs in main process

### Encryption Guidelines

- All data at rest must be encrypted using libsodium
- Use XChaCha20-Poly1305 for symmetric encryption
- Use X25519 for key exchange
- Never store encryption keys in plain text

For more details, see [docs/SECURITY.md](docs/SECURITY.md).

### Reporting Security Issues

**Do not open public issues for security vulnerabilities.**

Please report security issues privately via:

- [GitHub Security Advisories](https://github.com/asterixix/DOFTool/security/advisories/new)
- Email: artur@sendyka.dev

---

## Questions?

- Open a [GitHub Discussion](https://github.com/asterixix/DOFTool/discussions) for questions
- Check existing issues before opening new ones
- Read the [documentation](docs/) for technical details

Thank you for contributing to DOFTool!
