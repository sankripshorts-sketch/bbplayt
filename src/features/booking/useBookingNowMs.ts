import { useEffect, useState } from 'react';
import { nowForBookingCompareMs } from '../../datetime/serverBookingClock';

/**
 * Текущий момент для статусов брони / ПК (серверно выровненный), с периодическим обновлением UI.
 */
export function useBookingNowMs(intervalMs = 15_000, enabled = true): number {
  const [ms, setMs] = useState(() => nowForBookingCompareMs());
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      setMs((prev) => {
        const next = nowForBookingCompareMs();
        return next === prev ? prev : next;
      });
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return ms;
}
