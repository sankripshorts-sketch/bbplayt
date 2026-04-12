/** Токены цветов UI — dark = текущая палитра приложения, light = светлая тема */

export type ColorPalette = {
  bg: string;
  card: string;
  cardElevated: string;
  text: string;
  muted: string;
  mutedDark: string;
  accent: string;
  accentSecondary: string;
  accentDim: string;
  accentDark: string;
  accentTextOnButton: string;
  border: string;
  borderLight: string;
  danger: string;
  success: string;
  zoneBg: string;
  pcFree: string;
  pcBusy: string;
  /** ПК занят «сейчас» по GET /pcs (онлайн), слот на выбранное время может быть свободен */
  pcLiveBusy: string;
  pcSelected: string;
  chipOn: string;
};

export type ThemeName = 'dark' | 'light';

export const palettes: Record<ThemeName, ColorPalette> = {
  dark: {
    bg: '#050508',
    card: '#12101c',
    cardElevated: '#1a1528',
    text: '#F4F0FF',
    muted: '#9b8fb8',
    mutedDark: '#5c5470',
    accent: '#22e07a',
    accentSecondary: '#a855f7',
    accentDim: '#2d1f4a',
    accentDark: '#0a3d24',
    accentTextOnButton: '#050508',
    border: '#2a2438',
    borderLight: '#4c3f6b',
    danger: '#f472b6',
    success: '#22e07a',
    zoneBg: '#14101f',
    pcFree: '#1e3d2f',
    pcBusy: '#7c2d12',
    pcLiveBusy: '#b45309',
    pcSelected: '#a855f7',
    chipOn: '#2d1f4a',
  },
  light: {
    bg: '#ffffff',
    card: '#ffffff',
    cardElevated: '#f8fafc',
    text: '#0f172a',
    muted: '#64748b',
    mutedDark: '#94a3b8',
    accent: '#16a34a',
    accentSecondary: '#7c3aed',
    accentDim: '#ecfdf5',
    accentDark: '#dcfce7',
    accentTextOnButton: '#ffffff',
    border: '#e2e8f0',
    borderLight: '#cbd5e1',
    danger: '#db2777',
    success: '#16a34a',
    zoneBg: '#f8fafc',
    pcFree: '#bbf7d0',
    pcBusy: '#fed7aa',
    pcLiveBusy: '#fdba74',
    pcSelected: '#7c3aed',
    chipOn: '#f1f5f9',
  },
};

export function getPalette(name: ThemeName): ColorPalette {
  return palettes[name];
}
