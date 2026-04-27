export { ThemeProvider, useTheme, useThemeColors } from './ThemeContext';
export { fonts, useAppFonts } from './appFonts';
export { applyDefaultTypography } from './applyDefaultTypography';

/** Статичная палитра для экранов, импортирующих `colors` напрямую (как в прежнем theme.ts) */
export const colors = {
  bg: '#141f2d',
  card: '#223141',
  text: '#f3f6fb',
  muted: '#9ca8b7',
  accent: '#009a1a',
  accentBright: '#20d36a',
  accentDim: '#173226',
  border: '#314356',
  danger: '#f08484',
  success: '#2fca68',
};
