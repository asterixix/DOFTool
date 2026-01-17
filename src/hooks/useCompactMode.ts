/**
 * useCompactMode - Hook to check if compact mode is enabled
 *
 * Reads from settings store and applies compact mode CSS class to document root
 */

import { useEffect } from 'react';

import { useSettingsStore } from '@/stores/settings.store';

export function useCompactMode(): boolean {
  const compactMode = useSettingsStore((state) => state.appearance.compactMode);

  useEffect(() => {
    const root = document.documentElement;

    if (compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    return () => {
      root.classList.remove('compact-mode');
    };
  }, [compactMode]);

  return compactMode;
}
