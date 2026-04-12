import type { TimeTechBreakNormalized } from '../../api/types';
import { formatHHmmMoscow, formatISODateMoscow, moscowWallTotalMinutesFromInstant } from '../../datetime/mskTime';
import { nowForBookingCompareMs } from '../../datetime/serverBookingClock';

export type BuildBookingTimeSlotsOptions = {
  /** Шаг сетки в минутах (из `step_start_booking` в `/all-prices-icafe`) */
  stepMins?: number;
  /** Техперерыв: не предлагать старт слота внутри окна [start, start+duration) */
  techBreak?: TimeTechBreakNormalized | null;
};

function isBreakSlot(totalMins: number, tech: TimeTechBreakNormalized | null | undefined): boolean {
  if (!tech || tech.durationMins <= 0) return false;
  const a = tech.startMins;
  const b = tech.startMins + tech.durationMins;
  return totalMins > a && totalMins < b;
}

/**
 * Слоты времени для брони: шаг из API (`step_start_booking`), техперерыв из `time_tech_break`.
 */
export function buildBookingTimeSlots(forDateISO: string, options?: BuildBookingTimeSlotsOptions): string[] {
  const step = (() => {
    const s = options?.stepMins;
    if (typeof s === 'number' && Number.isFinite(s) && s > 0) return Math.min(120, Math.max(1, Math.floor(s)));
    return 30;
  })();
  const tech = options?.techBreak ?? null;

  const now = new Date(nowForBookingCompareMs());
  const isToday = formatISODateMoscow(now) === forDateISO;
  let startM = 0;
  if (isToday) {
    startM = moscowWallTotalMinutesFromInstant(now);
    const mod = startM % step;
    if (mod >= 1 && mod <= step - 1) startM += step - mod;
    else if (mod > step - 1) startM += step * 2 - mod;
  }
  const out: string[] = [];
  for (let m = startM; m < 24 * 60; m += step) {
    if (isBreakSlot(m, tech)) continue;
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return out;
}

/** Подбирает ближайший допустимый слот ≥ начала окна с сервера. */
export function snapWindowToBookableSlot(
  window: Date,
  options?: BuildBookingTimeSlotsOptions,
): { dateISO: string; timeStart: string } {
  const dateISO = formatISODateMoscow(window);
  const slots = buildBookingTimeSlots(dateISO, options);
  const want = moscowWallTotalMinutesFromInstant(window);
  let best = slots[0] ?? formatHHmmMoscow(window);
  let bestDiff = Infinity;
  for (const s of slots) {
    const [h, m] = s.split(':').map(Number);
    const sm = h * 60 + m;
    if (sm >= want) {
      const diff = sm - want;
      if (diff < bestDiff) {
        bestDiff = diff;
        best = s;
      }
    }
  }
  if (bestDiff === Infinity && slots.length) {
    best = slots[slots.length - 1];
  }
  return { dateISO, timeStart: best };
}
