/**
 * useAnalytics - Hook for analytics tracking
 * Provides convenient methods for tracking user actions
 */

import { useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import { track, trackAction, trackScreen } from '@/shared/services/analytics';

/**
 * Track page views automatically on route changes
 */
export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    // Extract route name from pathname
    const routeName = location.pathname.split('/')[1] ?? 'home';
    trackScreen(routeName === '' ? 'welcome' : routeName);
  }, [location.pathname]);
}

/**
 * Track user actions with module context
 */
export function trackModuleAction(
  module: 'calendar' | 'tasks' | 'email' | 'family' | 'settings' | 'general',
  action: string,
  properties?: Record<string, unknown>
): void {
  trackAction(action, {
    module,
    ...properties,
  });
}

/**
 * Track feature usage
 */
export function trackFeature(feature: string, properties?: Record<string, unknown>): void {
  track('feature_used', {
    feature,
    ...properties,
  });
}
