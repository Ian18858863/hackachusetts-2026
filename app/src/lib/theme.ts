import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

// Keep in sync with the inline script in index.html.
const STORAGE_KEY = 'app-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/**
 * Light/dark theme. Follows the operating system until the user picks a theme
 * explicitly; the explicit choice is remembered in localStorage.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readStored() ?? systemTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Track OS changes only while the user has not chosen a theme.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      if (readStored() === null) setTheme(systemTheme());
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage can be unavailable (private mode); the choice then lasts for this visit.
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
