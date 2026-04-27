import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { bookingFlowApi } from '../../api/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { queryKeys } from '../../query/queryKeys';

export type CancelBookingParams = {
  icafeId: number;
  pcName: string;
  memberOfferId: number;
};

export function useCancelBookingMutation() {
  const { user } = useAuth();
  const { t } = useLocale();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CancelBookingParams) => {
      const acc = user?.memberAccount?.trim();
      const mid = user?.memberId?.trim();
      if (!acc || !mid) throw new ApiError(t('booking.errorMemberId'), 0);
      const icafeId = Number(params.icafeId);
      if (!Number.isFinite(icafeId) || params.memberOfferId <= 0) {
        throw new ApiError(t('booking.errorNoData'), 0);
      }
      await bookingFlowApi.cancelBooking({
        icafe_id: icafeId,
        pc_name: params.pcName,
        member_account: acc,
        member_id: mid,
        member_offer_id: params.memberOfferId,
        private_key: user?.privateKey?.trim(),
      });
    },
    onSuccess: async (_data, params) => {
      const acc = user?.memberAccount?.trim();
      const mid = user?.memberId?.trim();
      await queryClient.invalidateQueries({ queryKey: queryKeys.books(acc, mid) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.cafeBookings(params.icafeId) });
    },
  });
}
