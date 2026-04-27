import type { AvailablePcsData, CafeItem, PcListItem } from '../../api/types';
import {
  addCalendarDaysMoscow,
  formatInstantInMoscow,
  formatISODateMoscow,
  moscowWallTimeToUtc,
} from '../../datetime/mskTime';
import { bookingFlowApi } from '../../api/endpoints';
import { nowForBookingCompareMs } from '../../datetime/serverBookingClock';
import type { BuildBookingTimeSlotsOptions } from './bookingTimeSlots';
import { snapWindowToBookableSlot } from './bookingTimeSlots';
import {
  combineServerISODateAndTime,
  effectivePcBusyForPlan,
  plannedInterval,
  planIntervalFromWindowStart,
  windowStartFromAvailablePcs,
  type TimeInterval,
} from './bookingTimeUtils';
import { comparePcByZoneThenName, pcZoneKindFromPc, type PcZoneKind } from './pcZoneKind';
import { pcNamesLooselyEqual } from './pcNameMatch';
import { pcMatchesNearestZoneFilter, type NearestZoneFilter } from './nearestZoneFilter';

function findPcRowForLockedName(pcs: PcListItem[], lockedName: string): PcListItem | undefined {
  const lock = lockedName.trim();
  if (!lock) return undefined;
  return pcs.find((x) => pcNamesLooselyEqual(String(x.pc_name), lock));
}

function normalizeLockedPcNames(
  lockedNames: readonly (string | null | undefined)[] | null | undefined,
): string[] {
  const out: string[] = [];
  for (const raw of lockedNames ?? []) {
    const name = String(raw ?? '').trim();
    if (!name) continue;
    if (out.some((x) => pcNamesLooselyEqual(x, name))) continue;
    out.push(name);
  }
  return out;
}

/**
 * Если выбран конкретный ПК, а в ответе API его строки нет (или другое написание имени),
 * объединяем со снимком с экрана — иначе поиск по «только этот ПК» всегда пустой.
 */
function ensureLockedPcInNearestList(
  pcList: PcListItem[],
  lockedName: string | null | undefined,
  snapshot: PcListItem | null | undefined,
): PcListItem[] {
  const lock = lockedName?.trim();
  if (!lock) return pcList;
  if (findPcRowForLockedName(pcList, lock)) return pcList;
  if (snapshot && pcNamesLooselyEqual(String(snapshot.pc_name), lock)) {
    return [...pcList, snapshot];
  }
  return pcList;
}

function ensureLockedPcsInNearestList(
  pcList: PcListItem[],
  lockedNames: readonly string[],
  snapshots: readonly PcListItem[],
): PcListItem[] {
  let out = pcList;
  for (const lock of lockedNames) {
    const snap = snapshots.find((x) => pcNamesLooselyEqual(String(x.pc_name), lock));
    const merged = ensureLockedPcInNearestList(out, lock, snap ?? null);
    if (merged !== out) out = merged;
  }
  return out;
}

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

const busyOptsNearest: { findWindowListSemantics: true } = { findWindowListSemantics: true };

/**
 * Как {@link hasPartyCapacityForNearest}, но при заданном `lockedPcName` проверяется свободен ли
 * только этот ПК (имя) в рамках фильтра зон.
 */
function hasPartyOrLockedPcCapacityForNearest(
  pcs: PcListItem[],
  planIv: TimeInterval,
  zoneFilter: NearestZoneFilter,
  partySize: number,
  nowMs: number,
  lockedPcNames: readonly string[] | null | undefined,
): boolean {
  const locks = normalizeLockedPcNames(lockedPcNames);
  if (locks.length > 0) {
    for (const lock of locks) {
      const p = findPcRowForLockedName(pcs, lock);
      if (!p) return false;
      if (!zonesToScanForNearest(zoneFilter).includes(pcZoneKindFromPc(p))) return false;
      if (!pcMatchesNearestZoneFilter(p, zoneFilter)) return false;
      if (effectivePcBusyForPlan(p, planIv, nowMs, busyOptsNearest)) return false;
    }
    return true;
  }
  return hasPartyCapacityForNearest(pcs, planIv, zoneFilter, partySize, nowMs);
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

/**
 * Проверка свободен ли указанный по имени ПК на интервале; для согласования с
 * {@link hasPartyOrLockedPcCapacityForNearest} при `lockedPcName`.
 */
export function pickSpecificPcForPlan(
  pcs: PcListItem[],
  planIv: TimeInterval,
  zoneFilter: NearestZoneFilter,
  lockedPcName: string,
  nowMs: number = nowForBookingCompareMs(),
): PcListItem[] {
  const lock = lockedPcName.trim();
  if (!lock) return [];
  const p = findPcRowForLockedName(pcs, lock);
  if (!p) return [];
  if (!zonesToScanForNearest(zoneFilter).includes(pcZoneKindFromPc(p))) return [];
  if (!pcMatchesNearestZoneFilter(p, zoneFilter)) return [];
  if (effectivePcBusyForPlan(p, planIv, nowMs, busyOptsNearest)) return [];
  return [p];
}

/** Проверка свободны ли все указанные ПК одновременно; порядок имён сохраняется. */
export function pickSpecificPcsForPlan(
  pcs: PcListItem[],
  planIv: TimeInterval,
  zoneFilter: NearestZoneFilter,
  lockedPcNames: readonly string[],
  nowMs: number = nowForBookingCompareMs(),
): PcListItem[] {
  const locks = normalizeLockedPcNames(lockedPcNames);
  if (locks.length === 0) return [];
  const out: PcListItem[] = [];
  for (const lock of locks) {
    const p = findPcRowForLockedName(pcs, lock);
    if (!p) return [];
    if (!zonesToScanForNearest(zoneFilter).includes(pcZoneKindFromPc(p))) return [];
    if (!pcMatchesNearestZoneFilter(p, zoneFilter)) return [];
    if (effectivePcBusyForPlan(p, planIv, nowMs, busyOptsNearest)) return [];
    out.push(p);
  }
  return out;
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
  /**
   * Шаг сетки и техперерыв — как у {@link snapWindowToBookableSlot} на экране брони.
   * Если передать, проверка мест и дозапрос `pc_list` используют тот же слот, что и UI (иначе
   * «сырое» окно API и снап к сетке расходятся — ПК помечаются занятыми и окно не находится).
   */
  bookableSlotOptions?: BuildBookingTimeSlotsOptions;
  /**
   * Поиск окон, где свободен только этот ПК (по `pc_name` из API).
   * `null`/`undefined` — как обычно по `partySize` и зоне.
   */
  lockedPcName?: string | null;
  /** Поиск окон, где свободны одновременно все указанные ПК (до 2 в UI). */
  lockedPcNames?: string[] | null;
  /**
   * Строка выбранного ПК с экрана схемы: если в `pc_list` ответа нет этой машины (часто при занятости),
   * подмешиваем для проверки и карточки результата.
   */
  lockedPcSnapshot?: PcListItem | null;
  /** Снимки строк выбранных ПК с экрана схемы; используются как fallback, когда API не вернул `pc_list`. */
  lockedPcSnapshots?: PcListItem[] | null;
};

const DISCOVERY_MAX_ITERS = 20;
/** Если якорь не сдвигается (битые строки даты/времени или ответ API), выходим после стольких повторов подряд. */
const MAX_STAGNANT_ANCHOR = 4;
/** После длинной серии промахов увеличиваем шаг, чтобы не «ползти» по таймлайну слишком медленно. */
const MAX_MISS_STREAK = 18;
/** Тайм-бюджет одного запуска поиска (мс): возвращаем всё, что успели найти. */
const DEFAULT_MAX_SEARCH_MS = 10_000;
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

function stepMultiplierForMissStreak(missStreak: number): number {
  if (missStreak >= 12) return 4;
  if (missStreak >= 8) return 3;
  if (missStreak >= 4) return 2;
  return 1;
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

/** Поля даты/времени для повторного `available-pcs` при пустом списке — в согласовании со снапом к сетке. */
function moscowFieldsForSlotRefetch(
  windowStart: Date,
  bookableSlotOptions: BuildBookingTimeSlotsOptions | undefined,
): { date: string; time: string } {
  if (!bookableSlotOptions) return formatInstantInMoscow(windowStart);
  const slot = snapWindowToBookableSlot(windowStart, bookableSlotOptions);
  const d = combineServerISODateAndTime(slot.dateISO, slot.timeStart);
  return d ? formatInstantInMoscow(d) : formatInstantInMoscow(windowStart);
}

/**
 * Интервал плана для поиска ближайшего окна: совпадает с тем, что затем использует
 * {@link snapWindowToBookableSlot} + {@link plannedInterval} в карточке результата.
 */
function planIvForNearestDiscovery(
  windowStart: Date,
  mins: number,
  bookableSlotOptions: BuildBookingTimeSlotsOptions | undefined,
): TimeInterval | null {
  if (!bookableSlotOptions) return planIntervalFromWindowStart(windowStart, mins);
  const slot = snapWindowToBookableSlot(windowStart, bookableSlotOptions);
  return plannedInterval(slot.dateISO, slot.timeStart, mins);
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
    /** Ограничение по времени на один проход поиска. */
    maxSearchMs?: number;
    signal?: AbortSignal;
  },
): Promise<NearestWindowCandidate[]> {
  const maxSlots = Math.min(20, Math.max(1, options.maxSlots));
  const stepMinsRaw = options.stepAdvanceMins ?? 30;
  const stepMins = typeof stepMinsRaw === 'number' && stepMinsRaw > 0 ? stepMinsRaw : 30;
  const maxSearchMsRaw = options.maxSearchMs ?? DEFAULT_MAX_SEARCH_MS;
  const maxSearchMs =
    typeof maxSearchMsRaw === 'number' && Number.isFinite(maxSearchMsRaw)
      ? Math.max(500, Math.min(20_000, Math.floor(maxSearchMsRaw)))
      : DEFAULT_MAX_SEARCH_MS;
  const startedAtMs = Date.now();
  const stepMs = stepMins * 60 * 1000;
  const results: NearestWindowCandidate[] = [];
  const seen = new Set<number>();
  const refetchBySlot = new Map<string, PcListItem[]>();
  const signal = options.signal;

  const searchDay = params.searchDayIsoMoscow?.trim().slice(0, 10) ?? '';
  const searchDayActive = searchDay.length === 10;
  const minWinMs = minValidWindowStartMs(options.bookingNowMs, searchDayActive ? searchDay : null);
  const maxWinMs = searchDayActive ? moscowDayEndInclusiveMs(searchDay) : null;
  const requestedLockedNames = normalizeLockedPcNames(
    params.lockedPcNames?.length ? params.lockedPcNames : [params.lockedPcName],
  );
  const requestedLockedSnapshots = (params.lockedPcSnapshots ?? []).length
    ? (params.lockedPcSnapshots ?? []).filter(Boolean)
    : params.lockedPcSnapshot
      ? [params.lockedPcSnapshot]
      : [];

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
  let missStreak = 0;

  for (let iter = 0; iter < DISCOVERY_MAX_ITERS && results.length < maxSlots; iter++) {
    throwIfAborted(signal);
    if (Date.now() - startedAtMs >= maxSearchMs) break;

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
    if (
      !windowStart &&
      requestedLockedNames.length > 0 &&
      (Boolean(data.time_frame?.trim()) || (data.pc_list ?? []).length > 0)
    ) {
      const fromAnchor = combineServerISODateAndTime(anchor.date.trim(), anchor.time.trim());
      if (fromAnchor) windowStart = fromAnchor;
    }
    if (!windowStart) {
      missStreak = Math.min(MAX_MISS_STREAK, missStreak + 1);
      anchor = advanceAnchorByStep(
        anchor,
        stepMs * stepMultiplierForMissStreak(missStreak),
        options.bookingNowMs,
      );
      continue;
    }

    const todayIsoMoscow = formatISODateMoscow(new Date(options.bookingNowMs));
    if (formatISODateMoscow(windowStart) < todayIsoMoscow) {
      missStreak = Math.min(MAX_MISS_STREAK, missStreak + 1);
      anchor = advanceAnchorByStep(
        anchor,
        stepMs * stepMultiplierForMissStreak(missStreak),
        options.bookingNowMs,
      );
      continue;
    }

    const startMs = windowStart.getTime();

    if (startMs < minWinMs) {
      missStreak = Math.min(MAX_MISS_STREAK, missStreak + 1);
      const jumpMs = stepMs * stepMultiplierForMissStreak(missStreak);
      anchor = anchorFromMs(startMs + jumpMs, stepMs);
      continue;
    }

    if (maxWinMs != null && startMs > maxWinMs) {
      break;
    }

    if (searchDayActive && formatISODateMoscow(windowStart) !== searchDay) {
      missStreak = Math.min(MAX_MISS_STREAK, missStreak + 1);
      const jumpMs = stepMs * stepMultiplierForMissStreak(missStreak);
      anchor = anchorFromMs(startMs + jumpMs, stepMs);
      continue;
    }

    const planIv = planIvForNearestDiscovery(
      windowStart,
      params.mins,
      params.bookableSlotOptions,
    );
    if (!planIv) {
      missStreak = Math.min(MAX_MISS_STREAK, missStreak + 1);
      const jumpMs = stepMs * stepMultiplierForMissStreak(missStreak);
      anchor = anchorFromMs(startMs + jumpMs, stepMs);
      continue;
    }

    let dataForUi = data;
    const shouldRefetchEmptyFindWindowList =
      (!dataForUi.pc_list || dataForUi.pc_list.length === 0) &&
      !!dataForUi.time_frame?.trim();
    const shouldRefetchSnappedSlot =
      !!params.bookableSlotOptions &&
      planIv.start.getTime() !== windowStart.getTime();
    if (shouldRefetchEmptyFindWindowList || shouldRefetchSnappedSlot) {
      const snap = moscowFieldsForSlotRefetch(windowStart, params.bookableSlotOptions);
      const slotKey = `${snap.date}\0${snap.time}\0${params.mins}\0${params.priceName ?? ''}`;
      const cachedPcList = refetchBySlot.get(slotKey);
      if (cachedPcList) {
        dataForUi = { ...dataForUi, pc_list: cachedPcList };
      } else {
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
          const filledList = filled.pc_list ?? [];
          refetchBySlot.set(slotKey, filledList);
          dataForUi = { ...dataForUi, pc_list: filledList };
        } catch {
          // оставляем как есть — ниже может отсечься по вместимости
        }
      }
    }

    const originalPcList = dataForUi.pc_list ?? [];
    const mergedPcList = ensureLockedPcsInNearestList(
      originalPcList,
      requestedLockedNames,
      requestedLockedSnapshots,
    );
    if (mergedPcList !== originalPcList) {
      dataForUi = { ...dataForUi, pc_list: mergedPcList };
    }

    const dedupMs = planIv.start.getTime();
    if (seen.has(dedupMs)) {
      missStreak = Math.min(MAX_MISS_STREAK, missStreak + 1);
      const jumpMs = stepMs * stepMultiplierForMissStreak(missStreak);
      anchor = anchorFromMs(dedupMs + jumpMs, stepMs);
      continue;
    }

    if (
      !hasPartyOrLockedPcCapacityForNearest(
        dataForUi.pc_list ?? [],
        planIv,
        params.zoneFilter,
        params.partySize,
        options.bookingNowMs,
        requestedLockedNames,
      )
    ) {
      missStreak = Math.min(MAX_MISS_STREAK, missStreak + 1);
      const jumpMs = stepMs * stepMultiplierForMissStreak(missStreak);
      anchor = anchorFromMs(startMs + jumpMs, stepMs);
      continue;
    }

    missStreak = 0;
    seen.add(dedupMs);
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
