import { useQuery } from '@tanstack/react-query';
import { fetchLivePcsForUi } from '../../api/icafeLivePcs';
import { queryKeys } from '../../query/queryKeys';

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Онлайн-занятость ПК «сейчас»: iCafe `member_pcs` при возможности, иначе `GET .../pcs`.
 * Слот брони (дата/время/минуты) — отдельный запрос `available-pcs-for-booking`, не этот хук.
 */
export function useLivePcsQuery(cafeId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.livePcs(cafeId ?? 0),
    queryFn: async () => {
      const startedAt = nowMs();
      if (__DEV__) {
        console.log('[booking][livePcs] fetch:start', { cafeId: cafeId ?? 0 });
      }
      try {
        const result = await fetchLivePcsForUi(cafeId!);
        if (__DEV__) {
          console.log('[booking][livePcs] fetch:success', {
            cafeId: cafeId ?? 0,
            rows: Array.isArray(result) ? result.length : 0,
            tookMs: Math.round(nowMs() - startedAt),
          });
        }
        return result;
      } catch (error) {
        if (__DEV__) {
          console.warn('[booking][livePcs] fetch:error', {
            cafeId: cafeId ?? 0,
            tookMs: Math.round(nowMs() - startedAt),
            error,
          });
        }
        throw error;
      }
    },
    enabled: Boolean(cafeId) && enabled,
    staleTime: 8_000,
    gcTime: 5 * 60_000,
    refetchInterval: enabled && cafeId ? 22_000 : false,
    refetchOnReconnect: true,
  });
}
