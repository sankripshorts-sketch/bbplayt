import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useKnowledgeReady } from '../knowledge/KnowledgeContext';
import { bookingFlowApi, cafesApi } from '../api/endpoints';
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

/**
 * Единый стартовый запрос данных с API: кафе, при входе — iCafe, схема/прайс для сохранённого клуба, брони.
 * Лента VK не блокирует старт — грузится на экране новостей (кэш с диска + порциями).
 * Пока `dataReady` false, RootNavigator держит экран загрузки (не дольше лимита в RootNavigator, обычно 5 c).
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

        // The rest is warmed up in background and must not block first render.
        if (user) {
          void qc
            .prefetchQuery({
              queryKey: queryKeys.icafeIdForMember(),
              queryFn: () => bookingFlowApi.icafeIdForMember(),
              staleTime: 10 * 60 * 1000,
            })
            .catch(() => {});

          const cafeId = prefs.favoriteClubId ?? prefs.lastBookingClubId;
          if (cafeId != null) {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const bookingDate = `${y}-${m}-${day}`;

            void qc
              .prefetchQuery({
                queryKey: queryKeys.structRooms(cafeId),
                queryFn: () => bookingFlowApi.structRooms(cafeId),
                staleTime: 30 * 60 * 1000,
              })
              .catch(() => {});

            void qc
              .prefetchQuery({
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
              })
              .catch(() => {});
          }

          const acc = user.memberAccount?.trim();
          const memberId = user.memberId?.trim();
          if (acc || memberId) {
            void qc
              .prefetchQuery({
                queryKey: queryKeys.books(acc, memberId),
                queryFn: () =>
                  bookingFlowApi.memberBooks({ memberAccount: acc, memberId }),
                staleTime: 15 * 1000,
              })
              .catch(() => {});
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
