export { ThemeProvider, useTheme, useThemeColors } from './ThemeContext';
export { fonts, useAppFonts } from './appFonts';
export { applyDefaultTypography } from './applyDefaultTypography';

/** Статичная палитра для экранов, импортирующих `colors` напрямую (как в прежнем theme.ts) */
export const colors = {
  bg: '#1b222a',
  card: '#2c353e',
  text: '#ffffff',
  muted: '#94a3b8',
  accent: '#006400',
  accentBright: '#299047',
  accentDim: '#0f260f',
  border: '#3d4a57',
  danger: '#f87171',
  success: '#22c55e',
};
