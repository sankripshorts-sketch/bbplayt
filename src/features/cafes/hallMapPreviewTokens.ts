/** Визуал схемы зала как в `preview/hall-zones-colors.html` (канонический layout). */

export const HALL_PREVIEW = {
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
