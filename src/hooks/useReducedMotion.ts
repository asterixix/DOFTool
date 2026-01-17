/**
 * useReducedMotion - Hook to check if reduced motion should be enabled
 *
 * Checks both user preference from settings store and system prefers-reduced-motion
 * media query to determine if animations should be reduced.
 */

import { useEffect, useState } from 'react';

import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

import { useSettingsStore } from '@/stores/settings.store';

/**
 * Hook that combines user settings and system preferences for reduced motion
 * @returns true if animations should be reduced (either from user setting or system preference)
 */
export function useReducedMotion(): boolean {
  const userReducedMotion = useSettingsStore((state) => state.appearance.reducedMotion);
  const framerReducedMotion = useFramerReducedMotion() ?? false;

  // Check system preference as well
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent): void => {
      setSystemReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    // Fallback for older browsers
    if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => {
        mediaQuery.removeListener(handleChange);
      };
    }

    return undefined;
  }, []);

  // Return true if either user preference or system preference wants reduced motion
  return userReducedMotion || systemReducedMotion || framerReducedMotion;
}
