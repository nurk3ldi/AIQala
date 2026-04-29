import React from 'react';

import { ThemeColors, ThemeMode, darkColors, lightColors } from './colors';

type ThemeContextValue = {
  colors: ThemeColors;
  isDarkMode: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<ThemeMode>('light');
  const isDarkMode = mode === 'dark';

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      colors: isDarkMode ? darkColors : lightColors,
      isDarkMode,
      mode,
      toggleTheme: () => setMode((current) => (current === 'light' ? 'dark' : 'light')),
    }),
    [isDarkMode, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = React.useContext(ThemeContext);

  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return value;
}
