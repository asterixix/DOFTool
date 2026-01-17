/**
 * Analytics Service - Aptabase integration for Electron
 *
 * Handles analytics tracking with respect to user privacy settings.
 * Routes tracking through IPC to the main process where Aptabase SDK runs.
 * This avoids issues with the aptabase-ipc:// custom protocol in sandboxed renderers.
 */

import { useSettingsStore } from '@/stores/settings.store';

// Analytics is initialized in the main process
// The renderer process sends events via IPC
let analyticsEnabled = false;

/**
 * Check if analytics is enabled and update local state
 * Note: Analytics is initialized in the main process (electron/main.ts)
 */
function checkAnalyticsEnabled(): boolean {
  try {
    const state = useSettingsStore.getState();
    analyticsEnabled = state.privacy.analyticsEnabled;
    return analyticsEnabled;
  } catch {
    return false;
  }
}

/**
 * Track an analytics event via IPC to main process
 *
 * Events are sent to the main process which handles Aptabase SDK calls.
 * This is fire-and-forget - we don't await the result.
 */
export function track(eventName: string, properties?: Record<string, unknown>): void {
  // Check if analytics is enabled in settings
  if (!checkAnalyticsEnabled()) {
    return;
  }

  // Check if we're in Electron environment with the API available
  if (typeof window === 'undefined' || !window.electronAPI?.analytics) {
    return;
  }

  try {
    // Convert properties to safe types for Aptabase (string, number, boolean only)
    const safeProperties = properties
      ? (Object.fromEntries(
          Object.entries(properties).map(([key, value]) => [
            key,
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
              ? value
              : String(value),
          ])
        ) as Record<string, string | number | boolean>)
      : undefined;

    // Send via IPC to main process - fire and forget
    // The main process handles the actual Aptabase SDK call
    window.electronAPI.analytics.track(eventName, safeProperties).catch(() => {
      // Silently ignore analytics errors
      // Analytics failures should never break the app
    });
  } catch {
    // Synchronous errors are handled silently
  }
}

/**
 * Track screen view/page view
 */
export function trackScreen(screenName: string, properties?: Record<string, unknown>): void {
  track('screen_view', {
    screen_name: screenName,
    ...properties,
  });
}

/**
 * Track user action
 */
export function trackAction(action: string, properties?: Record<string, unknown>): void {
  track('user_action', {
    action,
    ...properties,
  });
}

/**
 * Update analytics state when settings change
 * Note: Analytics is initialized in the main process, we just update local state
 */
export function updateAnalyticsState(): void {
  checkAnalyticsEnabled();
}

// Subscribe to settings changes to update local state
if (typeof window !== 'undefined') {
  useSettingsStore.subscribe((state) => {
    const enabled = state.privacy.analyticsEnabled;
    if (enabled !== analyticsEnabled) {
      analyticsEnabled = enabled;
    }
  });
}
