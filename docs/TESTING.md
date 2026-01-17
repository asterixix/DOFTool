# DOFTool Testing Guide

This guide covers testing practices, tools, and guidelines for DOFTool development.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Stack](#testing-stack)
3. [Test Structure](#test-structure)
4. [Unit Testing](#unit-testing)
5. [Component Testing](#component-testing)
6. [Hook Testing](#hook-testing)
7. [E2E Testing](#e2e-testing)
8. [Mocking](#mocking)
9. [Coverage](#coverage)
10. [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

DOFTool follows these testing principles:

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Prefer integration over isolation** - Test components with their dependencies when practical
3. **Write tests first for bugs** - Every bug fix should include a regression test
4. **Keep tests fast** - Unit tests should run in milliseconds
5. **Make tests readable** - Tests are documentation

### Testing Pyramid

```
          ┌─────────┐
          │   E2E   │  Few, slow, high confidence
          ├─────────┤
          │Component│  Some, moderate speed
          ├─────────┤
          │  Unit   │  Many, fast, focused
          └─────────┘
```

---

## Testing Stack

| Tool                            | Purpose                     |
| ------------------------------- | --------------------------- |
| **Vitest**                      | Unit and component testing  |
| **React Testing Library**       | Component testing utilities |
| **Playwright**                  | End-to-end testing          |
| **MSW**                         | API mocking                 |
| **@testing-library/user-event** | User interaction simulation |

---

## Test Structure

### File Organization

```
src/
├── modules/
│   └── calendar/
│       ├── components/
│       │   ├── CalendarGrid.tsx
│       │   └── CalendarGrid.test.tsx    # Co-located test
│       ├── hooks/
│       │   ├── useCalendarEvents.ts
│       │   └── useCalendarEvents.test.ts
│       └── utils/
│           ├── dateHelpers.ts
│           └── dateHelpers.test.ts
└── tests/
    └── e2e/
        ├── calendar.spec.ts
        └── tasks.spec.ts
```

### Naming Conventions

| Type           | Pattern      | Example                 |
| -------------- | ------------ | ----------------------- |
| Unit test      | `*.test.ts`  | `dateHelpers.test.ts`   |
| Component test | `*.test.tsx` | `CalendarGrid.test.tsx` |
| E2E test       | `*.spec.ts`  | `calendar.spec.ts`      |

---

## Unit Testing

### Running Unit Tests

```bash
# Run all tests
npm run test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific file
npm run test -- dateHelpers.test.ts
```

### Writing Unit Tests

```typescript
// utils/dateHelpers.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { formatEventDate, isOverlapping, getWeekDays } from './dateHelpers';

describe('dateHelpers', () => {
  describe('formatEventDate', () => {
    it('formats single-day events correctly', () => {
      const event = {
        start: new Date('2024-01-15T10:00:00'),
        end: new Date('2024-01-15T11:00:00'),
      };

      expect(formatEventDate(event)).toBe('January 15, 2024');
    });

    it('formats multi-day events with range', () => {
      const event = {
        start: new Date('2024-01-15'),
        end: new Date('2024-01-17'),
      };

      expect(formatEventDate(event)).toBe('January 15 - 17, 2024');
    });

    it('handles all-day events', () => {
      const event = {
        start: new Date('2024-01-15'),
        end: new Date('2024-01-15'),
        allDay: true,
      };

      expect(formatEventDate(event)).toBe('January 15, 2024 (All day)');
    });
  });

  describe('isOverlapping', () => {
    it('returns true for overlapping time ranges', () => {
      const range1 = { start: new Date('2024-01-15T10:00'), end: new Date('2024-01-15T12:00') };
      const range2 = { start: new Date('2024-01-15T11:00'), end: new Date('2024-01-15T13:00') };

      expect(isOverlapping(range1, range2)).toBe(true);
    });

    it('returns false for non-overlapping ranges', () => {
      const range1 = { start: new Date('2024-01-15T10:00'), end: new Date('2024-01-15T11:00') };
      const range2 = { start: new Date('2024-01-15T12:00'), end: new Date('2024-01-15T13:00') };

      expect(isOverlapping(range1, range2)).toBe(false);
    });
  });
});
```

### Test Utilities

```typescript
// tests/utils/testHelpers.ts
import { vi } from 'vitest';

export function createMockEvent(overrides = {}) {
  return {
    id: 'event-1',
    title: 'Test Event',
    start: new Date('2024-01-15T10:00:00'),
    end: new Date('2024-01-15T11:00:00'),
    calendarId: 'cal-1',
    familyId: 'family-1',
    allDay: false,
    ...overrides,
  };
}

export function createMockTask(overrides = {}) {
  return {
    id: 'task-1',
    title: 'Test Task',
    status: 'todo',
    priority: 'medium',
    taskListId: 'list-1',
    familyId: 'family-1',
    ...overrides,
  };
}
```

---

## Component Testing

### Setup

```typescript
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Electron API
vi.mock('@/lib/electron', () => ({
  electronAPI: {
    calendar: {
      list: vi.fn(),
      create: vi.fn(),
    },
    // ... other mocks
  },
}));
```

### Writing Component Tests

```typescript
// components/CalendarGrid.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarGrid } from './CalendarGrid';
import { createMockEvent } from '@/tests/utils/testHelpers';

describe('CalendarGrid', () => {
  const mockOnDateSelect = vi.fn();
  const mockOnEventClick = vi.fn();

  const defaultProps = {
    events: [],
    selectedDate: new Date('2024-01-15'),
    onDateSelect: mockOnDateSelect,
    onEventClick: mockOnEventClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the current month', () => {
    render(<CalendarGrid {...defaultProps} />);

    expect(screen.getByText('January 2024')).toBeInTheDocument();
  });

  it('highlights the selected date', () => {
    render(<CalendarGrid {...defaultProps} />);

    const selectedDay = screen.getByRole('button', { name: /15/i });
    expect(selectedDay).toHaveClass('selected');
  });

  it('calls onDateSelect when clicking a date', async () => {
    const user = userEvent.setup();
    render(<CalendarGrid {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /20/i }));

    expect(mockOnDateSelect).toHaveBeenCalledWith(
      expect.objectContaining({ getDate: expect.any(Function) })
    );
  });

  it('displays events on their dates', () => {
    const events = [
      createMockEvent({ title: 'Team Meeting', start: new Date('2024-01-15') }),
    ];

    render(<CalendarGrid {...defaultProps} events={events} />);

    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  it('calls onEventClick when clicking an event', async () => {
    const user = userEvent.setup();
    const events = [createMockEvent({ id: 'event-1', title: 'Team Meeting' })];

    render(<CalendarGrid {...defaultProps} events={events} />);

    await user.click(screen.getByText('Team Meeting'));

    expect(mockOnEventClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'event-1' })
    );
  });

  it('navigates to previous month', async () => {
    const user = userEvent.setup();
    render(<CalendarGrid {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /previous/i }));

    expect(screen.getByText('December 2023')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(<CalendarGrid {...defaultProps} events={[]} />);

    // Verify no event elements are rendered
    expect(screen.queryByRole('button', { name: /event/i })).not.toBeInTheDocument();
  });
});
```

### Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<CalendarGrid {...defaultProps} />);

  const results = await axe(container);

  expect(results).toHaveNoViolations();
});
```

---

## Hook Testing

```typescript
// hooks/useCalendarEvents.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCalendarEvents } from './useCalendarEvents';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCalendarEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches events for the given date range', async () => {
    const mockEvents = [createMockEvent()];
    vi.mocked(electronAPI.calendar.events.list).mockResolvedValue(mockEvents);

    const { result } = renderHook(
      () => useCalendarEvents({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockEvents);
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(
      () => useCalendarEvents({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('handles errors gracefully', async () => {
    vi.mocked(electronAPI.calendar.events.list).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(
      () => useCalendarEvents({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Network error');
  });
});
```

---

## E2E Testing

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test file
npm run test:e2e -- calendar.spec.ts

# Run in headed mode (see browser)
npm run test:e2e -- --headed
```

### Writing E2E Tests

```typescript
// tests/e2e/calendar.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Calendar', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to calendar
    await page.goto('/');
    await page.click('[data-testid="nav-calendar"]');
  });

  test('creates a new event', async ({ page }) => {
    // Click on a date
    await page.click('[data-date="2024-01-15"]');

    // Click new event button
    await page.click('[data-testid="new-event-button"]');

    // Fill in event details
    await page.fill('[name="title"]', 'Team Meeting');
    await page.fill('[name="startTime"]', '10:00');
    await page.fill('[name="endTime"]', '11:00');

    // Save
    await page.click('[data-testid="save-event"]');

    // Verify event appears
    await expect(page.locator('text=Team Meeting')).toBeVisible();
  });

  test('edits an existing event', async ({ page }) => {
    // Click on existing event
    await page.click('text=Existing Event');

    // Click edit
    await page.click('[data-testid="edit-event"]');

    // Update title
    await page.fill('[name="title"]', 'Updated Event');

    // Save
    await page.click('[data-testid="save-event"]');

    // Verify update
    await expect(page.locator('text=Updated Event')).toBeVisible();
  });

  test('deletes an event', async ({ page }) => {
    // Click on event
    await page.click('text=Event to Delete');

    // Click delete
    await page.click('[data-testid="delete-event"]');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');

    // Verify removed
    await expect(page.locator('text=Event to Delete')).not.toBeVisible();
  });

  test('navigates between months', async ({ page }) => {
    // Verify current month
    await expect(page.locator('text=January 2024')).toBeVisible();

    // Go to next month
    await page.click('[data-testid="next-month"]');

    // Verify new month
    await expect(page.locator('text=February 2024')).toBeVisible();

    // Go back
    await page.click('[data-testid="prev-month"]');

    // Verify original month
    await expect(page.locator('text=January 2024')).toBeVisible();
  });
});
```

### E2E Test Utilities

```typescript
// tests/e2e/utils/helpers.ts
import { Page } from '@playwright/test';

export async function createFamily(page: Page, name: string) {
  await page.click('text=Create Family');
  await page.fill('[name="familyName"]', name);
  await page.fill('[name="displayName"]', 'Test User');
  await page.fill('[name="passphrase"]', 'test-passphrase-12345');
  await page.click('[data-testid="create-family-submit"]');
}

export async function navigateTo(page: Page, section: 'calendar' | 'tasks' | 'settings') {
  await page.click(`[data-testid="nav-${section}"]`);
}
```

---

## Mocking

### Mocking Electron IPC

```typescript
// tests/mocks/electronAPI.ts
import { vi } from 'vitest';

export const mockElectronAPI = {
  family: {
    create: vi.fn(),
    join: vi.fn(),
    member: {
      list: vi.fn().mockResolvedValue([]),
    },
  },
  calendar: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    events: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
  },
  sync: {
    status: vi.fn().mockResolvedValue({ status: 'synced' }),
    onStatusChange: vi.fn(),
  },
};

vi.mock('@/lib/electron', () => ({
  electronAPI: mockElectronAPI,
}));
```

### Mocking Yjs

```typescript
// tests/mocks/yjs.ts
import { vi } from 'vitest';
import * as Y from 'yjs';

export function createMockYDoc() {
  const doc = new Y.Doc();
  return {
    doc,
    calendars: doc.getMap('calendars'),
    events: doc.getMap('events'),
    tasks: doc.getMap('tasks'),
  };
}
```

---

## Coverage

### Coverage Targets

| Type       | Target |
| ---------- | ------ |
| Utilities  | 90%+   |
| Hooks      | 80%+   |
| Components | 70%+   |
| Overall    | 75%+   |

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts', '**/*.config.*'],
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 75,
        lines: 75,
      },
    },
  },
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Best Practices

### Do

- ✅ Write descriptive test names
- ✅ Use `screen.getByRole` for accessibility
- ✅ Test user behavior, not implementation
- ✅ Keep tests independent
- ✅ Use test factories for mock data
- ✅ Clean up after each test

### Don't

- ❌ Test implementation details
- ❌ Use `getByTestId` when better queries exist
- ❌ Share state between tests
- ❌ Write flaky tests
- ❌ Skip tests without a reason
- ❌ Test third-party libraries

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/)
- [Playwright Docs](https://playwright.dev/docs/intro)
- [Kent C. Dodds Testing Guide](https://kentcdodds.com/blog/write-tests)
