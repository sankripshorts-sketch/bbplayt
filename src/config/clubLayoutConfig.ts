export type ClubLayoutOffsets = { x: number; y: number };

export type ClubLayoutAxisScale = { x: number; y: number };

function parseOffsetEnv(key: string): number {
  const v = process.env[key];
  if (v == null || String(v).trim() === '') return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function parsePositiveScaleEnv(key: string, fallback = 1): number {
  const v = process.env[key];
  if (v == null || String(v).trim() === '') return fallback;
  const n = parseFloat(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

/**
 * Доп. сдвиг схемы зала по X/Y (px на холсте), после привязки к данным structRooms (min/max bbox).
 * Отрицательное X — влево, отрицательное Y — вверх.
 * Задаётся в .env: EXPO_PUBLIC_HALL_MAP_OFFSET_X, EXPO_PUBLIC_HALL_MAP_OFFSET_Y
 */
export function getHallMapOffsetXPx(): number {
  return parseOffsetEnv('EXPO_PUBLIC_HALL_MAP_OFFSET_X');
}

export function getHallMapOffsetYPx(): number {
  return parseOffsetEnv('EXPO_PUBLIC_HALL_MAP_OFFSET_Y');
}

/**
 * Базовые смещения из env. Для точной подгонки конкретного клуба см. `getHallMapOffsetsForClub`.
 */
export function getHallMapOffsetsBase(): ClubLayoutOffsets {
  return { x: getHallMapOffsetXPx(), y: getHallMapOffsetYPx() };
}

function parseClubOffsetsJson(): Record<string, { x?: number; y?: number }> {
  const raw = process.env.EXPO_PUBLIC_HALL_MAP_CLUB_OFFSETS_JSON;
  if (raw == null || String(raw).trim() === '') return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, { x?: number; y?: number }>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Смещения для отрисовки: база из env + опционально дельта для `icafe_id` из
 * EXPO_PUBLIC_HALL_MAP_CLUB_OFFSETS_JSON, например: `{"12345":{"x":-2,"y":1}}`.
 */
export function getHallMapOffsetsForClub(icafeId: number | undefined): ClubLayoutOffsets {
  const base = getHallMapOffsetsBase();
  if (icafeId == null || !Number.isFinite(icafeId) || icafeId <= 0) return base;
  const row = parseClubOffsetsJson()[String(icafeId)];
  if (!row) return base;
  const dx = row.x;
  const dy = row.y;
  return {
    x: base.x + (typeof dx === 'number' && Number.isFinite(dx) ? dx : 0),
    y: base.y + (typeof dy === 'number' && Number.isFinite(dy) ? dy : 0),
  };
}

/**
 * Поправка «кривой» схемы iCafe: масштаб логических координат по осям **после** расчёта `scale = canvasW/maxX`.
 * Унифицированный множитель на все координаты в коде не даёт эффекта (сокращается с `scale`);
 * раздельные kx/ky поджимают или растягивают план по X и Y независимо (когда единицы API по осям не совпадают).
 * .env: EXPO_PUBLIC_HALL_MAP_AXIS_SCALE_X, EXPO_PUBLIC_HALL_MAP_AXIS_SCALE_Y (по умолчанию 1).
 */
export function getHallMapAxisScaleBase(): ClubLayoutAxisScale {
  return {
    x: parsePositiveScaleEnv('EXPO_PUBLIC_HALL_MAP_AXIS_SCALE_X', 1),
    y: parsePositiveScaleEnv('EXPO_PUBLIC_HALL_MAP_AXIS_SCALE_Y', 1),
  };
}

function parseClubAxisScaleJson(): Record<string, { x?: number; y?: number }> {
  const raw = process.env.EXPO_PUBLIC_HALL_MAP_CLUB_AXIS_SCALE_JSON;
  if (raw == null || String(raw).trim() === '') return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, { x?: number; y?: number }>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * База из env и при необходимости переопределение по `icafe_id`:
 * `EXPO_PUBLIC_HALL_MAP_CLUB_AXIS_SCALE_JSON`, например `{"12345":{"x":1.02,"y":0.98}}`.
 * Неуказанная ось в объекте клуба берётся из базы env.
 */
export function getHallMapAxisScaleForClub(icafeId: number | undefined): ClubLayoutAxisScale {
  const base = getHallMapAxisScaleBase();
  if (icafeId == null || !Number.isFinite(icafeId) || icafeId <= 0) return base;
  const row = parseClubAxisScaleJson()[String(icafeId)];
  if (!row) return base;
  const x =
    typeof row.x === 'number' && Number.isFinite(row.x) && row.x > 0 ? row.x : base.x;
  const y =
    typeof row.y === 'number' && Number.isFinite(row.y) && row.y > 0 ? row.y : base.y;
  return { x, y };
}

function compressZoneKey(raw: string | undefined | null): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]/gi, '');
}

function parseZoneNudgeJson(): Record<string, { x?: number; y?: number }> {
  const raw = process.env.EXPO_PUBLIC_HALL_MAP_ZONE_OFFSETS_JSON;
  if (raw == null || String(raw).trim() === '') return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, { x?: number; y?: number }>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Доп. сдвиг **только** прямоугольника зоны по X/Y (px на холсте), по имени зоны из structRooms.
 * По умолчанию без сдвига; подгонка — через `EXPO_PUBLIC_HALL_MAP_ZONE_OFFSETS_JSON`, например `{"GameZone":{"x":40}}` (положительный X — вправо).
 */
export function getHallMapZoneNudgePx(areaName: string | undefined): ClubLayoutOffsets {
  const map = parseZoneNudgeJson();
  const keys = [compressZoneKey(areaName), String(areaName ?? '').trim().toLowerCase()];
  for (const k of keys) {
    if (!k) continue;
    const row = map[k] ?? map[k.replace(/\s+/g, '')];
    if (row) {
      const dx = row.x;
      const dy = row.y;
      return {
        x: typeof dx === 'number' && Number.isFinite(dx) ? dx : 0,
        y: typeof dy === 'number' && Number.isFinite(dy) ? dy : 0,
      };
    }
  }
  return { x: 0, y: 0 };
}

function parsePositive(n: unknown, fallback: number): number {
  if (typeof n === 'number' && Number.isFinite(n) && n > 0) return n;
  return fallback;
}

function parseZoneXYScaleJson(): Record<string, { x?: number; y?: number }> {
  const raw = process.env.EXPO_PUBLIC_HALL_MAP_ZONE_XY_SCALE_JSON;
  if (raw == null || String(raw).trim() === '') return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, { x?: number; y?: number }>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Доп. масштаб по осям **внутри зоны** (после base kx/ky клуба), по имени зоны из structRooms.
 * `EXPO_PUBLIC_HALL_MAP_ZONE_XY_SCALE_JSON`, например `{"gamezone":{"x":1.02,"y":0.98}}`.
 */
export function getHallMapZoneXYScaleFromEnv(areaName: string | undefined): ClubLayoutAxisScale {
  const map = parseZoneXYScaleJson();
  const keys = [compressZoneKey(areaName), String(areaName ?? '').trim().toLowerCase()];
  for (const k of keys) {
    if (!k) continue;
    const row = map[k] ?? map[k.replace(/\s+/g, '')];
    if (row) {
      return {
        x: parsePositive(row.x, 1),
        y: parsePositive(row.y, 1),
      };
    }
  }
  return { x: 1, y: 1 };
}

function normalizePcMapKey(raw: string | undefined | null): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase();
}

function parsePcOffsetsJson(): Record<string, { x?: number; y?: number }> {
  const raw = process.env.EXPO_PUBLIC_HALL_MAP_PC_OFFSETS_JSON;
  if (raw == null || String(raw).trim() === '') return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, { x?: number; y?: number }>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Доп. сдвиг чипа ПК в px на холсте (после расчёта позиций в зоне).
 * `EXPO_PUBLIC_HALL_MAP_PC_OFFSETS_JSON`, например `{"pc09":{"x":2,"y":-4},"pc 10":{"x":0,"y":1}}` — ключи без учёта регистра.
 */
export function getHallMapPcNudgePx(pcName: string | undefined): ClubLayoutOffsets {
  const map = parsePcOffsetsJson();
  const k = normalizePcMapKey(pcName);
  if (!k) return { x: 0, y: 0 };
  const row = map[k] ?? map[pcName?.trim() ?? ''];
  if (!row) return { x: 0, y: 0 };
  const dx = row.x;
  const dy = row.y;
  return {
    x: typeof dx === 'number' && Number.isFinite(dx) ? dx : 0,
    y: typeof dy === 'number' && Number.isFinite(dy) ? dy : 0,
  };
}

function parsePcScaleJson(): Record<string, number> {
  const raw = process.env.EXPO_PUBLIC_HALL_MAP_PC_SCALE_JSON;
  if (raw == null || String(raw).trim() === '') return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        const nk = normalizePcMapKey(k);
        if (!nk) continue;
        const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
        if (Number.isFinite(n) && n > 0) out[nk] = n;
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Множитель размера чипа ПК (1 = по умолчанию).
 * `EXPO_PUBLIC_HALL_MAP_PC_SCALE_JSON`, например `{"pc09":1.1}`.
 */
export function getHallMapPcScaleFromEnv(pcName: string | undefined): number {
  const map = parsePcScaleJson();
  const k = normalizePcMapKey(pcName);
  if (!k) return 1;
  const v = map[k];
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 1;
}
