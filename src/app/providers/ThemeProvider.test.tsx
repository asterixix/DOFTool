import { render, screen, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ThemeProvider, useTheme } from './ThemeProvider';

const mockUpdateAppearanceSettings = vi.fn();

vi.mock('@/stores/settings.store', () => ({
  useSettingsStore: vi.fn(
    (
      selector: (state: {
        appearance: { theme: string | null };
        updateAppearanceSettings: typeof mockUpdateAppearanceSettings;
      }) => unknown
    ) => {
      const state = {
        appearance: { theme: null }, // Allow defaultTheme to take effect
        updateAppearanceSettings: mockUpdateAppearanceSettings,
      };
      return selector(state);
    }
  ),
}));

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
  });

  it('should render children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Child content</div>
      </ThemeProvider>
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });

  it('should use default theme when no stored theme', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <div>Test</div>
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('should apply dark theme class', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <div>Test</div>
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should read theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    render(
      <ThemeProvider storageKey="theme">
        <div>Test</div>
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should apply system theme based on media query', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ThemeProvider defaultTheme="system">
        <div>Test</div>
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
  });

  it('should return current theme', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
      <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('light');
  });

  it('should provide setTheme function', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
      <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(typeof result.current.setTheme).toBe('function');
  });

  it('should update theme when setTheme is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        {children}
      </ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should save theme to localStorage when setTheme is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        {children}
      </ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorage.getItem('test-theme')).toBe('dark');
  });

  it('should update settings store when setTheme is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
      <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(mockUpdateAppearanceSettings).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('should return default values when used outside ThemeProvider', () => {
    const originalError = console.error;
    console.error = vi.fn();

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('system');
    expect(typeof result.current.setTheme).toBe('function');

    console.error = originalError;
  });
});
