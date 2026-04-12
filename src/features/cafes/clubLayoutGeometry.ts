import type { StructPc, StructRoom } from '../../api/types';

/** Логический размер чипа ПК в тех же единицах, что area_frame_* (реф. Android 42dp; чуть крупнее для RN). */
export const PC_CHIP_LAYOUT_UNITS = 50;

export type PcAvailabilityState = 'free' | 'busy' | 'selected' | 'unknown' | 'liveBusy';

export function coerceLayoutNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * В API iCafe `area_frame_height` — Y нижней границы зоны (как AreasPcView: bottom = areaFrameHeight),
 * не высота прямоугольника. Высота = bottom − top.
 */
export function areaFrameExtentHeight(room: StructRoom): number {
  const bottom = coerceLayoutNum(room.area_frame_height);
  const top = coerceLayoutNum(room.area_frame_y);
  return Math.max(1, bottom - top);
}

/**
 * Позиции ПК внутри зоны (пиксели относительно левого верхнего угла зоны), по логике AreasPcView.getRectPc.
 * `areaFrameWidth` / `areaFrameHeight` — логические размеры зоны (ширина и высота extent).
 */
function sortPcsByNameNumber(pcs: StructPc[]): StructPc[] {
  const list = [...pcs];
  list.sort((a, b) => {
    const na = parseInt(String(a.pc_name).replace(/\D/g, ''), 10);
    const nb = parseInt(String(b.pc_name).replace(/\D/g, ''), 10);
    const da = Number.isFinite(na) ? na : 0;
    const db = Number.isFinite(nb) ? nb : 0;
    if (da !== db) return da - db;
    return String(a.pc_name).localeCompare(String(b.pc_name));
  });
  return list;
}

/**
 * Приводит координаты вдоль одной оси к диапазону зоны [0, extent] (те же единицы, что `area_frame_*`).
 *
 * iCafe/proxy иногда отдаёт `pc_box_*` в **мировых** координатах плана (`area_frame_*` — левый/верхний
 * угол того же плана), иногда — уже **локально** к зоне. Без приведения локальный bbox центрируется
 * неверно («уезжает» вправо/вниз).
 *
 * Логика без «магических» px: только сравнение с `extent` и допуском `tol` (доли логической единицы).
 * 1) Если max ≤ extent — считаем координаты уже локальными.
 * 2) Иначе пробуем v - `frameOrigin` (мировые → локальные); если вписываются в [0, extent], принимаем.
 * 3) Иначе пробуем v - min(v) (кластер в мировых при frameOrigin = 0 или несовпадении калибровки).
 */
export function coerceAxisToZoneLocal(vals: number[], frameOrigin: number, extent: number, tol: number): number[] {
  if (!vals.length || !(extent > 0)) return vals;
  const maxV = Math.max(...vals);
  if (maxV <= extent + tol) return vals;

  const byFrame = vals.map((v) => v - frameOrigin);
  const minB = Math.min(...byFrame);
  const maxB = Math.max(...byFrame);
  if (minB >= -tol && maxB <= extent + tol) return byFrame;

  const minR = Math.min(...vals);
  const byMin = vals.map((v) => v - minR);
  const maxM = Math.max(...byMin);
  if (maxM <= extent + tol) return byMin;

  return vals;
}

/**
 * @param insetTopLogical — зарезервировать верх зоны под заголовок (в тех же единицах, что area_frame_*).
 * @param areaFrameXWorld — `area_frame_x` зоны; если `pc_box_left` приходят в мировых координатах, по ним вычитается смещение.
 * @param areaFrameYWorld — `area_frame_y` зоны; то же по вертикали.
 */
export function pcOffsetsInZonePixels(
  pcs: StructPc[],
  areaFrameWidth: number,
  areaFrameHeight: number,
  zonePixelW: number,
  zonePixelH: number,
  insetTopLogical = 0,
  areaFrameXWorld?: number,
  areaFrameYWorld?: number,
): { pc: StructPc; left: number; top: number; chipW: number; chipH: number }[] {
  const list = sortPcsByNameNumber(pcs ?? []);
  const afw = coerceLayoutNum(areaFrameWidth);
  const afhFull = coerceLayoutNum(areaFrameHeight);
  const inset = Math.max(0, Math.min(coerceLayoutNum(insetTopLogical), afhFull * 0.4));
  const afh = afhFull - inset;
  if (!list.length || afw <= 0 || afh <= 0) return [];

  /**
   * Центрирование группы ПК в зоне. Реф. Android/iOS: `offset = (room - maxLeft - pcSize) / 2` — это верно,
   * только если минимальный `pc_box_left` / `pc_box_top` равен 0. Иначе нужно центрировать bbox
   * [minLeft, maxLeft + widthPc] × [minTop, maxTop + heightPc], иначе блок уезжает вправо/вниз.
   * С `inset` центрирование выполняется в полосе под заголовком зоны.
   */
  const widthPc = PC_CHIP_LAYOUT_UNITS;
  const heightPc = PC_CHIP_LAYOUT_UNITS;
  let lefts = list.map((p) => coerceLayoutNum(p.pc_box_left));
  let tops = list.map((p) => coerceLayoutNum(p.pc_box_top));

  const ax0 = coerceLayoutNum(areaFrameXWorld);
  const ay0 = coerceLayoutNum(areaFrameYWorld);
  const edgeTol = 3;
  lefts = coerceAxisToZoneLocal(lefts, ax0, afw, edgeTol);
  tops = coerceAxisToZoneLocal(tops, ay0, afhFull, edgeTol);

  const minPcX = Math.min(...lefts);
  const maxPcX = Math.max(...lefts);
  const minPcY = Math.min(...tops);
  const maxPcY = Math.max(...tops);
  const offsetX = (afw - (maxPcX - minPcX + widthPc)) / 2 - minPcX;
  const offsetY = (afh - (maxPcY - minPcY + heightPc)) / 2 - minPcY;

  const sx = zonePixelW / afw;
  const sy = zonePixelH / afhFull;
  const chipW = widthPc * sx;
  const chipH = heightPc * sy;

  return list.map((pc, i) => {
    const leftRel = lefts[i]! + offsetX;
    const topRel = tops[i]! + offsetY + inset;
    const left = Math.max(0, leftRel * sx);
    const top = Math.max(0, topRel * sy);
    return { pc, left, top, chipW, chipH };
  });
}

/** Глобальный bbox всех зон в координатах API (area_frame_height — нижняя граница по Y) */
export function roomsBoundingMax(rooms: StructRoom[]): { maxX: number; maxY: number } {
  let maxX = 120;
  let maxY = 120;
  for (const r of rooms) {
    const ax = coerceLayoutNum(r.area_frame_x);
    const aw = coerceLayoutNum(r.area_frame_width);
    maxX = Math.max(maxX, ax + aw);
    maxY = Math.max(maxY, coerceLayoutNum(r.area_frame_height));
  }
  return { maxX, maxY };
}

/**
 * Масштаб как в Android resizeRoomsAndPcs: вписать по ширине в canvasW.
 */
export function globalScaleForRooms(rooms: StructRoom[], canvasW: number): number {
  const { maxX } = roomsBoundingMax(rooms);
  return canvasW / Math.max(maxX, 1);
}
