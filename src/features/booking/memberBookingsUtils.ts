import type { AllBooksData, MemberBookingRow, PcListItem } from '../../api/types';
import { formatInstantMoscowWallForLocale, formatISODateMoscow } from '../../datetime/mskTime';
import { nowForBookingCompareMs } from '../../datetime/serverBookingClock';
import {
  intervalFromMemberRow,
  intervalFromPcBookingFields,
  intervalsOverlap,
  intervalTouchesCalendarDay,
  type TimeInterval,
} from './bookingTimeUtils';
import { pcNamesLooselyEqual } from './pcNameMatch';

/** Есть ли хотя бы одна строка брони после нормализации (для пустого `{}` и пустых секций). */
export function hasAnyMemberBookingRows(data: AllBooksData | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  for (const v of Object.values(data)) {
    const rows = Array.isArray(v) ? v : v ? [v as MemberBookingRow] : [];
    if (rows.length > 0) return true;
  }
  return false;
}

export type TodayBookingLine = {
  key: string;
  icafeId: string;
  clubLabel: string;
  pcName: string;
  iv: TimeInterval;
  /** Для POST /booking-cancel (member_offer_id в iCafe; иначе product_id из ответа all-books). */
  memberOfferId: number;
};

/** `member_offer_id` из all-books; если 0/нет — `booking_id` / `product_id` (иначе отмена с id=0 не проходит). */
export function memberOfferIdForApi(row: MemberBookingRow): number {
  const mo = row.member_offer_id;
  const n = typeof mo === 'number' ? mo : Number(String(mo ?? '').trim());
  if (Number.isFinite(n) && n > 0) return n;
  const bid = row.booking_id;
  const b = typeof bid === 'number' ? bid : Number(String(bid ?? '').trim());
  if (Number.isFinite(b) && b > 0) return b;
  const pid = row.product_id;
  return typeof pid === 'number' ? pid : Number(pid) || 0;
}

/** Календарный день YYYY-MM-DD по Москве для момента `at` (по умолчанию — «сейчас» для брони, не сырой часовой пояс телефона). */
export function todayISOMoscow(at: Date = new Date(nowForBookingCompareMs())): string {
  return formatISODateMoscow(at);
}

/** Адрес из списка клубов; если не нашли — вернём пустую строку, а UI подставит человекочитаемый fallback. */
export function cafeLabel(icafeId: string, addressById: Map<number, string>): string {
  const n = Number(icafeId);
  if (Number.isFinite(n) && addressById.has(n)) return addressById.get(n)!;
  return '';
}

/** Все брони пользователя, которые попадают на календарный день `todayISO` (YYYY-MM-DD) по Москве. */
export function listTodaysBookings(
  books: AllBooksData | undefined,
  todayISO: string,
  cafeAddressById: Map<number, string>,
): TodayBookingLine[] {
  if (!books) return [];
  const out: TodayBookingLine[] = [];
  for (const [icafeId, rowsRaw] of Object.entries(books)) {
    const rows = Array.isArray(rowsRaw) ? rowsRaw : rowsRaw ? [rowsRaw as MemberBookingRow] : [];
    for (const row of rows) {
      const iv = intervalFromMemberRow(row);
      if (!iv || !intervalTouchesCalendarDay(iv, todayISO)) continue;
      const offerId = memberOfferIdForApi(row);
      out.push({
        key: `${icafeId}-${row.product_id}-${row.product_pc_name}-${row.product_available_date_local_from}`,
        icafeId,
        clubLabel: cafeLabel(icafeId, cafeAddressById),
        pcName: row.product_pc_name,
        iv,
        memberOfferId: offerId,
      });
    }
  }
  out.sort((a, b) => a.iv.start.getTime() - b.iv.start.getTime());
  return out;
}

export function formatIntervalClock(locale: string, iv: TimeInterval): { from: string; to: string } {
  const loc = locale === 'en' ? 'en' : 'ru';
  return {
    from: formatInstantMoscowWallForLocale(iv.start, loc),
    to: formatInstantMoscowWallForLocale(iv.end, loc),
  };
}

/** Первая бронь на том же ПК, пересекающаяся с планируемым интервалом. */
export function findOverlappingBookingForPc(
  rows: MemberBookingRow[] | undefined,
  pcName: string,
  plan: TimeInterval,
): MemberBookingRow | null {
  if (!rows?.length) return null;
  for (const row of rows) {
    if (!pcNamesLooselyEqual(row.product_pc_name, pcName)) continue;
    const iv = intervalFromMemberRow(row);
    if (iv && intervalsOverlap(iv, plan)) return row;
  }
  return null;
}

/** Активная бронь на ПК (now внутри интервала) — время окончания для подписи «занят до …». */
function activeBookingEndForPc(
  rows: MemberBookingRow[] | undefined,
  pcName: string,
  nowMs: number,
): Date | null {
  if (!rows?.length) return null;
  let best: Date | null = null;
  for (const row of rows) {
    if (!pcNamesLooselyEqual(row.product_pc_name, pcName)) continue;
    const iv = intervalFromMemberRow(row);
    if (!iv) continue;
    if (nowMs >= iv.start.getTime() && nowMs < iv.end.getTime()) {
      if (!best || iv.end.getTime() > best.getTime()) best = iv.end;
    }
  }
  return best;
}

/**
 * Момент освобождения ПК для подписи в списке бронирования (бронь клуба, окно из available-pcs, или активная сессия).
 */
export function busyUntilInstantForPcListItem(
  item: PcListItem,
  planIv: TimeInterval | null,
  cafeRows: MemberBookingRow[],
  bookingNowMs: number,
): Date | null {
  if (planIv) {
    if (cafeRows.length) {
      const row = findOverlappingBookingForPc(cafeRows, item.pc_name, planIv);
      if (row) {
        const iv = intervalFromMemberRow(row);
        if (iv) return iv.end;
      }
    }
    const ivPc = intervalFromPcBookingFields(item);
    if (ivPc && intervalsOverlap(ivPc, planIv)) return ivPc.end;
    if (item.is_using) {
      const t = bookingNowMs;
      if (t >= planIv.start.getTime() && t < planIv.end.getTime()) {
        const end = activeBookingEndForPc(cafeRows, item.pc_name, bookingNowMs);
        if (end) return end;
      }
    }
    return null;
  }

  if (item.is_using) {
    return activeBookingEndForPc(cafeRows, item.pc_name, bookingNowMs);
  }
  return null;
}

/**
 * Имена ПК (нижний регистр), на которых есть незавершённая бронь, пересекающаяся с планируемым слотом.
 * Учитывает все строки списка (все участники клуба).
 */
export function pcLowerNamesWithBookingOverlappingPlan(
  rows: MemberBookingRow[] | undefined,
  plan: TimeInterval,
  nowMs: number = nowForBookingCompareMs(),
): Set<string> {
  const set = new Set<string>();
  if (!rows?.length) return set;
  for (const row of rows) {
    if (bookingRowLifecycleStatus(row, nowMs) === 'ended') continue;
    const iv = intervalFromMemberRow(row);
    if (!iv || !intervalsOverlap(iv, plan)) continue;
    set.add(String(row.product_pc_name).trim().toLowerCase());
  }
  return set;
}

/** Предстоящая или идущая бронь на аккаунте, пересекающаяся по времени с планируемым интервалом (любой клуб / ПК). */
export function findOverlappingOutstandingBooking(
  data: AllBooksData | undefined,
  plan: TimeInterval,
  nowMs: number = nowForBookingCompareMs(),
): { row: MemberBookingRow; iv: TimeInterval; icafeId: string } | null {
  if (!data) return null;
  for (const [icafeId, rowsRaw] of Object.entries(data)) {
    const rows = Array.isArray(rowsRaw) ? rowsRaw : rowsRaw ? [rowsRaw as MemberBookingRow] : [];
    for (const row of rows) {
      const s = bookingRowLifecycleStatus(row, nowMs);
      if (s !== 'upcoming' && s !== 'active') continue;
      const iv = intervalFromMemberRow(row);
      if (iv && intervalsOverlap(iv, plan)) return { row, iv, icafeId };
    }
  }
  return null;
}

export type BookingLifecycle = 'upcoming' | 'active' | 'ended';

/** Интервал завершён относительно `nowMs` из `nowForBookingCompareMs()` (московские слоты как UTC-моменты). */
export function bookingIntervalEnded(iv: TimeInterval, nowMs: number): boolean {
  return nowMs >= iv.end.getTime();
}

/** Состояние брони относительно «сейчас» (только выровненное время API, без локального часового пояса телефона). */
export function bookingRowLifecycleStatus(
  row: MemberBookingRow,
  nowMs: number = nowForBookingCompareMs(),
): BookingLifecycle | null {
  const iv = intervalFromMemberRow(row);
  if (!iv) return null;
  if (bookingIntervalEnded(iv, nowMs)) return 'ended';
  if (nowMs >= iv.start.getTime()) return 'active';
  return 'upcoming';
}

/** Стабильный ключ строки брони для UI (отмена, спиннер). */
export function memberBookingRowStableKey(icafeId: string, row: MemberBookingRow): string {
  return `${icafeId}-${row.product_id}-${row.product_pc_name}-${row.product_available_date_local_from}`;
}

/**
 * Объединяет строки броней для пересечений слота: ответ iCafe по клубу + «мои брони» из all-books.
 * Дедупликация по {@link memberBookingRowStableKey} — мои брони не пропадают, если GET /bookings вернул неполный список.
 */
export function mergeBookingRowsForCafeOverlap(
  icafeId: number,
  ...lists: (MemberBookingRow[] | undefined)[]
): MemberBookingRow[] {
  const m = new Map<string, MemberBookingRow>();
  const id = String(icafeId);
  for (const list of lists) {
    for (const row of list ?? []) {
      m.set(memberBookingRowStableKey(id, row), row);
    }
  }
  return [...m.values()];
}

/** Не показывать отмену, если до начала слота осталось не больше этого времени (политика клуба / UX). */
export const BOOKING_CANCEL_CUTOFF_MS_BEFORE_START = 5 * 60 * 1000;

/**
 * Окно отмены в UI закрыто: с за 5 минут до начала слота и до его конца (включая идущую сессию).
 */
export function isMemberBookingCancelDisabledByCutoff(iv: TimeInterval, nowMs: number): boolean {
  const msUntilStart = iv.start.getTime() - nowMs;
  return msUntilStart <= BOOKING_CANCEL_CUTOFF_MS_BEFORE_START;
}

/** «Повторить» в «Мои брони» для незавершённой брони — только в последние 5 минут до конца слота. */
export const BOOKING_REPEAT_VISIBLE_MS_BEFORE_END = 5 * 60 * 1000;

export function canShowRepeatMemberBookingRow(row: MemberBookingRow, nowMs: number): boolean {
  const iv = intervalFromMemberRow(row);
  if (!iv || bookingIntervalEnded(iv, nowMs)) return false;
  const msUntilEnd = iv.end.getTime() - nowMs;
  return msUntilEnd > 0 && msUntilEnd <= BOOKING_REPEAT_VISIBLE_MS_BEFORE_END;
}

/** Можно ли вызывать POST /booking-cancel для этой строки (ещё не конец слота, есть offer id и member_id). */
export function canCancelMemberBookingRow(
  row: MemberBookingRow,
  opts: { memberIdPresent: boolean; nowMs?: number },
): boolean {
  if (!opts.memberIdPresent) return false;
  const now = opts.nowMs ?? nowForBookingCompareMs();
  const iv = intervalFromMemberRow(row);
  const offerId = memberOfferIdForApi(row);
  if (!iv || bookingIntervalEnded(iv, now)) return false;
  if (isMemberBookingCancelDisabledByCutoff(iv, now)) return false;
  return offerId > 0;
}

/**
 * Есть ли хотя бы одна незавершённая бронь (конец интервала в будущем).
 * Для кнопки «Забронировать» используйте {@link findOverlappingOutstandingBooking} — там запрет только при
 * пересечении выбранного слота с уже существующей бронью по времени, а не «ровно одна бронь на аккаунт».
 */
export function hasOutstandingMemberBooking(
  data: AllBooksData | undefined,
  nowMs: number = nowForBookingCompareMs(),
): boolean {
  if (!data) return false;
  for (const rowsRaw of Object.values(data)) {
    const rows = Array.isArray(rowsRaw) ? rowsRaw : rowsRaw ? [rowsRaw as MemberBookingRow] : [];
    for (const row of rows) {
      const s = bookingRowLifecycleStatus(row, nowMs);
      if (s === 'upcoming' || s === 'active') return true;
    }
  }
  return false;
}

/** Все будущие/текущие брони (конец интервала позже `now`), по возрастанию времени начала. */
export function listFutureBookingLines(
  books: AllBooksData | undefined,
  cafeAddressById: Map<number, string>,
  nowMs: number = nowForBookingCompareMs(),
): TodayBookingLine[] {
  if (!books) return [];
  const out: TodayBookingLine[] = [];
  for (const [icafeId, rowsRaw] of Object.entries(books)) {
    const rows = Array.isArray(rowsRaw) ? rowsRaw : rowsRaw ? [rowsRaw as MemberBookingRow] : [];
    for (const row of rows) {
      if (bookingRowLifecycleStatus(row, nowMs) === 'ended') continue;
      const iv = intervalFromMemberRow(row);
      if (!iv || bookingIntervalEnded(iv, nowMs)) continue;
      const offerId = memberOfferIdForApi(row);
      out.push({
        key: `${icafeId}-${row.product_id}-${row.product_pc_name}-${row.product_available_date_local_from}`,
        icafeId,
        clubLabel: cafeLabel(icafeId, cafeAddressById),
        pcName: row.product_pc_name,
        iv,
        memberOfferId: offerId,
      });
    }
  }
  out.sort((a, b) => a.iv.start.getTime() - b.iv.start.getTime());
  return out;
}

/** Баннер: сегодня vs другие предстоящие (не на сегодняшнем календарном дне). */
export function getBannerBookingSections(
  books: AllBooksData | undefined,
  cafeAddressById: Map<number, string>,
  nowMs: number = nowForBookingCompareMs(),
): { today: TodayBookingLine[]; otherUpcoming: TodayBookingLine[] } {
  const day = todayISOMoscow(new Date(nowMs));
  const future = listFutureBookingLines(books, cafeAddressById, nowMs);
  const today = future.filter((l) => intervalTouchesCalendarDay(l.iv, day));
  const otherUpcoming = future.filter((l) => !intervalTouchesCalendarDay(l.iv, day));
  return { today, otherUpcoming };
}

export function sortMemberBookingRows(
  rows: MemberBookingRow[],
  nowMs: number = nowForBookingCompareMs(),
): MemberBookingRow[] {
  const now = nowMs;
  const rank = (s: BookingLifecycle | null) =>
    s === 'active' ? 0 : s === 'upcoming' ? 1 : s === 'ended' ? 2 : 3;
  return [...rows].sort((a, b) => {
    const sa = bookingRowLifecycleStatus(a, now);
    const sb = bookingRowLifecycleStatus(b, now);
    const d = rank(sa) - rank(sb);
    if (d !== 0) return d;
    const ia = intervalFromMemberRow(a);
    const ib = intervalFromMemberRow(b);
    if (sa === 'ended' && sb === 'ended')
      return (ib?.end.getTime() ?? 0) - (ia?.end.getTime() ?? 0);
    return (ia?.start.getTime() ?? 0) - (ib?.start.getTime() ?? 0);
  });
}
