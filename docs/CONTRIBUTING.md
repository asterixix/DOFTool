# Contributing to DOFTool

Thank you for your interest in contributing to DOFTool! This document provides guidelines for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Code Style Guide](#code-style-guide)
5. [Git Workflow](#git-workflow)
6. [Pull Request Process](#pull-request-process)
7. [Testing Guidelines](#testing-guidelines)
8. [Documentation](#documentation)

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- No harassment, discrimination, or inappropriate behavior

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x (or pnpm >= 9.x)
- **Git** >= 2.40

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript Importer
- **React Developer Tools** (browser extension)

---

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/doftool/doftool.git
cd doftool
```


### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Git Hooks

```bash
npm run prepare
```

This installs Husky hooks for:
- Pre-commit: Lint staged files
- Commit-msg: Validate commit message format

### 4. Start Development Server

```bash
# Start Electron in development mode
npm run dev

# Or start renderer only (for UI work)
npm run dev:renderer
```

### 5. Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

---

## Code Style Guide

### TypeScript

#### General Rules

```typescript
// DO: Use explicit types for function parameters and returns
function calculateDuration(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}

// DON'T: Use 'any' type
function processData(data: any): any { /* BAD */ }

// DO: Use 'unknown' with type guards instead
function processData(data: unknown): ProcessedData {
  if (isValidInput(data)) {
    return transform(data);
  }
  throw new Error('Invalid input');
}
```

#### Interfaces vs Types

```typescript
// DO: Use interface for object shapes
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

// DO: Use type for unions, intersections, and primitives
type EventStatus = 'confirmed' | 'tentative' | 'cancelled';
type EventWithStatus = CalendarEvent & { status: EventStatus };
```

#### Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| Interfaces | PascalCase | `CalendarEvent` |
| Types | PascalCase | `EventStatus` |
| Functions | camelCase | `createEvent()` |
| Variables | camelCase | `eventList` |
| Constants | SCREAMING_SNAKE | `MAX_EVENTS` |
| Components | PascalCase | `EventCard` |
| Hooks | useCamelCase | `useEvents()` |
| Files (components) | PascalCase.tsx | `EventCard.tsx` |
| Files (utils) | camelCase.ts | `dateHelpers.ts` |

### React Components

#### Component Structure

```typescript
// src/modules/calendar/components/EventCard.tsx

import { memo } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/components/ui/Badge';

import { useEventActions } from '../hooks/useEventActions';
import type { CalendarEvent } from '../types/Calendar.types';

// Props interface above component
interface EventCardProps {
  event: CalendarEvent;
  isSelected?: boolean;
  onSelect?: (event: CalendarEvent) => void;
  className?: string;
}

// Named export (not default)
export const EventCard = memo(function EventCard({
  event,
  isSelected = false,
  onSelect,
  className,
}: EventCardProps): JSX.Element {
  const { handleEdit, handleDelete } = useEventActions(event.id);

  return (
    <motion.div
      className={cn(
        'rounded-lg border p-4',
        isSelected && 'ring-2 ring-primary',
        className
      )}
      whileHover={{ scale: 1.02 }}
      onClick={() => onSelect?.(event)}
    >
      <h3 className="font-semibold">{event.title}</h3>
      <Badge variant="secondary">{event.status}</Badge>
    </motion.div>
  );
});
```

#### Hooks

```typescript
// src/modules/calendar/hooks/useEvents.ts

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { calendarApi } from '../api/calendar.api';
import type { CalendarEvent, CreateEventInput } from '../types/Calendar.types';

interface UseEventsOptions {
  calendarId: string;
  startDate: Date;
  endDate: Date;
}

interface UseEventsReturn {
  events: CalendarEvent[];
  isLoading: boolean;
  error: Error | null;
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent>;
  updateEvent: (id: string, input: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export function useEvents({
  calendarId,
  startDate,
  endDate,
}: UseEventsOptions): UseEventsReturn {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['events', calendarId, startDate, endDate],
    queryFn: () => calendarApi.getEvents(calendarId, startDate, endDate),
  });

  const createMutation = useMutation({
    mutationFn: calendarApi.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', calendarId] });
    },
  });

  const createEvent = useCallback(
    (input: CreateEventInput) => createMutation.mutateAsync(input),
    [createMutation]
  );

  return {
    events,
    isLoading,
    error: error as Error | null,
    createEvent,
    updateEvent: useCallback(/* ... */),
    deleteEvent: useCallback(/* ... */),
  };
}
```

### CSS / Tailwind

#### Class Organization

```tsx
// Order: Layout → Spacing → Sizing → Typography → Colors → Effects → States

<div
  className={cn(
    // Layout
    'flex flex-col items-center justify-between',
    // Spacing
    'gap-4 p-6 mx-auto',
    // Sizing
    'w-full max-w-md h-auto',
    // Typography
    'text-base font-medium',
    // Colors
    'bg-background text-foreground',
    // Borders & Effects
    'rounded-lg border shadow-sm',
    // States & Transitions
    'hover:shadow-md focus:ring-2',
    'transition-shadow duration-200',
    // Conditional
    isActive && 'ring-2 ring-primary',
    className
  )}
>
```

#### Custom Styles

Use Tailwind utilities whenever possible. For complex styles, use CSS modules:

```css
/* EventCard.module.css */
.eventCard {
  /* Only when Tailwind can't express it */
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 0.1),
    hsl(var(--secondary) / 0.1)
  );
}
```

### File Organization

```
src/
├── app/                      # Application shell
│   ├── App.tsx
│   ├── Router.tsx
│   └── providers/
│       ├── ThemeProvider.tsx
│       └── QueryProvider.tsx
│
├── modules/                  # Feature modules
│   └── calendar/
│       ├── components/       # React components
│       │   ├── CalendarView.tsx
│       │   ├── EventCard.tsx
│       │   └── index.ts      # Barrel export
│       ├── hooks/            # Custom hooks
│       │   ├── useEvents.ts
│       │   └── index.ts
│       ├── stores/           # Zustand stores
│       │   └── calendar.store.ts
│       ├── api/              # API layer
│       │   └── calendar.api.ts
│       ├── utils/            # Module utilities
│       │   └── dateHelpers.ts
│       ├── types/            # TypeScript types
│       │   └── Calendar.types.ts
│       └── index.ts          # Public module API
│
├── shared/                   # Shared code
│   ├── components/
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/
│   ├── lib/
│   └── types/
│
└── styles/                   # Global styles
    └── globals.css
```

### Import Order

Configure your editor to auto-sort imports:

```typescript
// 1. React and built-in modules
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// 2. External libraries (alphabetical)
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Internal absolute imports (@/ alias)
import { Button } from '@/shared/components/ui/Button';
import { useToast } from '@/shared/hooks/useToast';
import { cn } from '@/shared/lib/utils';

// 4. Relative imports (parent first, then siblings)
import { useCalendarStore } from '../stores/calendar.store';
import { EventCard } from './EventCard';

// 5. Types (always last, with 'type' keyword)
import type { CalendarEvent } from '../types/Calendar.types';

// 6. Styles (if any)
import styles from './Calendar.module.css';
```

---

## Git Workflow

### Branch Naming

```
feature/calendar-recurring-events
fix/sync-connection-timeout
refactor/email-service-structure
docs/update-api-reference
test/add-calendar-unit-tests
chore/update-dependencies
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |

#### Examples

```bash
# Feature
feat(calendar): add recurring event support

# Bug fix
fix(sync): resolve timeout on large document sync

Fixes #123

# Breaking change
feat(api)!: change event date format to ISO 8601

BREAKING CHANGE: Event dates are now ISO strings instead of timestamps
```

### Workflow

1. **Create branch** from `main`
2. **Make changes** with atomic commits
3. **Write tests** for new functionality
4. **Update docs** if needed
5. **Create PR** with description
6. **Address review** feedback
7. **Squash and merge** when approved

---

## Pull Request Process

### Before Submitting

- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Linter shows no errors
- [ ] New code has tests
- [ ] Documentation updated
- [ ] Commits follow convention
- [ ] PR description is complete

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have added tests
- [ ] I have updated documentation
```

### Review Process

1. **Automated checks** must pass (CI, lint, tests)
2. **At least one approval** required
3. **No unresolved conversations**
4. **Squash and merge** to `main`

---

## Testing Guidelines

### Test File Location

```
src/
└── modules/
    └── calendar/
        ├── components/
        │   ├── EventCard.tsx
        │   └── EventCard.test.tsx    # Co-located test
        └── hooks/
            ├── useEvents.ts
            └── useEvents.test.ts

tests/
├── e2e/                              # E2E tests
│   └── calendar.spec.ts
└── integration/                      # Integration tests
    └── sync.test.ts
```

### Unit Tests (Vitest)

```typescript
// EventCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { EventCard } from './EventCard';

const mockEvent = {
  id: '1',
  title: 'Team Meeting',
  start: new Date('2024-01-15T10:00:00'),
  end: new Date('2024-01-15T11:00:00'),
  status: 'confirmed',
};

describe('EventCard', () => {
  it('renders event title', () => {
    render(<EventCard event={mockEvent} />);
    
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    
    render(<EventCard event={mockEvent} onSelect={handleSelect} />);
    
    await user.click(screen.getByRole('article'));
    
    expect(handleSelect).toHaveBeenCalledWith(mockEvent);
  });

  it('shows selected state when isSelected is true', () => {
    render(<EventCard event={mockEvent} isSelected />);
    
    expect(screen.getByRole('article')).toHaveClass('ring-2');
  });
});
```

### Hook Tests

```typescript
// useEvents.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';

import { useEvents } from './useEvents';
import { calendarApi } from '../api/calendar.api';

vi.mock('../api/calendar.api');

const wrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useEvents', () => {
  it('fetches events for date range', async () => {
    const mockEvents = [{ id: '1', title: 'Event 1' }];
    vi.mocked(calendarApi.getEvents).mockResolvedValue(mockEvents);

    const { result } = renderHook(
      () => useEvents({
        calendarId: 'cal-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents);
    });
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/calendar.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar');
  });

  test('should create a new event', async ({ page }) => {
    // Click on a date
    await page.click('[data-date="2024-01-15"]');
    
    // Fill event form
    await page.fill('[name="title"]', 'New Event');
    await page.fill('[name="startTime"]', '10:00');
    await page.fill('[name="endTime"]', '11:00');
    
    // Save event
    await page.click('button:has-text("Save")');
    
    // Verify event appears
    await expect(page.locator('.event-card:has-text("New Event")')).toBeVisible();
  });

  test('should sync events between two windows', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    await page1.goto('/calendar');
    await page2.goto('/calendar');
    
    // Create event in page1
    await page1.click('[data-date="2024-01-15"]');
    await page1.fill('[name="title"]', 'Synced Event');
    await page1.click('button:has-text("Save")');
    
    // Verify it appears in page2
    await expect(
      page2.locator('.event-card:has-text("Synced Event")')
    ).toBeVisible({ timeout: 5000 });
  });
});
```

### Test Coverage Requirements

| Area | Minimum Coverage |
|------|-----------------|
| Utilities | 90% |
| Hooks | 80% |
| Components | 70% |
| Overall | 75% |

---

## Documentation

### Code Comments

```typescript
/**
 * Creates a recurring event series based on the provided rule.
 * 
 * @param event - The base event to recur
 * @param rule - RFC 5545 RRULE compliant recurrence rule
 * @returns Array of event instances for the next 2 years
 * 
 * @example
 * ```typescript
 * const events = expandRecurrence(baseEvent, {
 *   frequency: 'weekly',
 *   interval: 1,
 *   byDay: ['MO', 'WE', 'FR'],
 *   count: 10,
 * });
 * ```
 */
export function expandRecurrence(
  event: CalendarEvent,
  rule: RecurrenceRule
): CalendarEvent[] {
  // Implementation...
}
```

### README Files

Each module should have a README:

```markdown
# Calendar Module

## Overview
The calendar module provides...

## Components
- `CalendarView` - Main calendar container
- `EventCard` - Individual event display

## Hooks
- `useEvents(options)` - Fetch and manage events
- `useCalendarStore()` - Calendar state management

## Usage
```tsx
import { CalendarView, useEvents } from '@/modules/calendar';

function MyCalendar() {
  const { events } = useEvents({ calendarId: '...' });
  return <CalendarView events={events} />;
}
```
```

---

## Questions?

- Open a [Discussion](https://github.com/familysync/familysync/discussions)
- Join our [Discord](https://discord.gg/doftool)
- Email: contributors@doftool.app
