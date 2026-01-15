# DOFTool Design System

## Overview

This document outlines the unified design system patterns used across all DOFTool modules to ensure consistency, maintainability, and excellent UX on both mobile and desktop devices.

---

## **Shared Components**

### **ErrorBanner**
**Location:** `src/shared/components/ErrorBanner.tsx`

Unified error display component used across all modules.

```tsx
import { ErrorBanner } from '@/shared/components';

// Usage
<ErrorBanner error={error} onDismiss={clearError} />
```

**Features:**
- Consistent destructive color scheme
- AlertCircle icon for visual recognition
- Dismissible with X button
- Accessible with `role="alert"`
- Responsive padding (p-3 on mobile, p-4 on desktop)

---

### **LoadingSpinner**
**Location:** `src/shared/components/LoadingSpinner.tsx`

Unified loading indicator component.

```tsx
import { LoadingSpinner } from '@/shared/components';

// Usage variants
<LoadingSpinner />                              // Default medium
<LoadingSpinner size="sm" />                    // Small
<LoadingSpinner size="lg" text="Loading..." /> // Large with text
<LoadingSpinner fullScreen />                   // Full screen centered
<LoadingSpinner fullScreen text="Loading accounts..." />
```

**Features:**
- Three sizes: `sm` (16px), `md` (32px), `lg` (48px)
- Optional loading text
- `fullScreen` mode for full-container centering
- Consistent muted foreground color
- Smooth spin animation

---

### **EmptyState**
**Location:** `src/shared/components/EmptyState.tsx`

Unified empty state component for when no data is available.

```tsx
import { EmptyState } from '@/shared/components';
import { CheckSquare } from 'lucide-react';

// Usage
<EmptyState
  icon={CheckSquare}
  title="No tasks found"
  description="Create your first task to get started."
  actionLabel="Create Task"
  onAction={handleCreate}
/>
```

**Features:**
- Customizable icon from lucide-react
- Optional action button
- Centered layout with proper spacing
- Consistent text hierarchy

---

## **Icon System**

### **Standard: lucide-react**

All icons use the `lucide-react` library for consistency.

**Common Icons:**
- `Calendar` - Calendar views
- `ChevronLeft`, `ChevronRight` - Navigation
- `Plus` - Create actions
- `List` - List views
- `CheckSquare` - Tasks
- `AlertCircle` - Errors
- `Upload`, `Download` - Import/Export

```tsx
import { Calendar, Plus, ChevronLeft } from 'lucide-react';

<Calendar className="h-4 w-4" />
<Plus className="mr-2 inline h-4 w-4" />
<ChevronLeft className="h-4 w-4" />
```

**Size Guidelines:**
- `h-4 w-4` - Standard icon size (16px)
- `h-5 w-5` - Larger emphasis (20px)
- `h-12 w-12` - Empty state icons (48px)

---

## **Responsive Patterns**

### **Mobile Sidebar Pattern**

Calendar and Tasks modules use Sheet component for mobile sidebars.

```tsx
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const isDesktop = useMediaQuery('(min-width: 1024px)');

// Mobile (< 1024px)
{!isDesktop && (
  <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
    <SheetTrigger asChild>
      <Button variant="outline">
        <Calendar className="mr-2 h-4 w-4" />
        My Calendars
      </Button>
    </SheetTrigger>
    <SheetContent side="left" className="w-[320px]">
      <Sidebar />
    </SheetContent>
  </Sheet>
)}

// Desktop (>= 1024px)
{isDesktop && (
  <div className="w-64 shrink-0">
    <Sidebar />
  </div>
)}
```

**Breakpoint:** `1024px` (Tailwind `lg:`)

### **Responsive Breakpoint Standard**

All modules use `lg:` (1024px) as the primary desktop/mobile breakpoint:

```tsx
// ✅ Correct - Use lg: for desktop detection
const isDesktop = useMediaQuery('(min-width: 1024px)');

// Mobile-only elements
<Button className="lg:hidden" />

// Desktop-only elements  
<div className="hidden lg:flex" />

// Responsive widths
<div className="w-full lg:w-[400px]" />
```

**Do NOT use:** `md:` for sidebar/layout breakpoints (use `lg:` instead)

---

## **Spacing System**

### **Module Layout Spacing**

**Outer Container:**
```tsx
<div className="flex flex-1 flex-col gap-4">
```

**Grid Layouts:**
```tsx
// 2-column responsive grid
<div className="grid gap-6 lg:grid-cols-2">

// Sidebar + Content
<div className="flex min-h-0 flex-1 gap-4">
```

**Card/Section Spacing:**
```tsx
// Internal card spacing
<div className="space-y-3"> // Small elements
<div className="space-y-4"> // Standard elements
<div className="space-y-6"> // Major sections
```

---

## **Typography Patterns**

### **Module Headers**

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">Module Name</h1>
    <p className="text-muted-foreground">
      Description of the module
    </p>
  </div>
  <Button size="sm" variant="outline">Action</Button>
</div>
```

### **Section Headers**

```tsx
<h3 className="text-lg font-semibold">Section Title</h3>
<p className="text-sm text-muted-foreground">Description</p>
```

---

## **Button Patterns**

### **Primary Actions**

```tsx
<Button onClick={handleAction}>
  <Plus className="mr-2 h-4 w-4" />
  Create Item
</Button>
```

### **Secondary Actions**

```tsx
<Button variant="outline" size="sm">
  Action
</Button>
```

### **Icon Buttons**

```tsx
<Button size="icon" variant="ghost" className="h-8 w-8">
  <ChevronLeft className="h-4 w-4" />
</Button>
```

### **Responsive Button Text**

```tsx
<Button>
  <Plus className="h-4 w-4" />
  <span className="hidden sm:inline">New Event</span>
</Button>
```

---

## **Form Patterns**

### **Optional Properties**

Use conditional spreading for optional form fields:

```tsx
await createTask({
  title: data.title,
  status: data.status,
  ...(data.dueDate && { dueDate: data.dueDate }),
  ...(data.description && { description: data.description }),
  ...(data.tags && data.tags.length > 0 && { tags: data.tags }),
});
```

This satisfies TypeScript's `exactOptionalPropertyTypes: true` requirement.

---

## **Color System**

### **Semantic Colors**

- `primary` - Main brand color (teal)
- `secondary` - Secondary actions/states
- `destructive` - Errors, delete actions
- `muted` - Subtle backgrounds, disabled states
- `accent` - Hover states, highlights

### **Module-Specific Colors**

**Calendar Events:**
```typescript
calendar: {
  red, orange, amber, yellow, lime, green,
  emerald, teal, cyan, sky, blue, indigo,
  violet, purple, fuchsia, pink, rose
}
```

**Task Lists:**
Same palette as calendar events.

---

## **Accessibility Guidelines**

### **Touch Targets**

Minimum touch target: `44px` (defined in Tailwind config as `min-touch`)

```tsx
// Good - proper touch target
<Button className="h-8 w-8"> // With padding = 44px+

// Better - explicit minimum
<button className="min-h-touch min-w-touch">
```

### **Keyboard Navigation**

All interactive elements must be keyboard accessible:

```tsx
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
```

### **ARIA Labels**

```tsx
<Button title="Create new task">
  <Plus className="h-4 w-4" />
</Button>
```

---

## **Animation Guidelines**

### **Standard Durations**

- Interactions: `200ms` (e.g., button hover)
- Transitions: `300ms` (e.g., sheet open/close)
- Complex animations: `400-600ms`

### **Respect User Preferences**

```tsx
import { useReducedMotion } from 'framer-motion';

const shouldReduceMotion = useReducedMotion();

<motion.div
  initial={shouldReduceMotion ? false : { opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
>
```

---

## **Code Quality Standards**

### **Prohibited**

❌ `console.log` in production code
❌ `console.error` without proper error handling
❌ `any` type (use `unknown` with type guards)
❌ Inline SVG icons (use lucide-react)
❌ Duplicate error display patterns

### **Required**

✅ Explicit return types for exported functions
✅ TypeScript strict mode
✅ ErrorBanner for all error displays
✅ EmptyState for all empty data states
✅ lucide-react icons throughout
✅ Responsive design (mobile-first)

---

## **Module Structure**

Each module follows this pattern:

```
modules/{feature}/
├── components/
│   ├── {Feature}Component.tsx
│   ├── index.ts (barrel export)
├── hooks/
│   ├── use{Feature}.ts
│   ├── index.ts
├── stores/
│   └── {feature}.store.ts
├── types/
│   └── {Feature}.types.ts
├── utils/
│   └── helpers.ts
└── index.tsx (main entry, routes)
```

---

## **Testing Requirements**

- **Unit tests:** 90%+ coverage for utilities
- **Hook tests:** 80%+ coverage
- **Component tests:** 70%+ coverage
- **E2E tests:** Critical user flows

---

## **Performance Guidelines**

### **Lazy Loading**

```tsx
const EventEditor = lazy(() => import('./components/EventEditor'));
```

### **Memoization**

```tsx
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

### **Virtual Scrolling**

For lists > 100 items:
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
```

---

## **Migration Checklist**

When creating or refactoring a module:

- [ ] Use `ErrorBanner` for error displays
- [ ] Use `EmptyState` for empty data states
- [ ] Use lucide-react icons (no inline SVG)
- [ ] Implement mobile Sheet sidebar pattern
- [ ] Use `gap-4` for consistent spacing
- [ ] Add proper TypeScript types
- [ ] Remove all `console.log`/`console.error`
- [ ] Implement keyboard navigation
- [ ] Test on mobile and desktop
- [ ] Add unit/component tests

---

## **Examples**

See implemented patterns in:
- `src/modules/family/index.tsx` - Simple layout with ErrorBanner
- `src/modules/calendar/index.tsx` - Complex responsive layout
- `src/modules/tasks/index.tsx` - Complete pattern implementation
- `src/modules/tasks/components/TaskListView.tsx` - EmptyState usage
