import type { AvailablePcsData, MemberBookingRow, PcListItem } from '../../api/types';
import {
  formatInstantInMoscow,
  formatInstantMoscowWallForLocale,
  moscowWallTimeToUtc,
  parseServerDateTimeString,
} from '../../datetime/mskTime';
import { nowForBookingCompareMs } from '../../datetime/serverBookingClock';

export type TimeInterval = { start: Date; end: Date };

/** @deprecated используйте parseServerDateTimeString — строки API без TZ = Europe/Moscow */
export const parseLocalDateTimeString = parseServerDateTimeString;

export { parseServerDateTimeString };

function parseHHmm(hhmm: string): { h: number; m: number; s: number } | null {
  const t = hhmm.trim();
  const withSec = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(t);
  if (withSec) {
    const h = Number(withSec[1]);
    const min = Number(withSec[2]);
    const sec = Number(withSec[3]);
    if (![h, min, sec].every((n) => Number.isFinite(n))) return null;
    return { h, m: min, s: sec };
  }
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return { h, m: min, s: 0 };
}

/** Локальная дата (календарь устройства) + время — как задумал пользователь в своём поясе. */
export function combineLocalISODateAndTime(dateISO: string, timeHHmm: string): Date | null {
  const [y, mo, d] = dateISO.split('-').map(Number);
  const tm = parseHHmm(timeHHmm);
  if (!tm || !Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo - 1, d, tm.h, tm.m, tm.s, 0);
}

/** Дата и время в московском смысле (поля start_date/start_time с сервера). */
export function combineServerISODateAndTime(dateISO: string, timeHHmm: string): Date | null {
  const [y, mo, d] = dateISO.split('-').map(Number);
  const tm = parseHHmm(timeHHmm);
  if (!tm || !Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return moscowWallTimeToUtc(y, mo, d, tm.h, tm.m, tm.s);
}

/**
 * Выбор даты и времени в UI как московский календарь и часы → поля `start_date` / `start_time` для API.
 * (Не по часам устройства.)
 */
export function moscowSelectionToServerDateTime(dateISO: string, timeHHmm: string): { date: string; time: string } {
  const d = combineServerISODateAndTime(dateISO, timeHHmm);
  if (!d) {
    const tm = parseHHmm(timeHHmm);
    const t =
      tm != null
        ? `${String(tm.h).padStart(2, '0')}:${String(tm.m).padStart(2, '0')}:${String(tm.s).padStart(2, '0')}`
        : timeHHmm.trim();
    return { date: dateISO.trim(), time: t };
  }
  return formatInstantInMoscow(d);
}

/** @deprecated используйте moscowSelectionToServerDateTime — UI брони везде в МСК */
export const localSelectionToServerDateTime = moscowSelectionToServerDateTime;

/**
 * Извлекает момент начала окна из ответа available-pcs (поиск окна или список ПК).
 *
 * @param contextDateISO — календарный день запроса (YYYY-MM-DD, МСК), тот же что в `dateStart` к API.
 *   Нужен, если `time_frame` приходит только с часами (`14:00 – 16:00`) без даты — иначе начало окна не разобрать.
 * @param contextTimeHHmm — время старта из запроса. Нужен как запасной вариант, когда vibe в `time_frame`
 *   присылает не интервал, а шаг сетки (`"30"`), а доступность уже подтверждается списком свободных ПК.
 */
export function windowStartFromAvailablePcs(
  data: AvailablePcsData,
  contextDateISO?: string,
  contextTimeHHmm?: string,
): Date | null {
  const tf = data.time_frame?.trim();
  if (tf) {
    const parsed = parseTimeFrameStart(tf, contextDateISO);
    if (parsed) return parsed;
  }

  let best: Date | null = null;
  for (const p of data.pc_list ?? []) {
    if (p.is_using) continue;
    const w = windowStartFromPc(p);
    if (!w) continue;
    if (!best || w.getTime() < best.getTime()) best = w;
  }
  if (best) return best;

  if (
    contextDateISO &&
    contextTimeHHmm &&
    (data.pc_list ?? []).some((p) => !p.is_using)
  ) {
    return combineServerISODateAndTime(contextDateISO, contextTimeHHmm);
  }
  return null;
}

function wallTimeFromBareClockPart(part: string, contextDateISO: string): Date | null {
  const date = contextDateISO.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const tm = parseHHmm(part);
  if (!tm) return null;
  const t = `${String(tm.h).padStart(2, '0')}:${String(tm.m).padStart(2, '0')}:${String(tm.s).padStart(2, '0')}`;
  return combineServerISODateAndTime(date, t);
}

function parseTimeFrameStart(tf: string, contextDateISO?: string): Date | null {
  const dash = /\s*[–—-]\s*/;
  const parts = tf.split(dash).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 1) {
    const a = parseServerDateTimeString(parts[0]);
    if (a) return a;
    if (contextDateISO) {
      const wall = wallTimeFromBareClockPart(parts[0], contextDateISO);
      if (wall) return wall;
    }
  }
  const full = parseServerDateTimeString(tf);
  if (full) return full;
  if (contextDateISO) {
    const wall = wallTimeFromBareClockPart(tf, contextDateISO);
    if (wall) return wall;
  }
  return null;
}

function windowStartFromPc(p: PcListItem): Date | null {
  if (p.start_date && p.start_time) {
    const c = combineServerISODateAndTime(String(p.start_date), String(p.start_time));
    if (c) return c;
  }
  return null;
}

/**
 * Интервал из строк брони пользователя (member books).
 * Только Europe/Moscow для «наивных» дат — как POST /booking и GET all-books у iCafe.
 * Сравнение с `nowForBookingCompareMs()` (серверное время по HTTP Date) даёт «идёт / предстоит / завершена»;
 * на карточке время показываем
 * как часы в Москве (`formatMemberBookingIntervalLine`), без перевода в пояс устройства.
 */
export function intervalFromMemberRow(row: MemberBookingRow): TimeInterval | null {
  const from = row.product_available_date_local_from?.trim() ?? '';
  const to = row.product_available_date_local_to?.trim() ?? '';
  const a = parseServerDateTimeString(from);
  if (!a) return null;
  let b = parseServerDateTimeString(to);
  const mins = row.product_mins;
  if (!b && Number.isFinite(mins) && mins > 0) {
    b = new Date(a.getTime() + mins * 60 * 1000);
  }
  if (!b) return null;
  // Бронь через полночь: иногда конец приходит с той же календарной датой, что и начало (00:10 < 23:40).
  if (b.getTime() <= a.getTime()) {
    b = new Date(b.getTime() + 864e5);
  }
  if (b.getTime() <= a.getTime()) return null;
  return { start: a, end: b };
}

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

function intervalsEqualWall(a: TimeInterval, b: TimeInterval): boolean {
  return a.start.getTime() === b.start.getTime() && a.end.getTime() === b.end.getTime();
}

/** `outer` целиком накрывает `inner` по времени (границы включительно). */
export function intervalFullyCovers(outer: TimeInterval, inner: TimeInterval): boolean {
  return outer.start.getTime() <= inner.start.getTime() && outer.end.getTime() >= inner.end.getTime();
}

/** Опции для {@link pcListItemBlocksPlannedSlot} / {@link effectivePcBusyForPlan}. */
export type PcBusyForPlanOptions = {
  /**
   * Ответ `isFindWindow: true`: в списке только кандидаты на слот; широкий `start_*`–`end_*`, полностью
   * охватывающий план, — рамка доступности, а не чужая бронь (иначе любое пересечение помечало бы ПК занятым).
   */
  findWindowListSemantics?: boolean;
};

/** Пересечение с календарным днём `dayISO` (YYYY-MM-DD) по московским часам. */
export function intervalTouchesCalendarDay(iv: TimeInterval, dayISO: string): boolean {
  const [y, mo, d] = dayISO.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return false;
  const dayStart = moscowWallTimeToUtc(y, mo, d, 0, 0, 0);
  const dayEnd = moscowWallTimeToUtc(y, mo, d, 23, 59, 59);
  const dayEndMs = dayEnd.getTime() + 999;
  return iv.start.getTime() <= dayEndMs && iv.end.getTime() >= dayStart.getTime();
}

export function plannedInterval(dateISO: string, timeHHmm: string, mins: number): TimeInterval | null {
  const start = combineServerISODateAndTime(dateISO, timeHHmm);
  if (!start || !Number.isFinite(mins) || mins <= 0) return null;
  const end = new Date(start.getTime() + mins * 60 * 1000);
  return { start, end };
}

export function formatISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatHHmm(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Отображение времени по настройкам устройства (12h/24h), без принудительного 24h. */
export function formatInstantDeviceClock(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Время на карточке брони: часы в Москве; 12h с am/pm для всех локалей. */
export function formatInstantForBookingLine(d: Date, locale: 'ru' | 'en'): string {
  return formatInstantMoscowWallForLocale(d, locale);
}

/** Календарный день + слот в МСК → строка времени для UI (12h с am/pm). */
export function formatMoscowWallSlotForLocale(dateISO: string, timeSlot: string, locale: 'ru' | 'en'): string {
  const d = combineServerISODateAndTime(dateISO, timeSlot);
  if (!d) return timeSlot.trim();
  return formatInstantMoscowWallForLocale(d, locale);
}

/** @deprecated используйте formatMoscowWallSlotForLocale — слоты брони в МСК */
export function formatLocalWallSlotForDevice(dateISO: string, timeSlot: string): string {
  return formatMoscowWallSlotForLocale(dateISO, timeSlot, 'ru');
}

/** Одна строка для карточки «мои брони»: время в Москве, стиль по языку приложения. */
export function formatMemberBookingIntervalLine(row: MemberBookingRow, locale: 'ru' | 'en' = 'ru'): string {
  const iv = intervalFromMemberRow(row);
  if (iv) {
    return `${formatInstantForBookingLine(iv.start, locale)} — ${formatInstantForBookingLine(iv.end, locale)}`;
  }
  return `${row.product_available_date_local_from} — ${row.product_available_date_local_to}`;
}

/** Интервал брони от найденного окна до +mins (для поиска ближайшего слота). */
export function planIntervalFromWindowStart(windowStart: Date, mins: number): TimeInterval | null {
  if (!Number.isFinite(mins) || mins <= 0) return null;
  return { start: windowStart, end: new Date(windowStart.getTime() + mins * 60 * 1000) };
}

/**
 * Интервал уже занятого слота на ПК из ответа `available-pcs-for-booking` (если сервер отдаёт границы).
 */
export function intervalFromPcBookingFields(p: PcListItem): TimeInterval | null {
  if (!p.start_date || !p.start_time || !p.end_date || !p.end_time) return null;
  const start = combineServerISODateAndTime(String(p.start_date), String(p.start_time));
  const end = combineServerISODateAndTime(String(p.end_date), String(p.end_time));
  if (!start || !end || end.getTime() <= start.getTime()) return null;
  return { start, end };
}

/**
 * ПК недоступен на выбранный слот, если интервал плана пересекается с уже существующей бронью на этой строке ПК:
 * границы из `available-pcs` (`start_*` / `end_*`), либо активная сессия без полного окна — только если выбранный слот пересекает «сейчас».
 */
export function pcListItemBlocksPlannedSlot(
  p: PcListItem,
  planIv: TimeInterval,
  nowMs: number = nowForBookingCompareMs(),
  options?: PcBusyForPlanOptions,
): boolean {
  const iv = intervalFromPcBookingFields(p);
  if (iv) {
    // В ответе find-window границы слота часто дублируют проверяемый интервал — это метаданные, не чужая бронь.
    // Та же рамка приходит и у ПК с is_using (сессия «сейчас»): иначе пересечение с planIv ложно блокирует слот.
    if (intervalsEqualWall(iv, planIv) && (!p.is_using || options?.findWindowListSemantics)) return false;
    if (options?.findWindowListSemantics && !p.is_using && intervalFullyCovers(iv, planIv)) {
      return false;
    }
    return intervalsOverlap(iv, planIv);
  }
  if (p.is_using) {
    const t = nowMs;
    return t >= planIv.start.getTime() && t < planIv.end.getTime();
  }
  return false;
}

/** ПК недоступен для выбора: пересечение планируемого слота с занятым окном из `available-pcs`. */
export function effectivePcBusyForPlan(
  p: PcListItem,
  planIv: TimeInterval,
  nowMs: number = nowForBookingCompareMs(),
  options?: PcBusyForPlanOptions,
): boolean {
  return pcListItemBlocksPlannedSlot(p, planIv, nowMs, options);
}
