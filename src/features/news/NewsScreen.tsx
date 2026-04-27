import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cafesApi } from '../../api/endpoints';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Image,
  type ImageSourcePropType,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../components/DinText';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEFAULT_CITY_ID,
  getCityDefinition,
  vkCommunityTitleForCity,
  vkGroupIdForCityId,
} from '../../config/citiesCatalog';
import type { CafeItem } from '../../api/types';
import { getVkCommunityAvatarUri, getVkWallPostMobileUrl } from '../../config/vkNewsConfig';
import { loadAppPreferences } from '../../preferences/appPreferences';
import { resolveEffectiveCityId } from '../../preferences/effectiveCity';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { queryKeys } from '../../query/queryKeys';
import { TodaysBookingBanner } from '../booking/TodaysBookingBanner';
import { ClubDataLoader } from '../ui/ClubDataLoader';
import { fetchVkWallVideoPage } from './fetchVkWallVideoPosts';
import type { VkWallFetchResult } from './fetchVkWallVideoPosts';
import { VkVideoEmbedModal } from './VkVideoEmbedModal';
import { getLikedPostKeys, toggleLikedPostKey } from './vkNewsLikesStorage';
import { buildVkVideoEmbedUrl, type VkWallPost } from './vkWallHtmlParser';

const DEFAULT_NEWS_AVATAR = require('../../../assets/icon.png') as ImageSourcePropType;

function formatPostDate(ts: number, locale: string): string {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'ru', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function errorCodeOf(e: unknown): string | undefined {
  return e && typeof e === 'object' && 'code' in e
    ? String((e as { code?: string }).code ?? '')
    : undefined;
}

function mergeTailPosts(prev: VkWallPost[], more: VkWallPost[]): VkWallPost[] {
  const seen = new Set(prev.map((p) => p.key));
  const merged = [...prev];
  for (const p of more) {
    if (!seen.has(p.key)) {
      seen.add(p.key);
      merged.push(p);
    }
  }
  return merged;
}

/** Интервал появления следующей карточки в первой порции (первая — сразу). */
const POST_REVEAL_STAGGER_MS = 110;
/** Сначала показываем столько постов; дальше — из уже загруженной первой страницы или сеть при догрузке. */
const HEAD_BATCH = 8;

export function NewsScreen() {
  const colors = useThemeColors();
  const { t, locale } = useLocale();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const qc = useQueryClient();

  const cafesQ = useQuery({
    queryKey: queryKeys.cafes(),
    queryFn: () => cafesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const [newsCityId, setNewsCityId] = useState(DEFAULT_CITY_ID);
  const newsVkGroupId = useMemo(() => vkGroupIdForCityId(newsCityId), [newsCityId]);

  const [tailPosts, setTailPosts] = useState<VkWallPost[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [videoEmbedUri, setVideoEmbedUri] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [likedKeys, setLikedKeys] = useState<Set<string>>(() => new Set());
  const [windowEnd, setWindowEnd] = useState(0);
  const [paintCount, setPaintCount] = useState(0);

  const loadingMoreRef = useRef(false);

  const reloadNewsCity = useCallback(() => {
    void loadAppPreferences().then((p) => {
      const cafes = cafesQ.data ?? qc.getQueryData<CafeItem[]>(queryKeys.cafes());
      setNewsCityId(resolveEffectiveCityId(p, cafes));
    });
  }, [cafesQ.data, qc]);

  useFocusEffect(
    useCallback(() => {
      reloadNewsCity();
    }, [reloadNewsCity]),
  );

  /** Подгруженные клубы участвуют в «авто»-городе; без пересчёта лента могла остаться на дефолте до фокуса. */
  useEffect(() => {
    reloadNewsCity();
  }, [reloadNewsCity]);

  useEffect(() => {
    setTailPosts([]);
    setNextOffset(null);
    setWindowEnd(0);
    setPaintCount(0);
  }, [newsVkGroupId]);

  const vkFirst = useQuery({
    queryKey: queryKeys.vkWallFirstPage(newsVkGroupId),
    queryFn: () => fetchVkWallVideoPage(0, { vkGroupId: newsVkGroupId }),
    /** Лента не «протухает» при переключении вкладок — показываем кэш, обновление только вручную. */
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const vkFeedCache = useQuery({
    queryKey: queryKeys.vkWallFeed(newsVkGroupId),
    queryFn: async () => ({ posts: [], nextOffset: null, communityAvatarUrl: null } as VkWallFetchResult),
    enabled: false,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const cityCatalogAvatar = useMemo(() => getCityDefinition(newsCityId)?.vkGroupAvatarUrl ?? null, [newsCityId]);

  const avatarSource = useMemo<ImageSourcePropType>(() => {
    const uri = getVkCommunityAvatarUri() ?? vkFirst.data?.communityAvatarUrl ?? cityCatalogAvatar;
    return uri ? { uri } : DEFAULT_NEWS_AVATAR;
  }, [cityCatalogAvatar, vkFirst.data?.communityAvatarUrl]);

  const communityTitle = useMemo(() => {
    const envTitle = process.env.EXPO_PUBLIC_VK_GROUP_TITLE?.trim();
    if (envTitle) return envTitle;
    const byCity = vkCommunityTitleForCity(newsCityId, locale === 'en' ? 'en' : 'ru');
    if (byCity) return byCity;
    return t('news.communityName');
  }, [newsCityId, locale, t]);

  useEffect(() => {
    void getLikedPostKeys().then(setLikedKeys);
  }, []);

  const mapErr = useCallback((e: unknown) => {
    const code = errorCodeOf(e);
    if (code === 'VK_BLOCKED') return 'blocked' as const;
    if (code === 'VK_WALL_PARSE') return 'parse' as const;
    return 'network' as const;
  }, []);

  const errorKind = useMemo(() => {
    if (!vkFirst.error) return null;
    return mapErr(vkFirst.error);
  }, [mapErr, vkFirst.error]);

  const posts = useMemo(() => {
    const head = vkFirst.data?.posts ?? [];
    if (tailPosts.length === 0) return head;
    return mergeTailPosts(head, tailPosts);
  }, [vkFirst.data?.posts, tailPosts]);

  /** Смена «первой страницы» из react-query — сбрасываем окно и пошаговое появление первой порции. */
  const feedHeadSignature = useMemo(
    () => `${vkFirst.dataUpdatedAt ?? 0}-${vkFirst.data?.posts?.[0]?.key ?? 'none'}`,
    [vkFirst.data?.posts, vkFirst.dataUpdatedAt],
  );

  useEffect(() => {
    setWindowEnd(Math.min(HEAD_BATCH, posts.length));
    setPaintCount(0);
  }, [feedHeadSignature]);

  /** Пошагово раскрываем только первые до HEAD_BATCH карточек; остальное в окне — сразу. */
  useEffect(() => {
    const staggerTarget = Math.min(HEAD_BATCH, windowEnd, posts.length);
    if (posts.length === 0) {
      setPaintCount(0);
      return;
    }
    if (paintCount >= staggerTarget) return;
    const delay = paintCount === 0 ? 0 : POST_REVEAL_STAGGER_MS;
    const id = setTimeout(() => {
      setPaintCount((c) => Math.min(c + 1, staggerTarget));
    }, delay);
    return () => clearTimeout(id);
  }, [feedHeadSignature, paintCount, posts.length, windowEnd]);

  const displayedPosts = useMemo(() => {
    if (posts.length === 0) return [];
    const firstCap = Math.min(HEAD_BATCH, windowEnd);
    const staggerTarget = Math.min(firstCap, posts.length);
    const nStaggered = Math.min(paintCount, staggerTarget);
    const staggered = posts.slice(0, nStaggered);
    const rest =
      firstCap < windowEnd ? posts.slice(firstCap, Math.min(windowEnd, posts.length)) : [];
    return [...staggered, ...rest];
  }, [paintCount, posts, windowEnd]);

  useEffect(() => {
    if (!vkFirst.data) return;
    if (tailPosts.length === 0) {
      setNextOffset(vkFirst.data.nextOffset);
    }
  }, [vkFirst.data, tailPosts.length]);

  useEffect(() => {
    if (!vkFeedCache.data) return;
    setTailPosts(vkFeedCache.data.posts);
    setNextOffset(vkFeedCache.data.nextOffset);
  }, [vkFeedCache.data]);

  const loadingFirst = vkFirst.isPending && !vkFirst.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadingMoreRef.current = false;
    try {
      const fresh = await fetchVkWallVideoPage(0, { vkGroupId: newsVkGroupId });
      const head = vkFirst.data?.posts ?? [];
      const currentPosts = mergeTailPosts(head, tailPosts);
      const currentKeys = new Set(currentPosts.map((p) => p.key));
      const hasNew = fresh.posts.some((p) => !currentKeys.has(p.key));
      if (hasNew) {
        qc.setQueryData<VkWallFetchResult>(queryKeys.vkWallFirstPage(newsVkGroupId), fresh);
        qc.setQueryData<VkWallFetchResult>(queryKeys.vkWallFeed(newsVkGroupId), fresh);
        setTailPosts([]);
        setNextOffset(fresh.nextOffset);
      }
    } catch {
      /* сеть/парсинг — оставляем уже показанный список */
    } finally {
      setRefreshing(false);
    }
  }, [qc, newsVkGroupId, tailPosts, vkFirst.data?.posts]);

  const onRetry = useCallback(() => {
    void vkFirst.refetch();
  }, [vkFirst]);

  const onEndReached = useCallback(() => {
    if (loadingFirst || refreshing || loadingMoreRef.current) return;

    if (windowEnd < posts.length) {
      setWindowEnd((w) => Math.min(w + HEAD_BATCH, posts.length));
      return;
    }

    if (nextOffset === null) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const off = nextOffset;
    void fetchVkWallVideoPage(off, { vkGroupId: newsVkGroupId })
      .then((res) => {
        setTailPosts((prev) => {
          const merged = mergeTailPosts(prev, res.posts);
          const head = vkFirst.data?.posts ?? [];
          const av =
            qc.getQueryData<VkWallFetchResult>(queryKeys.vkWallFirstPage(newsVkGroupId))?.communityAvatarUrl ??
            null;
          qc.setQueryData<VkWallFetchResult>(queryKeys.vkWallFeed(newsVkGroupId), {
            posts: mergeTailPosts(head, merged),
            nextOffset: res.nextOffset,
            communityAvatarUrl: av,
          });
          return merged;
        });
        setNextOffset(res.nextOffset);
      })
      .catch(() => {
        /* следующая страница не критична — pull-to-refresh обновит с начала */
      })
      .finally(() => {
        setLoadingMore(false);
        loadingMoreRef.current = false;
      });
  }, [loadingFirst, newsVkGroupId, nextOffset, posts.length, refreshing, vkFirst.data?.posts, windowEnd]);

  const openPostUrl = useCallback((p: VkWallPost) => {
    void Linking.openURL(getVkWallPostMobileUrl(p.ownerId, p.postId));
  }, []);

  const onToggleLike = useCallback((key: string) => {
    void toggleLikedPostKey(key).then((liked) => {
      setLikedKeys((prev) => {
        const next = new Set(prev);
        if (liked) next.add(key);
        else next.delete(key);
        return next;
      });
    });
  }, []);

  const openVideo = useCallback((p: VkWallPost) => {
    if (!p.video) return;
    setVideoTitle(p.text.trim() ? p.text.slice(0, 80) : t('news.watchVideo'));
    setVideoEmbedUri(buildVkVideoEmbedUrl(p.video));
  }, [t]);

  const closeVideo = useCallback(() => {
    setVideoEmbedUri(null);
  }, []);

  const errText =
    errorKind === 'blocked'
      ? t('news.errorVkUnavailable')
      : errorKind === 'parse'
        ? t('news.errorParse')
        : t('news.errorNetwork');

  const listHeader = useMemo(
    () => (
      <>
        <TodaysBookingBanner />
      </>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: VkWallPost }) => {
      const liked = likedKeys.has(item.key);
      return (
        <View style={styles.card}>
          <View style={styles.postHeader}>
            <Image source={avatarSource} style={styles.avatar} accessibilityIgnoresInvertColors />
            <View style={styles.postHeaderText}>
              <Text style={styles.authorName} numberOfLines={1}>
                {communityTitle}
              </Text>
              <Text style={styles.postDate}>{formatPostDate(item.dateUnix, locale)}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => openPostUrl(item)}
            accessibilityRole="button"
            accessibilityLabel={item.text.slice(0, 120) || t('news.title')}
          >
            {item.previewUrl ? (
              <Image
                source={{ uri: item.previewUrl }}
                style={styles.preview}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : null}
            {item.text ? (
              <Text style={styles.postText}>{item.text}</Text>
            ) : (
              <Text style={styles.postTextMuted}>—</Text>
            )}
          </Pressable>
          {item.video ? (
            <Pressable
              style={styles.videoBtn}
              onPress={() => openVideo(item)}
              accessibilityRole="button"
              accessibilityLabel={t('news.watchVideo')}
            >
              <Text style={styles.videoBtnText}>{t('news.watchVideo')}</Text>
            </Pressable>
          ) : null}
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.likeBtn}
              onPress={() => onToggleLike(item.key)}
              accessibilityRole="button"
              accessibilityLabel={t('news.likeA11y')}
            >
              <MaterialCommunityIcons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? colors.danger : colors.muted}
              />
            </Pressable>
            <Pressable
              style={styles.commentBtn}
              onPress={() => openPostUrl(item)}
              accessibilityRole="button"
              accessibilityLabel={t('news.writeComment')}
            >
              <MaterialCommunityIcons name="comment-outline" size={22} color={colors.muted} />
              <Text style={styles.commentBtnText}>{t('news.writeComment')}</Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [
      avatarSource,
      colors.danger,
      colors.muted,
      communityTitle,
      likedKeys,
      locale,
      onToggleLike,
      openPostUrl,
      openVideo,
      styles,
      t,
    ],
  );

  if (loadingFirst && posts.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        {listHeader}
        <View style={styles.centerFill}>
          <ClubDataLoader message={t('news.scanning')} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorKind && posts.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        {listHeader}
        <View style={styles.centerFill}>
          <Text style={styles.err}>{errText}</Text>
          <Pressable style={styles.retry} onPress={onRetry}>
            <Text style={styles.retryText}>{t('news.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        data={displayedPosts}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentBright}
            colors={Platform.OS === 'android' ? [colors.accent] : undefined}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loadingFirst && posts.length === 0 ? (
            <Text style={styles.empty}>{t('news.empty')}</Text>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.accentBright} />
            </View>
          ) : null
        }
      />
      <VkVideoEmbedModal
        visible={!!videoEmbedUri}
        embedUri={videoEmbedUri}
        title={videoTitle}
        onClose={closeVideo}
        loadErrorLabel={t('news.embedLoadError')}
        externalBlockedLabel={t('news.embedExternalBlocked')}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    listContent: { paddingHorizontal: 20, paddingBottom: 24 },
    centerFill: {
      flex: 1,
      minHeight: 200,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    err: { color: colors.danger, textAlign: 'center', marginTop: 12, lineHeight: 22 },
    retry: {
      alignSelf: 'center',
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 20,
      backgroundColor: colors.accentDim,
      borderRadius: 12,
    },
    retryText: { color: '#fff', fontWeight: '700' },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 10,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.bg,
    },
    postHeaderText: { flex: 1, minWidth: 0 },
    authorName: { color: colors.text, fontSize: 15, fontWeight: '700' },
    postDate: { color: colors.muted, fontSize: 13, marginTop: 2 },
    preview: {
      width: '100%',
      height: 220,
      borderRadius: 10,
      marginBottom: 10,
      backgroundColor: colors.bg,
      overflow: 'hidden',
    },
    postText: { color: colors.text, fontSize: 15, lineHeight: 22 },
    postTextMuted: { color: colors.muted, fontSize: 15 },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 6,
    },
    likeBtn: {
      minWidth: 48,
      minHeight: 48,
      paddingVertical: 8,
      paddingHorizontal: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    commentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.cardElevated,
      minWidth: 0,
    },
    commentBtnText: { color: colors.muted, fontSize: 14, flex: 1 },
    videoBtn: {
      alignSelf: 'flex-start',
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.accentDim,
    },
    videoBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
    footer: { paddingVertical: 16, alignItems: 'center' },
  });
}
