import { useEffect } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';

import { BRAND } from '@/shared/brand';
import { logToDebug } from '@/shared/utils/debugLogger';

import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './providers/ThemeProvider';
import { Router } from './Router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App(): JSX.Element {
  useEffect(() => {
    logToDebug({
      location: 'App:mount',
      message: 'App component mounted',
      hypothesisId: 'INFO',
    });

    // Capture unhandled errors
    const handleError = (event: ErrorEvent): void => {
      logToDebug({
        location: 'App:unhandledError',
        message: 'Unhandled Error',
        data: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error instanceof Error ? event.error.stack : undefined,
        },
        hypothesisId: 'HYP_B',
      });
    };

    const handleRejection = (event: PromiseRejectionEvent): void => {
      logToDebug({
        location: 'App:unhandledRejection',
        message: 'Unhandled Promise Rejection',
        data: {
          reason: String(event.reason),
          stack: event.reason instanceof Error ? event.reason.stack : undefined,
        },
        hypothesisId: 'HYP_B',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    const handler = (): void => {
      logToDebug({
        location: 'App:notifications',
        message: 'notifications:updated received',
        hypothesisId: 'INFO',
      });
      window.dispatchEvent(new CustomEvent('notifications:updated'));
    };

    window.electronAPI?.on('notifications:updated', handler);

    return () => {
      window.electronAPI?.off('notifications:updated', handler);
    };
  }, []);
  // #endregion

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey={BRAND.themeStorageKey}>
          <HashRouter>
            <Router />
          </HashRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
