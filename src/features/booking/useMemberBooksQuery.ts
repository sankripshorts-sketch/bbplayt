import { useQuery } from '@tanstack/react-query';
import { bookingFlowApi } from '../../api/endpoints';
import { queryKeys } from '../../query/queryKeys';

/**
 * Список броней пользователя по всем клубам — держим в актуальном состоянии для баннеров и проверки пересечений.
 */
export function useMemberBooksQuery(memberAccount: string | undefined) {
  const acc = memberAccount?.trim();
  return useQuery({
    queryKey: queryKeys.books(acc),
    queryFn: () => bookingFlowApi.memberBooks(acc),
    enabled: !!acc,
    staleTime: 10 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnReconnect: true,
  });
}
