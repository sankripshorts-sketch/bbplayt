import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabSettingsButton } from '../../components/TabSettingsButton';
import { getVkWallPostUrl } from '../../config/vkNewsConfig';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { queryKeys } from '../../query/queryKeys';
import { TodaysBookingBanner } from '../booking/TodaysBookingBanner';
import { fetchVkWallVideoPage } from './fetchVkWallVideoPosts';
import type { VkWallFetchResult } from './fetchVkWallVideoPosts';
import { VkVideoEmbedModal } from './VkVideoEmbedModal';
import { buildVkVideoEmbedUrl, type VkWallPost } from './vkWallHtmlParser';

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

export function NewsScreen() {
  const colors = useThemeColors();
  const { t, locale } = useLocale();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const qc = useQueryClient();

  const vkFirst = useQuery({
    queryKey: queryKeys.vkWallFirstPage(),
    queryFn: () => fetchVkWallVideoPage(0),
    /** Лента не «протухает» при переключении вкладок — показываем кэш, обновление только вручную. */
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [tailPosts, setTailPosts] = useState<VkWallPost[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [videoEmbedUri, setVideoEmbedUri] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');

  const loadingMoreRef = useRef(false);

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

  useEffect(() => {
    if (!vkFirst.data) return;
    if (tailPosts.length === 0) {
      setNextOffset(vkFirst.data.nextOffset);
    }
  }, [vkFirst.data, tailPosts.length]);

  const loadingFirst = vkFirst.isPending && !vkFirst.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadingMoreRef.current = false;
    try {
      const fresh = await fetchVkWallVideoPage(0);
      const head = vkFirst.data?.posts ?? [];
      const currentPosts = mergeTailPosts(head, tailPosts);
      const currentKeys = new Set(currentPosts.map((p) => p.key));
      const hasNew = fresh.posts.some((p) => !currentKeys.has(p.key));
      if (hasNew) {
        qc.setQueryData<VkWallFetchResult>(queryKeys.vkWallFirstPage(), fresh);
        setTailPosts([]);
        setNextOffset(fresh.nextOffset);
      }
    } catch {
      /* сеть/парсинг — оставляем уже показанный список */
    } finally {
      setRefreshing(false);
    }
  }, [qc, tailPosts, vkFirst.data?.posts]);

  const onRetry = useCallback(() => {
    void vkFirst.refetch();
  }, [vkFirst]);

  const onEndReached = useCallback(() => {
    if (loadingFirst || refreshing || nextOffset === null || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const off = nextOffset;
    void fetchVkWallVideoPage(off)
      .then((res) => {
        setTailPosts((prev) => mergeTailPosts(prev, res.posts));
        setNextOffset(res.nextOffset);
      })
      .catch(() => {
        /* следующая страница не критична — pull-to-refresh обновит с начала */
      })
      .finally(() => {
        setLoadingMore(false);
        loadingMoreRef.current = false;
      });
  }, [loadingFirst, nextOffset, refreshing]);

  const openPostUrl = useCallback((p: VkWallPost) => {
    const url = getVkWallPostUrl(p.ownerId, p.postId);
    void Linking.openURL(url);
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
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.h1}>{t('news.title')}</Text>
            <Text style={styles.sub}>{t('news.subtitle')}</Text>
          </View>
          <TabSettingsButton />
        </View>
      </>
    ),
    [styles.headerRow, styles.headerTitles, styles.h1, styles.sub, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: VkWallPost }) => (
      <View style={styles.card}>
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
          <Text style={styles.date}>{formatPostDate(item.dateUnix, locale)}</Text>
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
      </View>
    ),
    [locale, openPostUrl, openVideo, styles, t],
  );

  if (loadingFirst && posts.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        {listHeader}
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.hint}>{t('news.scanning')}</Text>
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
        data={posts}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={Platform.OS === 'android' ? [colors.accent] : undefined}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loadingFirst ? <Text style={styles.empty}>{t('news.empty')}</Text> : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.accent} />
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 4,
      marginBottom: 8,
      gap: 12,
    },
    headerTitles: { flex: 1, minWidth: 0 },
    h1: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 6 },
    sub: { fontSize: 14, color: colors.muted, lineHeight: 20 },
    listContent: { paddingHorizontal: 20, paddingBottom: 24 },
    centerFill: {
      flex: 1,
      minHeight: 200,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    hint: { marginTop: 16, color: colors.muted, textAlign: 'center' },
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
    preview: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: 10,
      marginBottom: 10,
      backgroundColor: colors.bg,
    },
    postText: { color: colors.text, fontSize: 15, lineHeight: 22 },
    postTextMuted: { color: colors.muted, fontSize: 15 },
    date: { color: colors.muted, fontSize: 12, marginTop: 8 },
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
