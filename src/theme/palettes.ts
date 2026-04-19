/** Токены цветов UI — dark = текущая палитра приложения, light = светлая тема */

export type ColorPalette = {
  bg: string;
  card: string;
  cardElevated: string;
  text: string;
  muted: string;
  mutedDark: string;
  /** Заливки кнопок, обводки акцента (фирменный зелёный #006400) */
  accent: string;
  /** Текст и иконки акцента на тёмном фоне — ярче, чем `accent` */
  accentBright: string;
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
  /** Как в прод. приложении Black Bears Play: глубокий графит, карточки чуть светлее, зелёный акцент, BootCamp — пурпурно-розовый */
  dark: {
    bg: '#1b222a',
    card: '#2c353e',
    cardElevated: '#343f4a',
    text: '#ffffff',
    muted: '#94a3b8',
    mutedDark: '#64748b',
    accent: '#006400',
    accentBright: '#299047',
    accentSecondary: '#9d174d',
    accentDim: '#0f260f',
    accentDark: '#003d00',
    accentTextOnButton: '#ffffff',
    border: '#3d4a57',
    borderLight: '#475569',
    danger: '#f87171',
    success: '#22c55e',
    zoneBg: '#151c24',
    pcFree: '#1e293b',
    pcBusy: '#7f1d1d',
    pcLiveBusy: '#c2410c',
    pcSelected: '#22c55e',
    chipOn: '#374151',
  },
  light: {
    bg: '#ffffff',
    card: '#ffffff',
    cardElevated: '#f8fafc',
    text: '#0f172a',
    muted: '#64748b',
    mutedDark: '#94a3b8',
    accent: '#006400',
    accentBright: '#15803d',
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
