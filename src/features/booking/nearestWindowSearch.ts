import type { AvailablePcsData, CafeItem, PcListItem } from '../../api/types';
import {
  addCalendarDaysMoscow,
  formatInstantInMoscow,
  formatISODateMoscow,
  moscowWallTimeToUtc,
} from '../../datetime/mskTime';
import { bookingFlowApi } from '../../api/endpoints';
import { nowForBookingCompareMs } from '../../datetime/serverBookingClock';
import {
  combineServerISODateAndTime,
  effectivePcBusyForPlan,
  planIntervalFromWindowStart,
  windowStartFromAvailablePcs,
  type TimeInterval,
} from './bookingTimeUtils';
import { comparePcByZoneThenName, pcZoneKindFromPc, type PcZoneKind } from './pcZoneKind';
import { pcMatchesNearestZoneFilter, type NearestZoneFilter } from './nearestZoneFilter';

export type NearestWindowCandidate = {
  cafe: CafeItem;
  data: AvailablePcsData;
  windowStart: Date;
};

const NAMED_ZONES: Exclude<PcZoneKind, 'Other'>[] = ['VIP', 'BootCamp', 'GameZone'];

/** Зоны, по которым ищем места при «любой зоне»: именованные + Прочее (иначе ПК без VIP/BC/GZ никогда не попадали в выдачу). */
function zonesToScanForNearest(zoneFilter: NearestZoneFilter): PcZoneKind[] {
  if (zoneFilter.mode === 'any') return [...NAMED_ZONES, 'Other'];
  return zoneFilter.kinds;
}

/** Достаточно свободных мест в одной из допустимых зон под размер компании. */
export function hasPartyCapacityForNearest(
  pcs: PcListItem[],
  planIv: TimeInterval,
  zoneFilter: NearestZoneFilter,
  partySize: number,
  nowMs: number = nowForBookingCompareMs(),
): boolean {
  const zonesToCheck = zonesToScanForNearest(zoneFilter);
  const busyOpts = { findWindowListSemantics: true } as const;
  for (const zone of zonesToCheck) {
    const n = pcs.filter((p) => {
      if (pcZoneKindFromPc(p) !== zone) return false;
      if (!pcMatchesNearestZoneFilter(p, zoneFilter)) return false;
      return !effectivePcBusyForPlan(p, planIv, nowMs, busyOpts);
    }).length;
    if (n >= partySize) return true;
  }
  return false;
}

/** Подобрать до `partySize` мест в одной зоне, согласованно с фильтром поиска. */
export function pickPcsForPartyForPlan(
  pcs: PcListItem[],
  planIv: TimeInterval,
  zoneFilter: NearestZoneFilter,
  partySize: number,
  nowMs: number = nowForBookingCompareMs(),
): PcListItem[] {
  const zonesToCheck = zonesToScanForNearest(zoneFilter);
  const busyOpts = { findWindowListSemantics: true } as const;
  for (const zone of zonesToCheck) {
    const list = pcs.filter((p) => {
      if (pcZoneKindFromPc(p) !== zone) return false;
      if (!pcMatchesNearestZoneFilter(p, zoneFilter)) return false;
      return !effectivePcBusyForPlan(p, planIv, nowMs, busyOpts);
    });
    if (list.length >= partySize) {
      const sorted = [...list].sort(comparePcByZoneThenName);
      return sorted.slice(0, partySize);
    }
  }
  return [];
}

export type NearestWindowSearchParams = {
  dateStart: string;
  timeStart: string;
  mins: number;
  priceName?: string;
  partySize: number;
  zoneFilter: NearestZoneFilter;
};

/** Параметры поиска слотов без якоря — начало с «сейчас» или с начала выбранного календарного дня (МСК). */
export type NearestWindowDiscoveryParams = {
  mins: number;
  priceName?: string;
  partySize: number;
  zoneFilter: NearestZoneFilter;
  /**
   * Ограничить поиск одним календарным днём (МСК). `null`/undefined — любой день от «сейчас».
   * Сегодняшний день: якорь не раньше текущего момента. Будущий день: с 00:00 МСК.
   */
  searchDayIsoMoscow?: string | null;
  /**
   * Нижняя граница первого якоря (дата/время МСК), если пользователь выбрал конкретное время.
   * `null` — как без «раннего старта» (только день / «сейчас»).
   */
  earliestStartMoscow?: { date: string; time: string } | null;
};

const DISCOVERY_MAX_ITERS = 48;
/** Если якорь не сдвигается (битые строки даты/времени или ответ API), выходим после стольких повторов подряд. */
const MAX_STAGNANT_ANCHOR = 4;
/** Допуск на рассинхрон часов устройства и сервера (мс). */
const BOOKING_NOW_SKEW_MS = 90_000;

function moscowDayStartMs(iso: string): number {
  const [y, mo, d] = iso.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return NaN;
  return moscowWallTimeToUtc(y, mo, d, 0, 0, 0).getTime();
}

function moscowDayEndInclusiveMs(dayIso: string): number {
  const next = addCalendarDaysMoscow(dayIso.trim().slice(0, 10), 1);
  return moscowDayStartMs(next) - 1;
}

function minValidWindowStartMs(bookingNowMs: number, searchDayIso: string | null | undefined): number {
  const now = new Date(bookingNowMs);
  const todayIso = formatISODateMoscow(now);
  if (!searchDayIso || searchDayIso.trim() === '') {
    return bookingNowMs - BOOKING_NOW_SKEW_MS;
  }
  const day = searchDayIso.trim().slice(0, 10);
  if (day < todayIso) return bookingNowMs - BOOKING_NOW_SKEW_MS;
  if (day === todayIso) return bookingNowMs - BOOKING_NOW_SKEW_MS;
  return moscowDayStartMs(day) - BOOKING_NOW_SKEW_MS;
}

function anchorKey(a: { date: string; time: string }): string {
  return `${a.date.trim()}\0${a.time.trim()}`;
}

function snapMsUpToStep(ms: number, stepMs: number): number {
  if (!Number.isFinite(ms)) return ms;
  const safeStep = Math.max(60_000, Math.floor(stepMs));
  const rem = ms % safeStep;
  return rem === 0 ? ms : ms + safeStep - rem;
}

function anchorFromMs(ms: number, stepMs: number): { date: string; time: string } {
  return formatInstantInMoscow(new Date(snapMsUpToStep(ms, stepMs)));
}

/**
 * Сдвиг якоря на `stepMs` вперёд. Раньше при неразборчивом `date`/`time` возвращался тот же якорь —
 * цикл десятки раз бил в API с одним запросом (выглядело как «вечный поиск»).
 */
function advanceAnchorByStep(
  anchor: { date: string; time: string },
  stepMs: number,
  bookingNowMs: number,
): { date: string; time: string } {
  const t = combineServerISODateAndTime(anchor.date.trim(), anchor.time.trim());
  const baseMs = t ? t.getTime() : bookingNowMs;
  return anchorFromMs(baseMs + stepMs, stepMs);
}

/** Базовый якорь без учёта «раннего старта» по выбранному пользователем времени. */
function initialDiscoveryAnchorWithoutEarliest(
  bookingNowMs: number,
  searchDayIso: string | null | undefined,
): { date: string; time: string } {
  const now = new Date(bookingNowMs);
  const todayIso = formatISODateMoscow(now);
  if (!searchDayIso || searchDayIso.trim() === '') {
    return formatInstantInMoscow(now);
  }
  const day = searchDayIso.trim().slice(0, 10);
  if (day < todayIso) {
    return formatInstantInMoscow(now);
  }
  if (day === todayIso) {
    return formatInstantInMoscow(now);
  }
  const start = moscowDayStartMs(day);
  if (!Number.isFinite(start)) return formatInstantInMoscow(now);
  return formatInstantInMoscow(new Date(start));
}

function discoveryAnchorMs(
  bookingNowMs: number,
  searchDayIso: string | null | undefined,
  earliestStart: { date: string; time: string } | null | undefined,
): number {
  const searchDay = searchDayIso?.trim().slice(0, 10) ?? '';
  const searchDayActive = searchDay.length === 10;
  const minMs = minValidWindowStartMs(bookingNowMs, searchDayActive ? searchDay : null);

  const basePair = initialDiscoveryAnchorWithoutEarliest(bookingNowMs, searchDayActive ? searchDay : null);
  const baseComb = combineServerISODateAndTime(basePair.date.trim(), basePair.time.trim());
  const baseMs = baseComb ? baseComb.getTime() : bookingNowMs;

  let ms = Math.max(minMs, baseMs);
  if (earliestStart) {
    const pref = combineServerISODateAndTime(earliestStart.date.trim(), earliestStart.time.trim());
    if (pref) ms = Math.max(ms, pref.getTime());
  }
  return ms;
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    const e = new Error('Aborted');
    e.name = 'AbortError';
    throw e;
  }
}

/**
 * Несколько ближайших окон в **одном** клубе: первый якорь — max(минимально допустимое, «сейчас» / 00:00 дня / выбранное пользователем время в `earliestStartMoscow`).
 * Дальше каждый следующий запрос — от конца предыдущего окна (+1 мин), чтобы получить альтернативы по времени.
 * Окна строго в прошлом (относительно bookingNowMs) и с неверной календарной датой при фильтре по дню отбрасываются.
 */
export async function findNearestClubWindows(
  cafe: CafeItem,
  params: NearestWindowDiscoveryParams,
  options: {
    maxSlots: number;
    bookingNowMs: number;
    /** Шаг при «плохом» окне (нет мест в нужной зоне / дубликат ответа). */
    stepAdvanceMins?: number;
    signal?: AbortSignal;
  },
): Promise<NearestWindowCandidate[]> {
  const maxSlots = Math.min(20, Math.max(1, options.maxSlots));
  const stepMinsRaw = options.stepAdvanceMins ?? 30;
  const stepMins = typeof stepMinsRaw === 'number' && stepMinsRaw > 0 ? stepMinsRaw : 30;
  const stepMs = stepMins * 60 * 1000;
  const results: NearestWindowCandidate[] = [];
  const seen = new Set<number>();
  const signal = options.signal;

  const searchDay = params.searchDayIsoMoscow?.trim().slice(0, 10) ?? '';
  const searchDayActive = searchDay.length === 10;
  const minWinMs = minValidWindowStartMs(options.bookingNowMs, searchDayActive ? searchDay : null);
  const maxWinMs = searchDayActive ? moscowDayEndInclusiveMs(searchDay) : null;

  let anchor = anchorFromMs(
    discoveryAnchorMs(
      options.bookingNowMs,
      searchDayActive ? searchDay : null,
      params.earliestStartMoscow ?? null,
    ),
    stepMs,
  );
  let stagnant = 0;
  let prevAnchorStr = '';

  for (let iter = 0; iter < DISCOVERY_MAX_ITERS && results.length < maxSlots; iter++) {
    throwIfAborted(signal);

    if (searchDayActive && anchor.date > searchDay) {
      break;
    }

    const anchorStr = anchorKey(anchor);
    if (anchorStr === prevAnchorStr) {
      stagnant += 1;
      if (stagnant >= MAX_STAGNANT_ANCHOR) break;
    } else {
      stagnant = 0;
      prevAnchorStr = anchorStr;
    }

    const data = await bookingFlowApi.availablePcs({
      cafeId: cafe.icafe_id,
      dateStart: anchor.date,
      timeStart: anchor.time,
      mins: params.mins,
      isFindWindow: true,
      priceName: params.priceName || undefined,
      signal,
    });

    let windowStart = windowStartFromAvailablePcs(data, anchor.date, anchor.time);
    if (!windowStart) {
      anchor = advanceAnchorByStep(anchor, stepMs, options.bookingNowMs);
      continue;
    }

    const todayIsoMoscow = formatISODateMoscow(new Date(options.bookingNowMs));
    if (formatISODateMoscow(windowStart) < todayIsoMoscow) {
      anchor = advanceAnchorByStep(anchor, stepMs, options.bookingNowMs);
      continue;
    }

    const startMs = windowStart.getTime();
    if (seen.has(startMs)) {
      anchor = anchorFromMs(startMs + stepMs, stepMs);
      continue;
    }

    if (startMs < minWinMs) {
      anchor = anchorFromMs(startMs + stepMs, stepMs);
      continue;
    }

    if (maxWinMs != null && startMs > maxWinMs) {
      break;
    }

    if (searchDayActive && formatISODateMoscow(windowStart) !== searchDay) {
      anchor = anchorFromMs(startMs + stepMs, stepMs);
      continue;
    }

    let dataForUi = data;
    if (
      (!dataForUi.pc_list || dataForUi.pc_list.length === 0) &&
      dataForUi.time_frame?.trim()
    ) {
      const snap = formatInstantInMoscow(windowStart);
      try {
        throwIfAborted(signal);
        const filled = await bookingFlowApi.availablePcs({
          cafeId: cafe.icafe_id,
          dateStart: snap.date,
          timeStart: snap.time,
          mins: params.mins,
          isFindWindow: false,
          priceName: params.priceName || undefined,
          signal,
        });
        dataForUi = { ...dataForUi, pc_list: filled.pc_list ?? [] };
      } catch {
        // оставляем как есть — ниже может отсечься по вместимости
      }
    }

    const planIv = planIntervalFromWindowStart(windowStart, params.mins);
    if (!planIv) {
      anchor = anchorFromMs(startMs + stepMs, stepMs);
      continue;
    }

    if (
      !hasPartyCapacityForNearest(
        dataForUi.pc_list ?? [],
        planIv,
        params.zoneFilter,
        params.partySize,
        options.bookingNowMs,
      )
    ) {
      anchor = anchorFromMs(startMs + stepMs, stepMs);
      continue;
    }

    seen.add(startMs);
    results.push({ cafe, data: dataForUi, windowStart });

    const nextFromPlanMs = planIv.end.getTime() + 60 * 1000;
    anchor = Number.isFinite(nextFromPlanMs)
      ? anchorFromMs(nextFromPlanMs, stepMs)
      : advanceAnchorByStep(anchor, stepMs, options.bookingNowMs);
  }

  return results;
}

/** Одно ближайшее окно; якорь — переданные `dateStart`/`timeStart` (для совместимости). */
export async function findNearestClubWindow(
  cafe: CafeItem,
  params: NearestWindowSearchParams,
): Promise<NearestWindowCandidate | null> {
  const data = await bookingFlowApi.availablePcs({
    cafeId: cafe.icafe_id,
    dateStart: params.dateStart,
    timeStart: params.timeStart,
    mins: params.mins,
    isFindWindow: true,
    priceName: params.priceName || undefined,
  });
  const windowStart = windowStartFromAvailablePcs(data, params.dateStart, params.timeStart);
  if (!windowStart) return null;
  const planIv = planIntervalFromWindowStart(windowStart, params.mins);
  if (!planIv) return null;
  if (!hasPartyCapacityForNearest(data.pc_list ?? [], planIv, params.zoneFilter, params.partySize)) {
    return null;
  }
  return { cafe, data, windowStart };
}
