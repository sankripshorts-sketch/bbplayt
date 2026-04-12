import { useEffect, useState } from 'react';
import { nowForBookingCompareMs } from '../../datetime/serverBookingClock';

/**
 * Текущий момент для статусов брони / ПК (серверно выровненный), с периодическим обновлением UI.
 */
export function useBookingNowMs(intervalMs = 15_000): number {
  const [ms, setMs] = useState(() => nowForBookingCompareMs());
  useEffect(() => {
    const tick = () => setMs(nowForBookingCompareMs());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return ms;
}
