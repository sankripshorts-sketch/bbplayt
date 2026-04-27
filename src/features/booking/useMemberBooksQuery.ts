import { useQuery } from '@tanstack/react-query';
import { bookingFlowApi } from '../../api/endpoints';
import { queryKeys } from '../../query/queryKeys';

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Список броней пользователя по всем клубам — держим в актуальном состоянии для баннеров и проверки пересечений.
 */
export function useMemberBooksQuery(memberAccount: string | undefined, memberId: string | undefined) {
  const acc = memberAccount?.trim();
  const id = memberId?.trim();
  return useQuery({
    queryKey: queryKeys.books(acc, id),
    queryFn: async () => {
      const startedAt = nowMs();
      if (__DEV__) {
        console.log('[booking][memberBooks] fetch:start', { hasAccount: !!acc, hasMemberId: !!id });
      }
      try {
        const result = await bookingFlowApi.memberBooks({ memberAccount: acc, memberId: id });
        if (__DEV__) {
          const cafeCount =
            result && typeof result === 'object' ? Object.keys(result as Record<string, unknown>).length : 0;
          console.log('[booking][memberBooks] fetch:success', {
            hasAccount: !!acc,
            hasMemberId: !!id,
            cafes: cafeCount,
            tookMs: Math.round(nowMs() - startedAt),
          });
        }
        return result;
      } catch (error) {
        if (__DEV__) {
          console.warn('[booking][memberBooks] fetch:error', {
            hasAccount: !!acc,
            hasMemberId: !!id,
            tookMs: Math.round(nowMs() - startedAt),
            error,
          });
        }
        throw error;
      }
    },
    enabled: !!acc || !!id,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
