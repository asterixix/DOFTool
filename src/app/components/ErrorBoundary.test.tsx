import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

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

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }): JSX.Element => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child content</div>;
};

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeDefined();
  });

  it('should render error UI when child throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('should display error message when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test error message')).toBeDefined();
  });

  it('should have Reload Page button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Reload Page')).toBeDefined();
  });

  it('should have Report on GitHub button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Report on GitHub')).toBeDefined();
  });

  it('should have expandable error stack details', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Stack')).toBeDefined();
  });

  it('should call reportCrash when Report on GitHub is clicked', async () => {
    const { reportCrash } = await import('@/shared/services/crashReporting');
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await user.click(screen.getByText('Report on GitHub'));

    expect(reportCrash).toHaveBeenCalled();
  });

  it('should call logToDebug when error is caught', async () => {
    const { logToDebug } = vi.mocked(await import('@/shared/utils/debugLogger'));

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(logToDebug).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'ErrorBoundary:componentDidCatch',
        message: 'React Error Caught by Error Boundary',
      })
    );
  });
});
