import React, { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../components/DinText';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { bookingFlowApi } from '../../api/endpoints';
import {
  extractRankingUrl,
  extractRowsForList,
  fetchCustomerAnalysis,
  fetchMemberBalanceHistory,
  fetchPcSessions,
  fetchRankingPayload,
} from '../../api/profileInsightsApi';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/messagesRu';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import type { ProfileStackParamList } from '../../navigation/types';
import { queryKeys } from '../../query/queryKeys';
import { ClubDataLoader } from '../ui/ClubDataLoader';
import { InsightMockPlaceholder, insightsUseLiveApi, type RankingGame } from './insightMockUi';

const MAX_ROW_JSON_CHARS = 12_000;
const MAX_FULL_JSON_CHARS = 80_000;

function humanizePcAlias(input: string): string {
  return input.replace(/\bpc-(\d{1,2})\b/gi, (_full, d: string) => `ПК ${Number(d)}`);
}

function truncateForUi(s: string, max: number, overflowHint: string): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n…\n${overflowHint}`;
}

/** Безопасная сериализация для Text: без исключений на циклах и с ограничением длины (Android может падать на огромных строках). */
function safeJsonForDisplay(
  data: unknown,
  t: (k: MessageKey) => string,
): string {
  if (typeof data === 'string') {
    return truncateForUi(humanizePcAlias(data), MAX_FULL_JSON_CHARS, t('profile.insightDisplayOverflow'));
  }
  try {
    const s = JSON.stringify(data, null, 2);
    return truncateForUi(humanizePcAlias(s), MAX_FULL_JSON_CHARS, t('profile.insightDisplayOverflow'));
  } catch {
    return t('profile.insightUnserializable');
  }
}

function parseIcafeId(raw: { icafe_id?: string } | undefined): number | null {
  if (raw == null || raw.icafe_id == null) return null;
  const n = Number(String(raw.icafe_id).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Пока API инсайтов не стабилен: любая ошибка/пустой ответ = одинаковый локальный пустой экран. */
function insightPaginatedListPhase(
  icafeLoading: boolean,
  icafeError: boolean,
  icafeHasSuccess: boolean,
  cafeId: number | null,
  listLoading: boolean,
  listError: boolean,
  listSuccess: boolean,
  listPayload: unknown,
): 'loading' | 'empty' | 'data' {
  if (icafeLoading) return 'loading';
  if (icafeError) return 'empty';
  if (icafeHasSuccess && cafeId == null) return 'empty';
  if (listLoading) return 'loading';
  if (listError) return 'empty';
  if (listSuccess) {
    return extractRowsForList(listPayload).length > 0 ? 'data' : 'empty';
  }
  return 'empty';
}

function InsightEmptyState() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View
      style={styles.emptyState}
      accessible
      accessibilityLabel={`${t('profile.insightEmpty')}. ${t('profile.insightEmptyStateHint')}`}
    >
      <MaterialCommunityIcons name="inbox-outline" size={48} color={colors.muted} />
      <Text style={styles.emptyStateTitle}>{t('profile.insightEmpty')}</Text>
      <Text style={styles.emptyStateHint}>{t('profile.insightEmptyStateHint')}</Text>
    </View>
  );
}

function formatRow(row: unknown, t: (k: MessageKey) => string): string {
  if (row && typeof row === 'object') {
    try {
      const s = JSON.stringify(row, null, 2);
      return truncateForUi(humanizePcAlias(s), MAX_ROW_JSON_CHARS, t('profile.insightDisplayOverflow'));
    } catch {
      return humanizePcAlias(String(row));
    }
  }
  return humanizePcAlias(String(row));
}

function PayloadView({ data, emptyText }: { data: unknown; emptyText: string }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rows = extractRowsForList(data);
  if (rows.length > 0) {
    return (
      <View style={styles.gap}>
        {rows.map((row, i) => (
          <View key={i} style={styles.card}>
            <Text selectable style={styles.mono}>
              {formatRow(row, t)}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  if (data == null) {
    return <Text style={styles.muted}>{emptyText}</Text>;
  }
  return (
    <Text selectable style={styles.mono}>
      {safeJsonForDisplay(data, t)}
    </Text>
  );
}

type InsightSectionKey = 'balance' | 'sessions' | 'analysis' | 'ranking';
type RankedPlayer = { name: string; points: number };

const MOCK_GAME_RANKINGS: Record<RankingGame, RankedPlayer[]> = {
  CS2: [
    { name: 'Shadow', points: 2480 },
    { name: 'AimPro', points: 2310 },
    { name: 'Frost', points: 2185 },
    { name: 'Neko', points: 2050 },
    { name: 'Kite', points: 1930 },
  ],
  'Dota 2': [
    { name: 'InvokerMain', points: 3190 },
    { name: 'PudgeHook', points: 2975 },
    { name: 'LaneKing', points: 2850 },
    { name: 'MiranaStar', points: 2710 },
    { name: 'AncientOne', points: 2600 },
  ],
  Valorant: [
    { name: 'ViperX', points: 2720 },
    { name: 'SageHeal', points: 2595 },
    { name: 'RazeBoom', points: 2440 },
    { name: 'CypherNet', points: 2370 },
    { name: 'JettDash', points: 2290 },
  ],
  PUBG: [
    { name: 'LastCircle', points: 3430 },
    { name: 'PanMaster', points: 3290 },
    { name: 'DropHot', points: 3110 },
    { name: 'BlueZone', points: 2965 },
    { name: 'SniperHill', points: 2800 },
  ],
};

export function InsightsHubScreen() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [section, setSection] = useState<InsightSectionKey>('balance');

  const tabs = useMemo(
    () => [
      { key: 'balance' as const, label: t('profile.ctaBalanceHistory'), icon: 'cash-multiple' as const },
      { key: 'sessions' as const, label: t('profile.ctaGameSessions'), icon: 'controller-classic-outline' as const },
      { key: 'analysis' as const, label: t('profile.ctaCustomerAnalysis'), icon: 'chart-line' as const },
      { key: 'ranking' as const, label: t('profile.ctaRanking'), icon: 'trophy-outline' as const },
    ],
    [t],
  );

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.hubTabsWrap}>
        <View style={styles.hubTabsContent}>
          {tabs.map((tab) => {
            const active = tab.key === section;
            return (
              <Pressable
                key={tab.key}
                style={[styles.hubTabBtn, active && styles.hubTabBtnActive]}
                onPress={() => setSection(tab.key)}
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={18}
                  color={active ? colors.accentBright : colors.muted}
                />
                <Text style={[styles.hubTabBtnText, active && styles.hubTabBtnTextActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.hubBody}>
        {section === 'balance' ? <BalanceHistoryScreen /> : null}
        {section === 'sessions' ? <GameSessionsScreen /> : null}
        {section === 'analysis' ? <CustomerAnalysisScreen /> : null}
        {section === 'ranking' ? <RankingScreen /> : null}
      </View>
    </SafeAreaView>
  );
}

export function BalanceHistoryScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(1);
  const live = insightsUseLiveApi();

  const icafeQ = useQuery({
    queryKey: queryKeys.icafeIdForMember(),
    queryFn: () => bookingFlowApi.icafeIdForMember(),
    enabled: live,
    staleTime: live ? 5 * 60 * 1000 : 0,
  });

  const cafeId = useMemo(() => parseIcafeId(icafeQ.data), [icafeQ.data]);

  const q = useQuery({
    queryKey: ['balance-history', user?.memberId, cafeId, page],
    queryFn: async () => {
      return fetchMemberBalanceHistory(cafeId!, { memberId: user!.memberId, page });
    },
    enabled: live && !!user?.memberId && icafeQ.isSuccess && cafeId != null,
    staleTime: live ? 60 * 1000 : 0,
  });

  const phase = insightPaginatedListPhase(
    icafeQ.isLoading,
    icafeQ.isError,
    icafeQ.isSuccess,
    cafeId,
    q.isLoading,
    q.isError,
    q.isSuccess,
    q.data,
  );

  if (!live) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <View style={styles.screenWithBottomBar}>
          <ScrollView contentContainerStyle={[styles.scroll, styles.scrollWithBottomBar]}>
            <InsightMockPlaceholder variant="balance" page={page} />
          </ScrollView>
          <View style={styles.bottomBar}>
            <View style={styles.pager}>
              <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <Text style={styles.pagerBtnText}>{t('profile.pagePrev')}</Text>
              </Pressable>
              <Text style={styles.pagerInfo}>{page}</Text>
              <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => p + 1)}>
                <Text style={styles.pagerBtnText}>{t('profile.pageNext')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.screenWithBottomBar}>
        <ScrollView contentContainerStyle={[styles.scroll, phase === 'data' ? styles.scrollWithBottomBar : null]}>
          {phase === 'loading' ? <ClubDataLoader message={t('common.loadingData')} compact minHeight={160} /> : null}
          {phase === 'empty' ? <InsightEmptyState /> : null}
          {phase === 'data' && q.data != null ? (
            <PayloadView data={q.data} emptyText={t('profile.insightEmpty')} />
          ) : null}
        </ScrollView>
        {phase === 'data' ? (
          <View style={styles.bottomBar}>
            <View style={styles.pager}>
              <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <Text style={styles.pagerBtnText}>{t('profile.pagePrev')}</Text>
              </Pressable>
              <Text style={styles.pagerInfo}>{page}</Text>
              <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => p + 1)}>
                <Text style={styles.pagerBtnText}>{t('profile.pageNext')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export function GameSessionsScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(1);
  const live = insightsUseLiveApi();

  const icafeQ = useQuery({
    queryKey: queryKeys.icafeIdForMember(),
    queryFn: () => bookingFlowApi.icafeIdForMember(),
    enabled: live,
    staleTime: live ? 5 * 60 * 1000 : 0,
  });

  const cafeId = useMemo(() => parseIcafeId(icafeQ.data), [icafeQ.data]);

  const q = useQuery({
    queryKey: ['pc-sessions', user?.memberId, cafeId, page],
    queryFn: async () => {
      return fetchPcSessions(cafeId!, { memberId: user!.memberId, page });
    },
    enabled: live && !!user?.memberId && icafeQ.isSuccess && cafeId != null,
    staleTime: live ? 60 * 1000 : 0,
  });

  const phase = insightPaginatedListPhase(
    icafeQ.isLoading,
    icafeQ.isError,
    icafeQ.isSuccess,
    cafeId,
    q.isLoading,
    q.isError,
    q.isSuccess,
    q.data,
  );

  if (!live) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <View style={styles.screenWithBottomBar}>
          <ScrollView contentContainerStyle={[styles.scroll, styles.scrollWithBottomBar]}>
            <InsightMockPlaceholder variant="sessions" page={page} />
          </ScrollView>
          <View style={styles.bottomBar}>
            <View style={styles.pager}>
              <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <Text style={styles.pagerBtnText}>{t('profile.pagePrev')}</Text>
              </Pressable>
              <Text style={styles.pagerInfo}>{page}</Text>
              <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => p + 1)}>
                <Text style={styles.pagerBtnText}>{t('profile.pageNext')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.screenWithBottomBar}>
        <ScrollView contentContainerStyle={[styles.scroll, phase === 'data' ? styles.scrollWithBottomBar : null]}>
          {phase === 'loading' ? <ClubDataLoader message={t('common.loadingData')} compact minHeight={160} /> : null}
          {phase === 'empty' ? <InsightEmptyState /> : null}
          {phase === 'data' && q.data != null ? (
            <PayloadView data={q.data} emptyText={t('profile.insightEmpty')} />
          ) : null}
        </ScrollView>
        {phase === 'data' ? (
          <View style={styles.bottomBar}>
            <View style={styles.pager}>
              <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <Text style={styles.pagerBtnText}>{t('profile.pagePrev')}</Text>
              </Pressable>
              <Text style={styles.pagerInfo}>{page}</Text>
              <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => p + 1)}>
                <Text style={styles.pagerBtnText}>{t('profile.pageNext')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export function CustomerAnalysisScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const live = insightsUseLiveApi();

  const q = useQuery({
    queryKey: ['customer-analysis', user?.memberAccount],
    queryFn: () => fetchCustomerAnalysis(user?.memberAccount),
    enabled: live && !!user?.memberAccount,
    staleTime: live ? 5 * 60 * 1000 : 0,
  });

  const phase = useMemo(() => {
    if (q.isLoading) return 'loading' as const;
    if (q.isError) return 'empty' as const;
    if (q.isSuccess) {
      return extractRowsForList(q.data).length > 0 ? ('data' as const) : ('empty' as const);
    }
    return 'empty' as const;
  }, [q.isLoading, q.isError, q.isSuccess, q.data]);

  if (!live) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <InsightMockPlaceholder variant="analysis" page={1} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {phase === 'loading' ? <ClubDataLoader message={t('common.loadingData')} compact minHeight={160} /> : null}
        {phase === 'empty' ? <InsightEmptyState /> : null}
        {phase === 'data' && q.data != null ? (
          <PayloadView data={q.data} emptyText={t('profile.insightEmpty')} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function RankingScreen() {
  const { t } = useLocale();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const live = insightsUseLiveApi();
  const gameRows = useMemo(() => {
    return (Object.keys(MOCK_GAME_RANKINGS) as RankingGame[]).map((game) => ({
      game,
      topPoints: [...MOCK_GAME_RANKINGS[game]].sort((a, b) => b.points - a.points)[0]?.points ?? 0,
    }));
  }, []);

  const icafeQ = useQuery({
    queryKey: queryKeys.icafeIdForMember(),
    queryFn: () => bookingFlowApi.icafeIdForMember(),
    enabled: live,
    staleTime: live ? 5 * 60 * 1000 : 0,
  });

  const cafeId = useMemo(() => parseIcafeId(icafeQ.data), [icafeQ.data]);

  const q = useQuery({
    queryKey: ['ranking', cafeId],
    queryFn: async () => fetchRankingPayload(cafeId!),
    enabled: live && icafeQ.isSuccess && cafeId != null,
    staleTime: live ? 5 * 60 * 1000 : 0,
  });

  const rankingContent = useMemo(() => {
    if (q.data == null) return { url: null as string | null, rows: [] as unknown[] };
    return {
      url: extractRankingUrl(q.data),
      rows: extractRowsForList(q.data),
    };
  }, [q.data]);

  const onOpen = useCallback(() => {
    if (rankingContent.url) void Linking.openURL(rankingContent.url);
  }, [rankingContent.url]);

  const phase = useMemo(() => {
    if (icafeQ.isLoading) return 'loading' as const;
    if (icafeQ.isError) return 'empty' as const;
    if (icafeQ.isSuccess && cafeId == null) return 'empty' as const;
    if (q.isLoading) return 'loading' as const;
    if (q.isError) return 'empty' as const;
    if (q.isSuccess) {
      if (rankingContent.url != null) return 'content' as const;
      if (rankingContent.rows.length > 0) return 'content' as const;
      return 'empty' as const;
    }
    return 'empty' as const;
  }, [
    icafeQ.isLoading,
    icafeQ.isError,
    icafeQ.isSuccess,
    cafeId,
    q.isLoading,
    q.isError,
    q.isSuccess,
    rankingContent.url,
    rankingContent.rows.length,
  ]);

  if (!live) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <InsightMockPlaceholder
            variant="ranking"
            page={1}
            onSelectGame={(game) => navigation.navigate('GameRankingUsers', { game })}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {phase === 'loading' ? <ClubDataLoader message={t('common.loadingData')} compact minHeight={160} /> : null}
        {phase === 'empty' ? <InsightEmptyState /> : null}
        {phase === 'content' && rankingContent.url != null ? (
          <Pressable style={styles.primaryBtn} onPress={onOpen}>
            <Text style={styles.primaryBtnText}>{t('profile.rankingOpen')}</Text>
          </Pressable>
        ) : null}
        <View style={styles.card}>
          {(gameRows).map((row, idx) => (
            <Pressable
              key={row.game}
              style={[styles.statRow, idx === gameRows.length - 1 ? styles.statRowLast : null]}
              onPress={() => navigation.navigate('GameRankingUsers', { game: row.game })}
            >
              <Text style={styles.statLabel}>{row.game}</Text>
              <Text style={styles.statValue}>{row.topPoints}</Text>
            </Pressable>
          ))}
        </View>
        {phase === 'content' && q.data != null && rankingContent.rows.length > 0 ? (
          <PayloadView data={q.data} emptyText={t('profile.insightEmpty')} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function GameRankingUsersScreen() {
  const route = useRoute<RouteProp<ProfileStackParamList, 'GameRankingUsers'>>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const game = route.params.game;
  const players = useMemo(
    () => [...(MOCK_GAME_RANKINGS[game] ?? [])].sort((a, b) => b.points - a.points),
    [game],
  );

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.rankHeaderRow}>
            <Text style={styles.rankHeaderPlace}>{'Место'}</Text>
            <Text style={styles.rankHeaderName}>{'Имя'}</Text>
            <Text style={styles.rankHeaderPoints}>{'Очки'}</Text>
          </View>
          {players.map((p, idx) => (
            <View key={`${p.name}-${idx}`} style={[styles.rankRow, idx === players.length - 1 ? styles.rankRowLast : null]}>
              <Text style={styles.rankPlaceText}>{idx + 1}</Text>
              <Text style={styles.rankNameText}>{p.name}</Text>
              <Text style={styles.rankPointsText}>{p.points}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    screenWithBottomBar: { flex: 1 },
    scrollWithBottomBar: { paddingBottom: 88 },
    bottomBar: {
      backgroundColor: colors.bg,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 10,
    },
    hubTabsWrap: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    hubTabsContent: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    hubTabBtn: {
      width: '48%',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardElevated,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    hubTabBtnActive: {
      borderColor: colors.accent,
      backgroundColor: colors.chipOn,
    },
    hubTabBtnText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    hubTabBtnTextActive: {
      color: colors.accentBright,
    },
    hubBody: {
      flex: 1,
    },
    scroll: { padding: 16, paddingBottom: 32 },
    emptyState: {
      alignItems: 'center',
      paddingTop: 32,
      paddingBottom: 16,
      paddingHorizontal: 12,
    },
    emptyStateTitle: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    emptyStateHint: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 20,
      color: colors.muted,
      textAlign: 'center',
    },
    gap: { gap: 12 },
    card: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingVertical: 12,
      gap: 10,
    },
    rankHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingBottom: 8,
      marginBottom: 2,
      gap: 10,
    },
    rankHeaderPlace: {
      minWidth: 44,
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    rankHeaderName: {
      flex: 1,
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    rankHeaderPoints: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      minWidth: 54,
      textAlign: 'right',
    },
    rankRowLast: { borderBottomWidth: 0 },
    rankPlaceText: {
      minWidth: 44,
      color: colors.accentBright,
      fontWeight: '800',
      fontSize: 15,
      textAlign: 'left',
    },
    rankNameText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
    rankPointsText: { color: colors.text, fontSize: 15, fontWeight: '800', minWidth: 54, textAlign: 'right' },
    mono: { color: colors.text, fontSize: 13, lineHeight: 18 },
    muted: { color: colors.muted, fontSize: 14 },
    pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
    pagerBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    pagerBtnText: { color: colors.accentBright, fontWeight: '700' },
    pagerInfo: { color: colors.text, fontWeight: '700', minWidth: 28, textAlign: 'center' },
    primaryBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 16,
    },
    primaryBtnText: { color: colors.accentTextOnButton, fontWeight: '800', fontSize: 16 },
  });
}
