import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const getSystemTheme = useCallback(() => {
    // 1. Check Telegram client scheme
    const tgScheme = window.Telegram?.WebApp?.colorScheme;
    if (tgScheme === 'dark' || tgScheme === 'light') {
      return tgScheme;
    }
    // 2. Check browser prefers-color-scheme
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'dark'; // Premium sleek dark mode default
  }, []);

  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('easyfind_theme');
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch (e) {
      // storage unavailable
    }
    return getSystemTheme();
  });

  const applyTheme = useCallback((currentTheme) => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', currentTheme);

    // Sync Telegram WebApp Chrome colors
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        const bgHex = currentTheme === 'dark' ? '#0f172a' : '#f8fafc';
        const headerHex = currentTheme === 'dark' ? '#0f172a' : '#ffffff';
        if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor(headerHex);
        if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(bgHex);
      }
    } catch (e) {
      // Ignore Telegram WebApp color sync error
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen to Telegram themeChanged event
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg || typeof tg.onEvent !== 'function') return;

    const handleThemeChange = () => {
      const newScheme = tg.colorScheme;
      if (newScheme === 'dark' || newScheme === 'light') {
        setThemeState(newScheme);
        try {
          localStorage.setItem('easyfind_theme', newScheme);
        } catch (e) {}
      }
    };

    tg.onEvent('themeChanged', handleThemeChange);
    return () => {
      if (typeof tg.offEvent === 'function') {
        tg.offEvent('themeChanged', handleThemeChange);
      }
    };
  }, []);

  const setTheme = (newTheme) => {
    if (newTheme !== 'dark' && newTheme !== 'light') return;
    setThemeState(newTheme);
    try {
      localStorage.setItem('easyfind_theme', newTheme);
    } catch (e) {}
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
