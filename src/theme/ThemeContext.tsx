import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorPalette, ThemeName } from './palettes';
import { getPalette } from './palettes';

const STORAGE_KEY = 'bbplay.theme';

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
  colors: ColorPalette;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw === 'light' || raw === 'dark') setThemeState(raw);
    });
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeState(name);
    AsyncStorage.setItem(STORAGE_KEY, name).catch(() => {});
  }, []);

  const colors = useMemo(() => getPalette(theme), [theme]);

  const value = useMemo(
    () => ({ theme, setTheme, colors }),
    [theme, setTheme, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Активная палитра для стилей */
export function useThemeColors(): ColorPalette {
  return useTheme().colors;
}
