import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useKnowledgeReady } from '../knowledge/KnowledgeContext';
import { bookingFlowApi, cafesApi } from '../api/endpoints';
import { loadAppPreferences } from '../preferences/appPreferences';
import { fetchVkWallVideoPage } from '../features/news/fetchVkWallVideoPosts';
import { queryKeys } from './queryKeys';

/**
 * Единый стартовый запрос данных с API: кафе, при входе — iCafe, схема/прайс для сохранённого клуба, брони.
 * Пока `dataReady` false, RootNavigator держит экран загрузки.
 */
export function useAppBootstrap() {
  const qc = useQueryClient();
  const { ready, user } = useAuth();
  const knowledgeReady = useKnowledgeReady();
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (!ready || !knowledgeReady) {
      setDataReady(false);
      return;
    }

    let cancelled = false;
    setDataReady(false);

    void (async () => {
      try {
        const prefs = await loadAppPreferences();
        void qc.prefetchQuery({
          queryKey: queryKeys.vkWallFirstPage(),
          queryFn: () => fetchVkWallVideoPage(0),
          staleTime: Infinity,
        });

        const tasks: Promise<unknown>[] = [
          qc.fetchQuery({
            queryKey: queryKeys.cafes(),
            queryFn: () => cafesApi.list(),
            staleTime: 10 * 60 * 1000,
          }),
        ];

        if (user) {
          tasks.push(
            qc.fetchQuery({
              queryKey: queryKeys.icafeIdForMember(),
              queryFn: () => bookingFlowApi.icafeIdForMember(),
              staleTime: 10 * 60 * 1000,
            }),
          );

          const cafeId = prefs.favoriteClubId ?? prefs.lastBookingClubId;
          if (cafeId != null) {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const bookingDate = `${y}-${m}-${day}`;

            tasks.push(
              qc.fetchQuery({
                queryKey: queryKeys.structRooms(cafeId),
                queryFn: () => bookingFlowApi.structRooms(cafeId),
                staleTime: 30 * 60 * 1000,
              }),
            );
            tasks.push(
              qc.fetchQuery({
                queryKey: queryKeys.allPrices({
                  cafeId,
                  memberId: user.memberId,
                  mins: 60,
                  bookingDate,
                }),
                queryFn: () =>
                  bookingFlowApi.allPrices({
                    cafeId,
                    memberId: user.memberId,
                    mins: 60,
                    bookingDate,
                  }),
                staleTime: 2 * 60 * 1000,
              }),
            );
          }

          const acc = user.memberAccount?.trim();
          if (acc) {
            tasks.push(
              qc.fetchQuery({
                queryKey: queryKeys.books(acc),
                queryFn: () => bookingFlowApi.memberBooks(acc),
                staleTime: 15 * 1000,
              }),
            );
          }
        }

        await Promise.allSettled(tasks);
      } finally {
        if (!cancelled) setDataReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [qc, ready, knowledgeReady, user?.memberId, user?.memberAccount]);

  return { dataReady };
}
