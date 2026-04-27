import { useQuery } from '@tanstack/react-query';
import { bookingFlowApi } from '../../api/endpoints';
import { queryKeys } from '../../query/queryKeys';

/**
 * Список броней пользователя по всем клубам — держим в актуальном состоянии для баннеров и проверки пересечений.
 */
export function useMemberBooksQuery(memberAccount: string | undefined, memberId: string | undefined) {
  const acc = memberAccount?.trim();
  const id = memberId?.trim();
  return useQuery({
    queryKey: queryKeys.books(acc, id),
    queryFn: () => bookingFlowApi.memberBooks({ memberAccount: acc, memberId: id }),
    enabled: !!acc || !!id,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnReconnect: true,
  });
}
