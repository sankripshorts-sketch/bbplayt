import type { AvailablePcsData, CafeItem, PcListItem } from '../../api/types';
import { formatInstantInMoscow } from '../../datetime/mskTime';
import { bookingFlowApi } from '../../api/endpoints';
import {
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

/** Достаточно свободных мест в одной из допустимых зон под размер компании. */
export function hasPartyCapacityForNearest(
  pcs: PcListItem[],
  planIv: TimeInterval,
  zoneFilter: NearestZoneFilter,
  partySize: number,
): boolean {
  const zonesToCheck: Exclude<PcZoneKind, 'Other'>[] =
    zoneFilter.mode === 'any' ? NAMED_ZONES : zoneFilter.kinds;
  for (const zone of zonesToCheck) {
    const n = pcs.filter((p) => {
      if (pcZoneKindFromPc(p) !== zone) return false;
      if (!pcMatchesNearestZoneFilter(p, zoneFilter)) return false;
      return !effectivePcBusyForPlan(p, planIv);
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
): PcListItem[] {
  const zonesToCheck: Exclude<PcZoneKind, 'Other'>[] =
    zoneFilter.mode === 'any' ? NAMED_ZONES : zoneFilter.kinds;
  for (const zone of zonesToCheck) {
    const list = pcs.filter((p) => {
      if (pcZoneKindFromPc(p) !== zone) return false;
      if (!pcMatchesNearestZoneFilter(p, zoneFilter)) return false;
      return !effectivePcBusyForPlan(p, planIv);
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

/** Параметры поиска слотов без якоря — начало всегда с «сейчас» (см. {@link findNearestClubWindows}). */
export type NearestWindowDiscoveryParams = {
  mins: number;
  priceName?: string;
  partySize: number;
  zoneFilter: NearestZoneFilter;
};

const DISCOVERY_MAX_ITERS = 48;

/**
 * Несколько ближайших окон в **одном** клубе: якорь — текущий момент (МСК), не выбранная в UI дата.
 * Дальше каждый следующий запрос — от конца предыдущего окна (+1 мин), чтобы получить альтернативы по времени.
 */
export async function findNearestClubWindows(
  cafe: CafeItem,
  params: NearestWindowDiscoveryParams,
  options: {
    maxSlots: number;
    bookingNowMs: number;
    /** Шаг при «плохом» окне (нет мест в нужной зоне / дубликат ответа). */
    stepAdvanceMins?: number;
  },
): Promise<NearestWindowCandidate[]> {
  const maxSlots = Math.min(20, Math.max(1, options.maxSlots));
  const stepMs = (options.stepAdvanceMins ?? 30) * 60 * 1000;
  const results: NearestWindowCandidate[] = [];
  const seen = new Set<number>();

  let anchor = formatInstantInMoscow(new Date(options.bookingNowMs));

  for (let iter = 0; iter < DISCOVERY_MAX_ITERS && results.length < maxSlots; iter++) {
    const data = await bookingFlowApi.availablePcs({
      cafeId: cafe.icafe_id,
      dateStart: anchor.date,
      timeStart: anchor.time,
      mins: params.mins,
      isFindWindow: true,
      priceName: params.priceName,
    });

    const windowStart = windowStartFromAvailablePcs(data);
    if (!windowStart) break;

    const startMs = windowStart.getTime();
    if (seen.has(startMs)) {
      anchor = formatInstantInMoscow(new Date(startMs + stepMs));
      continue;
    }

    const planIv = planIntervalFromWindowStart(windowStart, params.mins);
    if (!planIv) {
      anchor = formatInstantInMoscow(new Date(startMs + stepMs));
      continue;
    }

    if (!hasPartyCapacityForNearest(data.pc_list ?? [], planIv, params.zoneFilter, params.partySize)) {
      anchor = formatInstantInMoscow(new Date(startMs + stepMs));
      continue;
    }

    seen.add(startMs);
    results.push({ cafe, data, windowStart });

    anchor = formatInstantInMoscow(new Date(planIv.end.getTime() + 60 * 1000));
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
    priceName: params.priceName,
  });
  const windowStart = windowStartFromAvailablePcs(data);
  if (!windowStart) return null;
  const planIv = planIntervalFromWindowStart(windowStart, params.mins);
  if (!planIv) return null;
  if (!hasPartyCapacityForNearest(data.pc_list ?? [], planIv, params.zoneFilter, params.partySize)) {
    return null;
  }
  return { cafe, data, windowStart };
}
