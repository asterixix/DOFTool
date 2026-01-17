import { createContext, useContext, useEffect, useState } from 'react';

import { useSettingsStore } from '@/stores/settings.store';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
}: ThemeProviderProps): JSX.Element {
  // Sync with settings store for theme
  const storeTheme = useSettingsStore((state) => state.appearance.theme);
  const updateAppearanceSettings = useSettingsStore((state) => state.updateAppearanceSettings);

  const [theme, setTheme] = useState<Theme>(() => {
    // Prefer settings store theme, fallback to localStorage, then default
    return (storeTheme as Theme) || (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });

  // Sync theme state when store theme changes
  useEffect(() => {
    if (storeTheme) {
      setTheme(storeTheme as Theme);
    }
  }, [storeTheme]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      // Update both local state and settings store
      setTheme(newTheme);
      updateAppearanceSettings({ theme: newTheme });
      localStorage.setItem(storageKey, newTheme);
    },
  };

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
