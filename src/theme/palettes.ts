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
  /** Обводка «пустого» (свободного) места на схеме зала и акцентные полоски UI */
  pcFree: string;
  pcBusy: string;
  /** ПК занят «сейчас» по GET /pcs (онлайн), слот на выбранное время может быть свободен */
  pcLiveBusy: string;
  pcSelected: string;
  /** Нет данных / место недоступно для брони на схеме */
  pcUnavailable: string;
  chipOn: string;
};

export type ThemeName = 'dark' | 'light';

export const palettes: Record<ThemeName, ColorPalette> = {
  /** Как в прод. приложении Black Bears Play: глубокий графит, карточки чуть светлее, зелёный акцент, BootCamp — пурпурно-розовый */
  dark: {
    bg: '#141f2d',
    card: '#223141',
    cardElevated: '#26384a',
    text: '#f3f6fb',
    muted: '#9ca8b7',
    mutedDark: '#6d7a8a',
    accent: '#009a1a',
    accentBright: '#20d36a',
    accentSecondary: '#b01aa3',
    accentDim: '#173226',
    accentDark: '#006b12',
    accentTextOnButton: '#ffffff',
    border: '#314356',
    borderLight: '#41576d',
    danger: '#f08484',
    success: '#2fca68',
    zoneBg: '#182636',
    pcFree: '#7a92ab',
    pcBusy: '#dc2626',
    pcLiveBusy: '#ef4444',
    pcSelected: '#22c55e',
    pcUnavailable: '#eab308',
    chipOn: '#2a3c4f',
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
    pcFree: '#64748b',
    pcBusy: '#dc2626',
    pcLiveBusy: '#ea580c',
    pcSelected: '#16a34a',
    pcUnavailable: '#ca8a04',
    chipOn: '#f1f5f9',
  },
};

export function getPalette(name: ThemeName): ColorPalette {
  return palettes[name];
}
