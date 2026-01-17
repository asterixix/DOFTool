/**
 * PageTracker - Component to track page views
 */

import { useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import { trackScreen } from '@/shared/services/analytics';

export function PageTracker(): null {
  const location = useLocation();

  useEffect(() => {
    // Extract route name from pathname
    const path = location.pathname;
    let routeName = 'home';

    if (path.includes('/calendar')) {
      routeName = 'calendar';
    } else if (path.includes('/tasks')) {
      routeName = 'tasks';
    } else if (path.includes('/email')) {
      routeName = 'email';
    } else if (path.includes('/family')) {
      routeName = 'family';
    } else if (path.includes('/settings')) {
      routeName = 'settings';
    } else if (path === '/' || path === '/welcome') {
      routeName = 'welcome';
    }

    // Track screen view - protocol handler should be ready since we await initialize() in main
    trackScreen(routeName);
  }, [location.pathname]);

  return null;
}
