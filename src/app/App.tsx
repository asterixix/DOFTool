import { useEffect } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';

import { useCompactMode } from '@/hooks/useCompactMode';
import { JoinRequestDialog } from '@/modules/family/components/JoinRequestDialog';
import { useFamilyStore } from '@/modules/family/stores/family.store';
import { BRAND } from '@/shared/brand';
import { createErrorDetails, reportCrash } from '@/shared/services/crashReporting';
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
  // Apply compact mode styling
  useCompactMode();

  // Get admin status for join request dialog
  const isAdmin = useFamilyStore((state) => state.isAdmin());

  useEffect(() => {
    // Analytics is initialized in the main process (electron/main.ts)
    // No need to initialize here in the renderer

    logToDebug({
      location: 'App:mount',
      message: 'App component mounted',
      hypothesisId: 'INFO',
    });

    // Capture unhandled errors
    const handleError = (event: ErrorEvent): void => {
      const errorDetails = createErrorDetails(event, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });

      logToDebug({
        location: 'App:unhandledError',
        message: 'Unhandled Error',
        data: {
          message: errorDetails.message,
          filename: errorDetails.filename,
          lineno: errorDetails.lineno,
          colno: errorDetails.colno,
          stack: errorDetails.stack,
        },
        hypothesisId: 'HYP_B',
      });

      // Report crash if enabled
      void reportCrash(errorDetails);
    };

    const handleRejection = (event: PromiseRejectionEvent): void => {
      const errorDetails = createErrorDetails(event);

      logToDebug({
        location: 'App:unhandledRejection',
        message: 'Unhandled Promise Rejection',
        data: {
          reason: errorDetails.message,
          stack: errorDetails.stack,
        },
        hypothesisId: 'HYP_B',
      });

      // Report crash if enabled
      void reportCrash(errorDetails);
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
            <JoinRequestDialog isAdmin={isAdmin} />
          </HashRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
