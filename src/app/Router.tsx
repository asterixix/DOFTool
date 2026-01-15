import { Suspense, lazy, useEffect } from 'react';

import { Routes, Route, Navigate } from 'react-router-dom';

import { useFamily } from '@/modules/family/hooks/useFamily';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { logToDebug } from '@/shared/utils/debugLogger';
import { useSettingsStore } from '@/stores/settings.store';

import { AppLayout } from './layouts/AppLayout';

// Lazy load feature modules
const CalendarModule = lazy(async () => {
  // #region agent log
  logToDebug({
    location: 'Router:lazy:calendar',
    message: 'Starting lazy load of CalendarModule',
    hypothesisId: 'HYP_A',
  });
  // #endregion
  try {
    const module = await import('@/modules/calendar');
    // #region agent log
    logToDebug({
      location: 'Router:lazy:calendar:success',
      message: 'Successfully lazy loaded CalendarModule',
      data: { exports: Object.keys(module) },
      hypothesisId: 'HYP_A',
    });
    // #endregion
    return module;
  } catch (error) {
    // #region agent log
    logToDebug({
      location: 'Router:lazy:calendar:error',
      message: 'Failed to lazy load CalendarModule',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      },
      hypothesisId: 'HYP_A',
    });
    // #endregion
    throw error;
  }
});

const TasksModule = lazy(() => {
  // #region agent log
  logToDebug({
    location: 'Router:lazy:tasks',
    message: 'Starting lazy load of TasksModule',
    hypothesisId: 'HYP_A',
  });
  // #endregion
  return import('@/modules/tasks');
});

const EmailModule = lazy(() => {
  // #region agent log
  logToDebug({
    location: 'Router:lazy:email',
    message: 'Starting lazy load of EmailModule',
    hypothesisId: 'HYP_A',
  });
  // #endregion
  return import('@/modules/email');
});

const FamilyModule = lazy(() => {
  // #region agent log
  logToDebug({
    location: 'Router:lazy:family',
    message: 'Starting lazy load of FamilyModule',
    hypothesisId: 'HYP_A',
  });
  // #endregion
  return import('@/modules/family');
});

const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));

export function Router(): JSX.Element {
  const { isFirstRun } = useSettingsStore();
  const { hasFamily, isLoading } = useFamily();

  // #region agent log
  useEffect(() => {
    logToDebug({
      location: 'Router:mount',
      message: 'Router component mounted',
      hypothesisId: 'HYP_D',
    });
  }, []);
  // #endregion

  // #region agent log
  useEffect(() => {
    logToDebug({
      location: 'Router:state',
      message: 'Router state check',
      data: { isFirstRun, hasFamily, isLoading },
      hypothesisId: 'HYP_D',
    });
  }, [isFirstRun, hasFamily, isLoading]);
  // #endregion

  // Show welcome page for first-time users or if no family is set up
  if (isFirstRun || !hasFamily) {
    // #region agent log
    logToDebug({
      location: 'Router:render:welcome',
      message: 'Rendering welcome page route',
      data: { isFirstRun, hasFamily },
      hypothesisId: 'HYP_D',
    });
    // #endregion
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<WelcomePage />} path="/*" />
        </Routes>
      </Suspense>
    );
  }

  // #region agent log
  logToDebug({
    location: 'Router:render:main',
    message: 'Rendering main app routes',
    hypothesisId: 'HYP_D',
  });
  // #endregion

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<AppLayout />} path="/">
          <Route index element={<Navigate replace to="/calendar" />} />
          <Route element={<CalendarModule />} path="calendar/*" />
          <Route element={<TasksModule />} path="tasks/*" />
          <Route element={<EmailModule />} path="email/*" />
          <Route element={<FamilyModule />} path="family/*" />
          <Route element={<SettingsPage />} path="settings/*" />
        </Route>
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  );
}
