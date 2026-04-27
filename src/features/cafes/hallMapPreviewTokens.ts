import type { ColorPalette } from '../../theme/palettes';

/** Визуал схемы зала как в `preview/hall-zones-colors.html` (канонический layout). */

const HALL_PREVIEW_DARK = {
  mapEdge: '#ffffff',
  zoneBoot: '#ff00cc',
  zoneGame: '#00ff80',
  zoneVip: '#e8c547',
  legendSeparator: 'rgba(255, 255, 255, 0.06)',
  chipIdleBorder: '#5a6168',
  chipIdleText: '#e8e8ea',
  /** Заливка состояния внутри постоянной серой обводки `chipIdleBorder`. */
  busy: { fill: '#dc2626', border: '#dc2626' },
  selected: { fill: '#22c55e', border: '#22c55e' },
  idleLegendBorder: '#6b7280',
  unavail: { fill: '#eab308', border: '#ca8a04' },
} as const;

const HALL_PREVIEW_LIGHT = {
  ...HALL_PREVIEW_DARK,
  /** На светлом фоне белая рамка и светлый текст «теряются». */
  mapEdge: '#cbd5e1',
  legendSeparator: 'rgba(15, 23, 42, 0.12)',
  chipIdleBorder: '#64748b',
  chipIdleText: '#1e293b',
} as const;

export const HALL_PREVIEW = HALL_PREVIEW_DARK;

function toRgb(hex: string): { r: number; g: number; b: number } | null {
  const v = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  const n = Number.parseInt(v, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function relativeLuminance(hex: string): number {
  const rgb = toRgb(hex);
  if (!rgb) return 0;
  const linear = (c: number) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

export function getHallPreviewTheme(colors: ColorPalette) {
  const isLightTheme = relativeLuminance(colors.bg) > 0.72;
  return isLightTheme ? HALL_PREVIEW_LIGHT : HALL_PREVIEW_DARK;
}
