import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useResizablePanel } from './useResizablePanel';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useResizablePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  afterEach(() => {
    localStorageMock.clear();
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  it('should return default width when no options provided', () => {
    const { result } = renderHook(() => useResizablePanel());

    expect(result.current.width).toBe(400);
    expect(result.current.isResizing).toBe(false);
    expect(result.current.panelRef).toBeDefined();
    expect(result.current.handleMouseDown).toBeDefined();
  });

  it('should use custom default width', () => {
    const { result } = renderHook(() => useResizablePanel({ defaultWidth: 500 }));

    expect(result.current.width).toBe(500);
  });

  it('should restore width from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('600');

    const { result } = renderHook(() =>
      useResizablePanel({
        storageKey: 'test-panel-width',
        defaultWidth: 400,
        minWidth: 250,
        maxWidth: 800,
      })
    );

    expect(result.current.width).toBe(600);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-panel-width');
  });

  it('should use default width if localStorage value is invalid', () => {
    localStorageMock.getItem.mockReturnValue('invalid');

    const { result } = renderHook(() =>
      useResizablePanel({
        storageKey: 'test-panel-width',
        defaultWidth: 400,
        minWidth: 250,
        maxWidth: 800,
      })
    );

    expect(result.current.width).toBe(400);
  });

  it('should use default width if localStorage value is below minWidth', () => {
    localStorageMock.getItem.mockReturnValue('100');

    const { result } = renderHook(() =>
      useResizablePanel({
        storageKey: 'test-panel-width',
        defaultWidth: 400,
        minWidth: 250,
        maxWidth: 800,
      })
    );

    expect(result.current.width).toBe(400);
  });

  it('should use default width if localStorage value is above maxWidth', () => {
    localStorageMock.getItem.mockReturnValue('1000');

    const { result } = renderHook(() =>
      useResizablePanel({
        storageKey: 'test-panel-width',
        defaultWidth: 400,
        minWidth: 250,
        maxWidth: 800,
      })
    );

    expect(result.current.width).toBe(400);
  });

  it('should start resizing on mouse down', () => {
    const { result } = renderHook(() => useResizablePanel());

    const mouseEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(mouseEvent);
    });

    expect(result.current.isResizing).toBe(true);
    expect(mouseEvent.preventDefault).toHaveBeenCalled();
    expect(mouseEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should update width on mouse move', () => {
    const { result } = renderHook(() => useResizablePanel({ defaultWidth: 400 }));

    const mouseDownEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    // Start resizing
    act(() => {
      result.current.handleMouseDown(mouseDownEvent);
    });

    expect(result.current.isResizing).toBe(true);

    // Simulate mouse move
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 200, // Moved 100px to the right
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(mouseMoveEvent);
    });

    // Width should be 400 (start) + 100 (delta) = 500
    expect(result.current.width).toBe(500);
  });

  it('should stop resizing on mouse up', () => {
    const { result } = renderHook(() => useResizablePanel());

    const mouseDownEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(mouseDownEvent);
    });

    expect(result.current.isResizing).toBe(true);

    const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true });

    act(() => {
      document.dispatchEvent(mouseUpEvent);
    });

    expect(result.current.isResizing).toBe(false);
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('should respect minWidth constraint', () => {
    const { result } = renderHook(() =>
      useResizablePanel({ defaultWidth: 400, minWidth: 250, maxWidth: 800 })
    );

    const mouseDownEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 400,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(mouseDownEvent);
    });

    // Try to resize below minWidth
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 100, // Would result in width < 250
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(mouseMoveEvent);
    });

    // Width should not go below minWidth
    expect(result.current.width).toBeGreaterThanOrEqual(250);
  });

  it('should respect maxWidth constraint', () => {
    const { result } = renderHook(() =>
      useResizablePanel({ defaultWidth: 400, minWidth: 250, maxWidth: 800 })
    );

    const mouseDownEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 400,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(mouseDownEvent);
    });

    // Try to resize above maxWidth
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 1000, // Would result in width > 800
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(mouseMoveEvent);
    });

    // Width should not go above maxWidth
    expect(result.current.width).toBeLessThanOrEqual(800);
  });

  it('should save width to localStorage when resizing with storageKey', () => {
    const { result } = renderHook(() =>
      useResizablePanel({ storageKey: 'test-panel-width', defaultWidth: 400 })
    );

    const mouseDownEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 400,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(mouseDownEvent);
    });

    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 500,
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(mouseMoveEvent);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-panel-width', '500');
  });

  it('should set cursor and userSelect styles when resizing', () => {
    const { result } = renderHook(() => useResizablePanel());

    const mouseDownEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(mouseDownEvent);
    });

    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');
  });

  it('should cleanup event listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { result, unmount } = renderHook(() => useResizablePanel());

    const mouseDownEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleMouseDown(mouseDownEvent);
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });

  it('should not update width if not resizing', () => {
    const { result } = renderHook(() => useResizablePanel({ defaultWidth: 400 }));

    const initialWidth = result.current.width;

    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 200,
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(mouseMoveEvent);
    });

    // Width should not change if not resizing
    expect(result.current.width).toBe(initialWidth);
  });
});
