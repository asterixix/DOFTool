import { act } from 'react';

import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useKeyboardShortcuts } from './useKeyboardShortcuts';

// Mock moveFocus utility - '@/shared/lib/*' maps to 'src/shared/lib/*' per tsconfig
vi.mock('@/shared/lib/utils', () => ({
  moveFocus: vi.fn().mockReturnValue(true),
}));

describe('useKeyboardShortcuts', () => {
  const mockOnViewChange = vi.fn();
  const mockOnNewEvent = vi.fn();
  const mockOnNavigatePrev = vi.fn();
  const mockOnNavigateNext = vi.fn();
  const mockOnCloseDialog = vi.fn();
  const mockOnSaveDialog = vi.fn();
  const mockOnToggleState = vi.fn();
  const mockOnOpenNotifications = vi.fn();
  const mockOnBack = vi.fn();

  const defaultOptions = {
    onViewChange: mockOnViewChange,
    onNewEvent: mockOnNewEvent,
    onNavigatePrev: mockOnNavigatePrev,
    onNavigateNext: mockOnNavigateNext,
    onCloseDialog: mockOnCloseDialog,
    onSaveDialog: mockOnSaveDialog,
    onToggleState: mockOnToggleState,
    onOpenNotifications: mockOnOpenNotifications,
    onBack: mockOnBack,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.dataset['navigation'] = '';
    // Remove any existing dialogs
    document.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
    document.querySelectorAll('[data-state="open"]').forEach((el) => el.remove());
    document.querySelectorAll('.fixed.inset-0.z-50').forEach((el) => el.remove());
  });

  afterEach(() => {
    delete document.body.dataset['navigation'];
  });

  it('should activate keyboard navigation on Tab key', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/calendar']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(document.body.dataset['navigation']).toBe('keyboard');
  });

  it('should deactivate keyboard navigation on mouse click', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/calendar']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    // Activate first
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    act(() => {
      window.dispatchEvent(tabEvent);
    });
    expect(document.body.dataset['navigation']).toBe('keyboard');

    // Then deactivate with mouse
    const mouseEvent = new MouseEvent('mousedown', { bubbles: true });
    act(() => {
      window.dispatchEvent(mouseEvent);
    });

    expect(document.body.dataset['navigation']).toBeUndefined();
  });

  it('should handle Escape to close dialog', () => {
    // Create a mock dialog
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);

    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/calendar']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnCloseDialog).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);

    document.body.removeChild(dialog);
  });

  it('should handle Backspace to navigate back', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/calendar']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnBack).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('should handle calendar view shortcuts', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/calendar']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const shortcuts = [
      { key: 'd', view: 'day' as const },
      { key: 'w', view: 'week' as const },
      { key: 'm', view: 'month' as const },
      { key: 'a', view: 'agenda' as const },
    ];

    shortcuts.forEach(({ key, view }) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      act(() => {
        window.dispatchEvent(event);
      });
      expect(mockOnViewChange).toHaveBeenCalledWith(view);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  it('should handle tasks view shortcuts', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/tasks']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const shortcuts = [
      { key: 'l', view: 'list' as const },
      { key: 'b', view: 'board' as const },
    ];

    shortcuts.forEach(({ key, view }) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      act(() => {
        window.dispatchEvent(event);
      });
      expect(mockOnViewChange).toHaveBeenCalledWith(view);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  it('should handle module navigation shortcuts', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), {
      wrapper: routerWrapper,
    });

    const shortcuts = [
      { key: 'c', path: '/calendar' },
      { key: 't', path: '/tasks' },
      { key: 'e', path: '/email' },
      { key: 'f', path: '/family' },
      { key: 's', path: '/settings' },
    ];

    shortcuts.forEach(({ key }) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      act(() => {
        window.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(true);
    });
  });

  it('should handle new event shortcut in calendar', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/calendar']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const event = new KeyboardEvent('keydown', { key: 'n', cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnNewEvent).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('should handle new event shortcut in tasks', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/tasks']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const event = new KeyboardEvent('keydown', { key: 'n', cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnNewEvent).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('should handle Ctrl+N for notifications', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnOpenNotifications).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('should handle Ctrl+ArrowLeft for navigation prev in calendar', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/calendar']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      ctrlKey: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnNavigatePrev).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('should handle Ctrl+ArrowRight for navigation next in calendar', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/calendar']}>{children}</MemoryRouter>
    );

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      ctrlKey: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockOnNavigateNext).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it.skip('should not handle shortcuts when in input field', () => {
    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/calendar']}>{children}</MemoryRouter>
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts(defaultOptions), { wrapper: routerWrapper });

    const event = new KeyboardEvent('keydown', { key: 'd', cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });

    // Should not be called when in input
    expect(mockOnViewChange).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should cleanup event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const routerWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
    );

    const { unmount } = renderHook(() => useKeyboardShortcuts(defaultOptions), {
      wrapper: routerWrapper,
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
  });
});
