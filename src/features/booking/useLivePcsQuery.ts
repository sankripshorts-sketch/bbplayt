import { useQuery } from '@tanstack/react-query';
import { fetchLivePcsForUi } from '../../api/icafeLivePcs';
import { queryKeys } from '../../query/queryKeys';
import { structuralSharePcList } from '../../query/structuralSharing';

/**
 * Онлайн-занятость ПК «сейчас»: iCafe `member_pcs` при возможности, иначе `GET .../pcs`.
 * Слот брони (дата/время/минуты) — отдельный запрос `available-pcs-for-booking`, не этот хук.
 */
export function useLivePcsQuery(cafeId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.livePcs(cafeId ?? 0),
    queryFn: () => fetchLivePcsForUi(cafeId!),
    enabled: Boolean(cafeId) && enabled,
    staleTime: 8_000,
    gcTime: 5 * 60_000,
    refetchInterval: enabled && cafeId ? 22_000 : false,
    refetchOnReconnect: true,
    structuralSharing: structuralSharePcList,
  });
}
