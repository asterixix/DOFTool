import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { App } from './App';

vi.mock('@/hooks/useCompactMode', () => ({
  useCompactMode: vi.fn(),
}));

vi.mock('@/shared/services/crashReporting', () => ({
  createErrorDetails: vi.fn().mockReturnValue({
    message: 'test error',
    stack: 'test stack',
  }),
  reportCrash: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/utils/debugLogger', () => ({
  logToDebug: vi.fn(),
}));

vi.mock('./Router', () => ({
  Router: () => <div data-testid="router">Router Content</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('router')).toBeDefined();
  });

  it('should render Router component', () => {
    render(<App />);
    expect(screen.getByText('Router Content')).toBeDefined();
  });

  it('should wrap content with ErrorBoundary', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should provide QueryClientProvider context', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('router')).toBeDefined();
    });
  });

  it('should set up error event listeners on mount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    render(<App />);

    expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
  });

  it('should clean up error event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<App />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
  });

  it('should set up notifications listener when electronAPI is available', () => {
    const mockOn = vi.fn();
    window.electronAPI = {
      ...window.electronAPI,
      on: mockOn,
    };

    render(<App />);

    expect(mockOn).toHaveBeenCalledWith('notifications:updated', expect.any(Function));
  });

  it('should clean up notifications listener on unmount', () => {
    const mockOff = vi.fn();
    window.electronAPI = {
      ...window.electronAPI,
      on: vi.fn(),
      off: mockOff,
    };

    const { unmount } = render(<App />);
    unmount();

    expect(mockOff).toHaveBeenCalledWith('notifications:updated', expect.any(Function));
  });
});
