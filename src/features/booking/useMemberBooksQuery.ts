import { useQuery } from '@tanstack/react-query';
import { bookingFlowApi } from '../../api/endpoints';
import { queryKeys } from '../../query/queryKeys';
import { structuralShareAllBooksData } from '../../query/structuralSharing';

/**
 * Список броней пользователя по всем клубам — держим в актуальном состоянии для баннеров и проверки пересечений.
 */
export function useMemberBooksQuery(
  memberAccount: string | undefined,
  memberId: string | undefined,
  options?: { enabled?: boolean; poll?: boolean },
) {
  const acc = memberAccount?.trim();
  const id = memberId?.trim();
  const enabled = (!!acc || !!id) && (options?.enabled ?? true);
  const poll = options?.poll ?? false;
  return useQuery({
    queryKey: queryKeys.books(acc, id),
    queryFn: () => bookingFlowApi.memberBooks({ memberAccount: acc, memberId: id }),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: enabled && poll ? 60 * 1000 : false,
    refetchOnReconnect: true,
    structuralSharing: structuralShareAllBooksData,
  });
}
