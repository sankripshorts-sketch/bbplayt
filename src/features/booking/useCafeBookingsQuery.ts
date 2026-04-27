import { useQuery } from '@tanstack/react-query';
import { fetchIcafeCafeBookings } from '../../api/icafeCafeBookings';
import { queryKeys } from '../../query/queryKeys';

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Брони клуба со стороны iCafe (все участники), для занятости слота без опоры только на «мои брони».
 */
export function useCafeBookingsQuery(cafeId: number | undefined, enabled: boolean) {
  const id = cafeId ?? 0;
  return useQuery({
    queryKey: queryKeys.cafeBookings(id),
    queryFn: async () => {
      const startedAt = nowMs();
      if (__DEV__) {
        console.log('[booking][cafeBookings] fetch:start', { cafeId: id });
      }
      try {
        const result = await fetchIcafeCafeBookings(id);
        if (__DEV__) {
          console.log('[booking][cafeBookings] fetch:success', {
            cafeId: id,
            rows: Array.isArray(result) ? result.length : 0,
            tookMs: Math.round(nowMs() - startedAt),
          });
        }
        return result;
      } catch (error) {
        if (__DEV__) {
          console.warn('[booking][cafeBookings] fetch:error', {
            cafeId: id,
            tookMs: Math.round(nowMs() - startedAt),
            error,
          });
        }
        throw error;
      }
    },
    enabled: !!cafeId && enabled,
    staleTime: 15 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnReconnect: true,
  });
}
