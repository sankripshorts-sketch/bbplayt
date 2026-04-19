import type { StructRoom } from '../api/types';
import { normalizePcZoneKind } from '../features/booking/pcZoneKind';
import { areaFrameExtentHeight, coerceLayoutNum } from '../features/cafes/clubLayoutGeometry';

export type HallMapXY = { x: number; y: number };
export type HallMapPcScale = number | HallMapXY;

/** Каноническая схема: три колонки BootCamp | GameZone | VIP без опоры на «мировые» area_frame_x/y из iCafe. */
export type CanonicalColumnsConfig = {
  enabled?: boolean;
  /** Отступ от края canvas (px). */
  paddingPx?: number;
  /** Горизонтальный зазор между колонками (px). */
  columnGapPx?: number;
  /**
   * Доля ширины боковой колонки от доступной ширины (после padding и двух gap).
   * Центр = 1 − 2×side. Типично 0.16–0.24.
   */
  sideWidthFraction?: number;
  /** Отступ заголовка зоны сверху (px). */
  topInsetPx?: number;
  /** Отступ снизу внутри canvas (px). По умолчанию = topInsetPx — симметрия полей карты. */
  bottomInsetPx?: number;
};

export type HallMapTweak = {
  /** Три колонки по зонам; при enabled игнорируются «мировые» координаты зон из API. */
  canonicalColumns?: CanonicalColumnsConfig;
  /** Сдвиг зоны в px после масштаба (как в экспорте zone_drag_px). */
  zoneOffsets: Record<string, HallMapXY>;
  /** Множители ширины/высоты зоны (zone_xy). */
  zoneSizeXY: Record<string, HallMapXY>;
  /** Множители позиции левого верхнего угла (zone_pos_xy). */
  zonePosXY: Record<string, HallMapXY>;
  /** Доп. сдвиг чипа ПК в px (pc_drag). */
  pcOffsets: Record<string, HallMapXY>;
  /** Множители позиции чипа внутри зоны (pc_xy). */
  pcXY: Record<string, HallMapXY>;
  /** Масштаб размера чипа (pc_scale). */
  pcScale: Record<string, HallMapPcScale>;
};

const ZERO: HallMapXY = { x: 0, y: 0 };
const ONE: HallMapXY = { x: 1, y: 1 };

function parseJsonEnv<T>(raw: string | undefined): T | undefined {
  if (!raw?.trim()) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function mergeXY(base: Record<string, HallMapXY>, over?: Record<string, HallMapXY>): Record<string, HallMapXY> {
  if (!over) return { ...base };
  return { ...base, ...over };
}

function mergePcScale(
  base: Record<string, HallMapPcScale>,
  over?: Record<string, HallMapPcScale>,
): Record<string, HallMapPcScale> {
  if (!over) return { ...base };
  return { ...base, ...over };
}

const EMPTY: HallMapTweak = {
  zoneOffsets: {},
  zoneSizeXY: {},
  zonePosXY: {},
  pcOffsets: {},
  pcXY: {},
  pcScale: {},
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Отступы и зазоры канонической схемы масштабируются с шириной canvas (реф. 420px),
 * чтобы на узком экране промежутки не казались огромными, на широком — не статичными.
 */
export type CanonicalLayoutOpts = {
  /** Экран брони: уже поля/зазоры и ниже потолок высоты ряда — компактнее схема и меньше риск обрезки по краям. */
  bookingCompact?: boolean;
};

export function getResponsiveCanonicalSpacing(
  canvasW: number,
  cfg: CanonicalColumnsConfig,
  layoutOpts?: CanonicalLayoutOpts,
): { pad: number; gap: number; topInset: number; bottomInset: number } {
  const refW = 420;
  const scale = clamp(canvasW / refW, 0.62, 1.45);
  const basePad = cfg.paddingPx ?? 14;
  const baseGap = cfg.columnGapPx ?? 10;
  const baseTop = cfg.topInsetPx ?? 6;
  const baseBottom = cfg.bottomInsetPx ?? baseTop;
  const compact = layoutOpts?.bookingCompact === true;
  const cm = compact ? 0.78 : 1;
  const pad = clamp(basePad * scale * cm, compact ? 4 : 5, compact ? 20 : 26);
  const gap = clamp(baseGap * scale * cm, compact ? 2 : 3, compact ? 14 : 20);
  const topInset = clamp(baseTop * scale * (compact ? 0.72 : 1), compact ? 2 : 3, compact ? 12 : 16);
  const bottomInset = clamp(baseBottom * scale * (compact ? 0.72 : 1), compact ? 2 : 3, compact ? 12 : 16);
  return { pad, gap, topInset, bottomInset };
}

/** Ширины колонок BootCamp | GameZone | VIP — как в {@link computeCanonicalZoneFrames}. */
export function getCanonicalColumnLayout(
  canvasW: number,
  cfg: CanonicalColumnsConfig | undefined,
  layoutOpts?: CanonicalLayoutOpts,
): { pad: number; gap: number; sideW: number; centerW: number } | null {
  if (!cfg?.enabled) return null;
  const { pad, gap } = getResponsiveCanonicalSpacing(canvasW, cfg, layoutOpts);
  const sideFrac = clamp(cfg.sideWidthFraction ?? 0.2, 0.08, 0.42);
  const inner = Math.max(0, canvasW - 2 * pad - 2 * gap);
  const sideW = inner * sideFrac;
  const centerW = Math.max(0, inner - 2 * sideW);
  return { pad, gap, sideW, centerW };
}

function mergeCanonical(a?: CanonicalColumnsConfig, b?: CanonicalColumnsConfig): CanonicalColumnsConfig | undefined {
  if (!a && !b) return undefined;
  return { ...a, ...b };
}

/** iCafe 87375 — канонические три колонки; координаты ПК внутри зоны по-прежнему из API + {@link pcOffsetsInZonePixels}. */
const ICAFE_87375: HallMapTweak = {
  canonicalColumns: {
    enabled: true,
    paddingPx: 10,
    columnGapPx: 10,
    /** Шире BootCamp / VIP, уже слот под центр (GameZone). Достаточно ширины под подпись «BootCamp». */
    sideWidthFraction: 0.23,
    topInsetPx: 6,
  },
  zoneOffsets: {},
  zoneSizeXY: {
    BootCamp: { x: 1, y: 1 },
    /** Квадрат GameZone: ширина слота × x; высота = ширине. x ближе к 1 — крупнее по ширине и высоте одинаково. */
    GameZone: { x: 0.97, y: 1 },
    VIP: { x: 1, y: 1 },
  },
  zonePosXY: {},
  pcOffsets: {},
  pcXY: {},
  pcScale: {},
};

const BAKED_BY_ICAFE: Record<string, HallMapTweak> = {
  '87375': ICAFE_87375,
};

function envOverlay(base: HallMapTweak): HallMapTweak {
  return {
    canonicalColumns: mergeCanonical(
      base.canonicalColumns,
      parseJsonEnv<CanonicalColumnsConfig>(process.env.EXPO_PUBLIC_HALL_MAP_CANONICAL_COLUMNS_JSON),
    ),
    zoneOffsets: mergeXY(base.zoneOffsets, parseJsonEnv(process.env.EXPO_PUBLIC_HALL_MAP_ZONE_OFFSETS_JSON)),
    zoneSizeXY: mergeXY(base.zoneSizeXY, parseJsonEnv(process.env.EXPO_PUBLIC_HALL_MAP_ZONE_XY_SCALE_JSON)),
    zonePosXY: mergeXY(base.zonePosXY, parseJsonEnv(process.env.EXPO_PUBLIC_HALL_MAP_ZONE_POS_XY_SCALE_JSON)),
    pcOffsets: mergeXY(base.pcOffsets, parseJsonEnv(process.env.EXPO_PUBLIC_HALL_MAP_PC_OFFSETS_JSON)),
    pcXY: mergeXY(base.pcXY, parseJsonEnv(process.env.EXPO_PUBLIC_HALL_MAP_PC_XY_SCALE_JSON)),
    pcScale: mergePcScale(base.pcScale, parseJsonEnv(process.env.EXPO_PUBLIC_HALL_MAP_PC_SCALE_JSON)),
  };
}

/**
 * Правки схемы зала: встроенные по `icafe_id` + переопределение из EXPO_PUBLIC_HALL_MAP_* при сборке.
 */
export function getHallMapTweak(icafeId?: number): HallMapTweak {
  const id = icafeId != null && Number.isFinite(icafeId) ? String(Math.trunc(icafeId)) : '';
  const baked = id ? BAKED_BY_ICAFE[id] : undefined;
  return envOverlay(baked ?? EMPTY);
}

function xyFromMap(m: Record<string, HallMapXY>, key: string, fallback: HallMapXY): HallMapXY {
  const direct = m[key];
  if (direct && typeof direct.x === 'number' && typeof direct.y === 'number') return direct;
  const lk = key.toLowerCase();
  for (const [k, v] of Object.entries(m)) {
    if (k.toLowerCase() === lk && typeof v.x === 'number' && typeof v.y === 'number') return v;
  }
  return fallback;
}

function pcScaleFromMap(m: Record<string, HallMapPcScale>, key: string, fallback: HallMapPcScale): HallMapPcScale {
  const direct = m[key];
  if (direct !== undefined) return direct;
  const lk = key.toLowerCase();
  for (const [k, v] of Object.entries(m)) {
    if (k.toLowerCase() === lk) return v;
  }
  return fallback;
}

export type ZonePixelFrame = {
  left: number;
  top: number;
  w: number;
  h: number;
  extentH: number;
  aw: number;
  ax: number;
  ay: number;
  zoneName: string;
};

/**
 * Три колонки по типу зоны: BootCamp (0), GameZone (1), VIP (2); прочее — центр.
 * Позиции зон не берутся из area_frame_x/y; ПК внутри зоны по-прежнему через логические aw / extentH.
 */
export function computeCanonicalZoneFrames(
  rooms: StructRoom[],
  canvasW: number,
  minHeight: number,
  tweak: HallMapTweak,
  layoutOpts?: CanonicalLayoutOpts,
): { frames: ZonePixelFrame[]; canvasH: number } | null {
  const cfg = tweak.canonicalColumns;
  if (!cfg?.enabled || !rooms.length) return null;

  const { pad, gap, topInset, bottomInset } = getResponsiveCanonicalSpacing(canvasW, cfg, layoutOpts);
  const sideFrac = clamp(cfg.sideWidthFraction ?? 0.2, 0.08, 0.42);

  const inner = Math.max(0, canvasW - 2 * pad - 2 * gap);
  const sideW = inner * sideFrac;
  const centerW = Math.max(0, inner - 2 * sideW);

  const slots: { left: number; w: number }[] = [
    { left: pad, w: sideW },
    { left: pad + sideW + gap, w: centerW },
    { left: pad + sideW + gap + centerW + gap, w: sideW },
  ];

  const slotIndexForRoom = (room: StructRoom): 0 | 1 | 2 => {
    const k = normalizePcZoneKind(String(room.area_name ?? ''));
    if (k === 'BootCamp') return 0;
    if (k === 'GameZone') return 1;
    if (k === 'VIP') return 2;
    return 1;
  };

  const naturalRowHeights = rooms.map((room) => {
    const slot = slots[slotIndexForRoom(room)]!;
    const aw = coerceLayoutNum(room.area_frame_width);
    const extentH = areaFrameExtentHeight(room);
    const zoneName = String(room.area_name ?? '');
    const size = xyFromMap(tweak.zoneSizeXY, zoneName, ONE);
    const slotW = Math.max(1e-6, slot.w * size.x);
    const scaleW = slotW / Math.max(aw, 1);
    return extentH * size.y * scaleW;
  });

  /** Сторона квадрата GameZone (как `aspect-ratio: 1/1` в HTML) — высота ряда не меньше этого. */
  let gameZoneSquareSide = 0;
  for (const room of rooms) {
    if (normalizePcZoneKind(String(room.area_name ?? '')) !== 'GameZone') continue;
    const slot = slots[1]!;
    const zoneName = String(room.area_name ?? '');
    const size = xyFromMap(tweak.zoneSizeXY, zoneName, ONE);
    gameZoneSquareSide = Math.max(gameZoneSquareSide, slot.w * size.x);
  }

  let innerH = Math.max(
    Math.max(0, minHeight - topInset),
    naturalRowHeights.length ? Math.max(...naturalRowHeights) : 0,
    gameZoneSquareSide,
  );

  /** Ниже ряд зон на экране брони: центральный «квадрат» уже → меньше высота всей схемы. */
  if (layoutOpts?.bookingCompact) {
    const softCap = Math.floor(canvasW * 0.62);
    innerH = Math.max(gameZoneSquareSide, Math.min(innerH, softCap));
  }

  const frames: ZonePixelFrame[] = rooms.map((room) => {
    const slot = slots[slotIndexForRoom(room)]!;
    const aw = coerceLayoutNum(room.area_frame_width);
    const extentH = areaFrameExtentHeight(room);
    const ax = coerceLayoutNum(room.area_frame_x);
    const ay = coerceLayoutNum(room.area_frame_y);
    const zoneName = String(room.area_name ?? '');
    const size = xyFromMap(tweak.zoneSizeXY, zoneName, ONE);
    const off = xyFromMap(tweak.zoneOffsets, zoneName, ZERO);
    const slotW = slot.w * size.x;
    const wFrame = Math.max(1, slotW);
    const kind = normalizePcZoneKind(zoneName);
    /** BootCamp/VIP — на всю высоту ряда; GameZone — квадрат со стороной = ширине рамки (как в макете HTML). */
    const hBody =
      kind === 'GameZone' ? wFrame : innerH * size.y;
    const left = slot.left + (slot.w - slotW) / 2 + off.x;
    /**
     * Как в `preview/hall-zones-colors.html`: `align-items: flex-start` — верхние границы всех зон на одной линии.
     * Не центрировать зону по вертикали в innerH (иначе более низкая GameZone «уезжает» вниз относительно боковых).
     */
    const top = topInset + off.y;
    return {
      left,
      top,
      w: wFrame,
      h: Math.max(1, hBody),
      extentH,
      aw,
      ax,
      ay,
      zoneName,
    };
  });

  const cw = Math.max(1, canvasW);
  const clampedFrames = frames.map((f) => {
    const leftC = Math.max(0, Math.min(f.left, cw - 1));
    const wC = Math.max(1, Math.min(f.w, cw - leftC));
    return { ...f, left: leftC, w: wC };
  });

  const canvasH = topInset + innerH + bottomInset;
  return { frames: clampedFrames, canvasH };
}

export function computeZonePixelFrame(room: StructRoom, scale: number, tweak: HallMapTweak): ZonePixelFrame {
  const zoneName = String(room.area_name ?? '');
  const ax = coerceLayoutNum(room.area_frame_x);
  const ay = coerceLayoutNum(room.area_frame_y);
  const aw = coerceLayoutNum(room.area_frame_width);
  const extentH = areaFrameExtentHeight(room);
  const pos = xyFromMap(tweak.zonePosXY, zoneName, ONE);
  const size = xyFromMap(tweak.zoneSizeXY, zoneName, ONE);
  const off = xyFromMap(tweak.zoneOffsets, zoneName, ZERO);
  const left = ax * scale * pos.x + off.x;
  const top = ay * scale * pos.y + off.y;
  const w = aw * scale * size.x;
  const h = extentH * scale * size.y;
  return { left, top, w, h, extentH, aw, ax, ay, zoneName };
}

export function applyPcHallTweaks(
  pcName: string,
  left: number,
  top: number,
  chipW: number,
  chipH: number,
  tweak: HallMapTweak,
): { left: number; top: number; chipW: number; chipH: number } {
  const xy = xyFromMap(tweak.pcXY, pcName, ONE);
  const drag = xyFromMap(tweak.pcOffsets, pcName, ZERO);
  const sc = pcScaleFromMap(tweak.pcScale, pcName, 1);
  let sx = 1;
  let sy = 1;
  if (typeof sc === 'number' && Number.isFinite(sc)) {
    sx = sy = sc;
  } else if (sc && typeof sc === 'object') {
    sx = typeof sc.x === 'number' && Number.isFinite(sc.x) ? sc.x : 1;
    sy = typeof sc.y === 'number' && Number.isFinite(sc.y) ? sc.y : 1;
  }
  return {
    left: left * xy.x + drag.x,
    top: top * xy.y + drag.y,
    chipW: chipW * sx,
    chipH: chipH * sy,
  };
}
