import { act } from 'react';

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useSettingsStore } from '@/stores/settings.store';

import { useCompactMode } from './useCompactMode';

// Mock settings store
vi.mock('@/stores/settings.store', () => ({
  useSettingsStore: vi.fn(),
}));

describe('useCompactMode', () => {
  const mockUseSettingsStore = useSettingsStore as unknown as ReturnType<typeof vi.fn>;
  const rootElement = document.documentElement;

  beforeEach(() => {
    vi.clearAllMocks();
    rootElement.classList.remove('compact-mode');
  });

  afterEach(() => {
    rootElement.classList.remove('compact-mode');
  });

  it('should return false when compact mode is disabled', () => {
    mockUseSettingsStore.mockReturnValue(false);

    const { result } = renderHook(() => useCompactMode());

    expect(result.current).toBe(false);
    expect(rootElement.classList.contains('compact-mode')).toBe(false);
  });

  it('should return true when compact mode is enabled', () => {
    mockUseSettingsStore.mockReturnValue(true);

    const { result } = renderHook(() => useCompactMode());

    expect(result.current).toBe(true);
    expect(rootElement.classList.contains('compact-mode')).toBe(true);
  });

  it('should add compact-mode class when enabled', () => {
    mockUseSettingsStore.mockReturnValue(false);
    const { rerender } = renderHook(() => useCompactMode());

    expect(rootElement.classList.contains('compact-mode')).toBe(false);

    mockUseSettingsStore.mockReturnValue(true);
    act(() => {
      rerender();
    });

    expect(rootElement.classList.contains('compact-mode')).toBe(true);
  });

  it('should remove compact-mode class when disabled', () => {
    mockUseSettingsStore.mockReturnValue(true);
    const { rerender } = renderHook(() => useCompactMode());

    expect(rootElement.classList.contains('compact-mode')).toBe(true);

    mockUseSettingsStore.mockReturnValue(false);
    act(() => {
      rerender();
    });

    expect(rootElement.classList.contains('compact-mode')).toBe(false);
  });

  it('should cleanup class on unmount', () => {
    mockUseSettingsStore.mockReturnValue(true);
    const { unmount } = renderHook(() => useCompactMode());

    expect(rootElement.classList.contains('compact-mode')).toBe(true);

    unmount();

    expect(rootElement.classList.contains('compact-mode')).toBe(false);
  });

  it('should read compact mode from settings store', () => {
    mockUseSettingsStore.mockReturnValue(true);
    renderHook(() => useCompactMode());

    expect(mockUseSettingsStore).toHaveBeenCalled();
  });
});
