import { useQuery } from '@tanstack/react-query';
import { fetchIcafeCafeBookings } from '../../api/icafeCafeBookings';
import { queryKeys } from '../../query/queryKeys';

/**
 * Брони клуба со стороны iCafe (все участники), для занятости слота без опоры только на «мои брони».
 */
export function useCafeBookingsQuery(cafeId: number | undefined, enabled: boolean) {
  const id = cafeId ?? 0;
  return useQuery({
    queryKey: queryKeys.cafeBookings(id),
    queryFn: () => fetchIcafeCafeBookings(id),
    enabled: !!cafeId && enabled,
    staleTime: 15 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnReconnect: true,
  });
}
