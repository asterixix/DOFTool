import { useEffect, useState } from 'react';

/**
 * Responsive media query hook
 */
export function useMediaQuery(query: string): boolean {
  const getMatch = (): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList): void => {
      setMatches('matches' in event ? event.matches : mediaQueryList.matches);
    };

    // Set initial state in case it changed between renders
    setMatches(mediaQueryList.matches);

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      // Safari <14 fallback
      mediaQueryList.addListener(handleChange);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}
