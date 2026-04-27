import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useKnowledgeReady } from '../knowledge/KnowledgeContext';
import { fetchCafeBookingProducts } from '../api/cafeBookingProducts';
import { fetchIcafeCafeBookings } from '../api/icafeCafeBookings';
import { fetchLivePcsForUi } from '../api/icafeLivePcs';
import { bookingFlowApi, cafesApi } from '../api/endpoints';
import type { IcafeIdForMemberData } from '../api/types';
import { loadAppPreferences, patchAppPreferences } from '../preferences/appPreferences';
import {
  resolveEffectiveCityId,
  shouldAttemptCityGeoBootstrap,
  tryGeolocationCityGuess,
} from '../preferences/effectiveCity';
import { vkGroupIdForCityId } from '../config/citiesCatalog';
import { fetchVkWallVideoPage } from '../features/news/fetchVkWallVideoPosts';
import type { VkWallFetchResult } from '../features/news/fetchVkWallVideoPosts';
import type { VkWallPost } from '../features/news/vkWallHtmlParser';
import { queryKeys } from './queryKeys';
import type { CafeItem } from '../api/types';
import { formatISODateMoscow } from '../datetime/mskTime';
import { nowForBookingCompareMs } from '../datetime/serverBookingClock';

/**
 * Старт: кафе; для залогиненного — iCafe, затем пакетом схема/прайс/продукты/брони клуба/онлайн-ПК и «мои брони».
 * Лента VK: прогрев после гео-города (не критична для табов) — кэш с диска + порция на экране новостей.
 * Пока `dataReady` false (и пока RQ `useIsRestoring` в RootNavigator), показывается экран загрузки.
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
        // Startup-critical data only: cafes feed multiple first screens.
        await qc.fetchQuery({
          queryKey: queryKeys.cafes(),
          queryFn: () => cafesApi.list(),
          staleTime: 10 * 60 * 1000,
        });

        if (user) {
          /** Как на `BookingScreen`: московский «сегодня» и дата из префсов, если не в прошлом. */
          const todayMsk = formatISODateMoscow(new Date(nowForBookingCompareMs()));
          const lastFromPrefs = prefs.lastBookingDateISO;
          const bookingDate =
            lastFromPrefs && lastFromPrefs >= todayMsk ? lastFromPrefs : todayMsk;

          let icafeData: IcafeIdForMemberData | undefined;
          try {
            icafeData = await qc.fetchQuery({
              queryKey: queryKeys.icafeIdForMember(),
              queryFn: () => bookingFlowApi.icafeIdForMember(),
              staleTime: 10 * 60 * 1000,
            });
          } catch {
            /* iCafe — для fallback club id; экраны сами перезапросят */
          }

          const fromPrefs = prefs.favoriteClubId ?? prefs.lastBookingClubId;
          let clubId: number | null =
            typeof fromPrefs === 'number' && Number.isFinite(fromPrefs) && fromPrefs > 0 ? fromPrefs : null;
          if (clubId == null && icafeData) {
            const n = Number(String(icafeData.icafe_id ?? '').trim());
            if (Number.isFinite(n) && n > 0) clubId = n;
          }

          const acc = user.memberAccount?.trim();
          const memberId = user.memberId?.trim();
          const startupQueries: Promise<unknown>[] = [];

          if (clubId != null) {
            const cid = clubId;
            startupQueries.push(
              qc.fetchQuery({
                queryKey: queryKeys.structRooms(cid),
                queryFn: () => bookingFlowApi.structRooms(cid),
                staleTime: 30 * 60 * 1000,
              }),
              qc.fetchQuery({
                queryKey: queryKeys.allPrices({
                  cafeId: cid,
                  memberId: user.memberId,
                  mins: 60,
                  bookingDate,
                }),
                queryFn: () =>
                  bookingFlowApi.allPrices({
                    cafeId: cid,
                    memberId: user.memberId,
                    mins: 60,
                    bookingDate,
                  }),
                staleTime: 2 * 60 * 1000,
              }),
              qc.fetchQuery({
                queryKey: queryKeys.cafeBookingProducts(cid),
                queryFn: () => fetchCafeBookingProducts(cid),
                staleTime: 3 * 60 * 1000,
              }),
              qc.fetchQuery({
                queryKey: queryKeys.cafeBookings(cid),
                queryFn: () => fetchIcafeCafeBookings(cid),
                staleTime: 15 * 1000,
              }),
              qc.fetchQuery({
                queryKey: queryKeys.livePcs(cid),
                queryFn: () => fetchLivePcsForUi(cid),
                staleTime: 8_000,
              }),
            );
          }

          if (acc || memberId) {
            startupQueries.push(
              qc.fetchQuery({
                queryKey: queryKeys.books(acc, memberId),
                queryFn: () => bookingFlowApi.memberBooks({ memberAccount: acc, memberId }),
                staleTime: 60 * 1000,
              }),
            );
          }

          if (startupQueries.length > 0) {
            await Promise.allSettled(startupQueries);
          }
        }

        const prefsAfter = await loadAppPreferences();
        const cafesData = qc.getQueryData<CafeItem[]>(queryKeys.cafes());
        if (shouldAttemptCityGeoBootstrap(prefsAfter, cafesData)) {
          const guessed = await tryGeolocationCityGuess();
          await patchAppPreferences({
            cityGeoAttempted: true,
            ...(guessed ? { cityIdFromGeo: guessed } : {}),
          });
        }

        const freshPrefs = await loadAppPreferences();
        const effectiveCityId = resolveEffectiveCityId(freshPrefs, cafesData);
        const newsVkGroupId = vkGroupIdForCityId(effectiveCityId);
        void warmupVkNewsFeed(qc, newsVkGroupId);
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

function mergeUniquePosts(base: VkWallPost[], extra: VkWallPost[]): VkWallPost[] {
  const seen = new Set(base.map((p) => p.key));
  const out = [...base];
  for (const p of extra) {
    if (seen.has(p.key)) continue;
    seen.add(p.key);
    out.push(p);
  }
  return out;
}

async function warmupVkNewsFeed(
  qc: QueryClient,
  vkGroupId: number,
): Promise<void> {
  const STARTUP_VK_HEAD_LIMIT = 8;
  const cachedFeed = qc.getQueryData<VkWallFetchResult>(queryKeys.vkWallFeed(vkGroupId));
  let feedPosts = (cachedFeed?.posts ?? []).slice(0, STARTUP_VK_HEAD_LIMIT);
  let nextOffset: number | null = cachedFeed?.nextOffset ?? null;

  try {
    const first = await fetchVkWallVideoPage(0, { vkGroupId });
    const startupHead = first.posts.slice(0, STARTUP_VK_HEAD_LIMIT);
    qc.setQueryData<VkWallFetchResult>(queryKeys.vkWallFirstPage(vkGroupId), {
      ...first,
      posts: startupHead,
    });
    feedPosts = mergeUniquePosts(startupHead, feedPosts).slice(0, STARTUP_VK_HEAD_LIMIT);
    nextOffset = first.nextOffset;

    qc.setQueryData<VkWallFetchResult>(queryKeys.vkWallFeed(vkGroupId), {
      posts: feedPosts,
      nextOffset,
      communityAvatarUrl: first.communityAvatarUrl,
    });
  } catch {
    /* Прогрев не блокирует запуск приложения. */
  }
}
