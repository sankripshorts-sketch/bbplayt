import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../components/DinText';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingFlowApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { getInsightsFallbackUrl } from '../../config/insightsFallbackUrl';
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
import { queryKeys } from '../../query/queryKeys';
import { formatPublicErrorMessage } from '../../utils/publicText';

const MAX_ROW_JSON_CHARS = 12_000;
const MAX_FULL_JSON_CHARS = 80_000;

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
    return truncateForUi(data, MAX_FULL_JSON_CHARS, t('profile.insightDisplayOverflow'));
  }
  try {
    const s = JSON.stringify(data, null, 2);
    return truncateForUi(s, MAX_FULL_JSON_CHARS, t('profile.insightDisplayOverflow'));
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

function formatInsightError(e: unknown, t: (k: MessageKey) => string): string {
  if (e instanceof ApiError) {
    const m = e.message.toLowerCase();
    if (
      m.includes('api not allowed') ||
      m.includes('not allowed') ||
      m.includes('недоступен') ||
      m.includes('запрещ') ||
      m.includes('forbidden') ||
      m.includes(' 403') ||
      m.startsWith('403')
    ) {
      return t('profile.insightApiNotAllowed');
    }
    return formatPublicErrorMessage(e, t, 'profile.insightLoadError');
  }
  return formatPublicErrorMessage(e, t, 'profile.insightLoadError');
}

function InsightsFallbackButton({
  t,
  styles,
}: {
  t: (k: MessageKey) => string;
  styles: ReturnType<typeof createStyles>;
}) {
  const url = getInsightsFallbackUrl();
  if (!url) return null;
  return (
    <Pressable style={styles.fallbackBtn} onPress={() => void Linking.openURL(url)}>
      <Text style={styles.fallbackBtnText}>{t('profile.insightsFallbackOpen')}</Text>
    </Pressable>
  );
}

function formatRow(row: unknown, t: (k: MessageKey) => string): string {
  if (row && typeof row === 'object') {
    try {
      const s = JSON.stringify(row, null, 2);
      return truncateForUi(s, MAX_ROW_JSON_CHARS, t('profile.insightDisplayOverflow'));
    } catch {
      return String(row);
    }
  }
  return String(row);
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

export function BalanceHistoryScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(1);

  const icafeQ = useQuery({
    queryKey: queryKeys.icafeIdForMember(),
    queryFn: () => bookingFlowApi.icafeIdForMember(),
  });

  const cafeId = useMemo(() => parseIcafeId(icafeQ.data), [icafeQ.data]);

  const q = useQuery({
    queryKey: ['balance-history', user?.memberId, cafeId, page],
    queryFn: async () => {
      return fetchMemberBalanceHistory(cafeId!, { memberId: user!.memberId, page });
    },
    enabled: !!user?.memberId && icafeQ.isSuccess && cafeId != null,
  });

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {icafeQ.isError ? (
          <>
            <Text style={styles.err}>{formatInsightError(icafeQ.error, t)}</Text>
            <InsightsFallbackButton t={t} styles={styles} />
          </>
        ) : null}
        {icafeQ.isSuccess && cafeId == null ? (
          <Text style={styles.err}>{t('profile.insightInvalidCafe')}</Text>
        ) : null}
        {q.isLoading ? <ActivityIndicator color={colors.accentBright} /> : null}
        {q.isError ? (
          <>
            <Text style={styles.err}>
              {formatInsightError(q.error, t)}
            </Text>
            <InsightsFallbackButton t={t} styles={styles} />
          </>
        ) : null}
        {q.data != null ? <PayloadView data={q.data} emptyText={t('profile.insightEmpty')} /> : null}
        <View style={styles.pager}>
          <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <Text style={styles.pagerBtnText}>{t('profile.pagePrev')}</Text>
          </Pressable>
          <Text style={styles.pagerInfo}>{page}</Text>
          <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => p + 1)}>
            <Text style={styles.pagerBtnText}>{t('profile.pageNext')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function GameSessionsScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(1);

  const icafeQ = useQuery({
    queryKey: queryKeys.icafeIdForMember(),
    queryFn: () => bookingFlowApi.icafeIdForMember(),
  });

  const cafeId = useMemo(() => parseIcafeId(icafeQ.data), [icafeQ.data]);

  const q = useQuery({
    queryKey: ['pc-sessions', user?.memberId, cafeId, page],
    queryFn: async () => {
      return fetchPcSessions(cafeId!, { memberId: user!.memberId, page });
    },
    enabled: !!user?.memberId && icafeQ.isSuccess && cafeId != null,
  });

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {icafeQ.isError ? (
          <>
            <Text style={styles.err}>{formatInsightError(icafeQ.error, t)}</Text>
            <InsightsFallbackButton t={t} styles={styles} />
          </>
        ) : null}
        {icafeQ.isSuccess && cafeId == null ? (
          <Text style={styles.err}>{t('profile.insightInvalidCafe')}</Text>
        ) : null}
        {q.isLoading ? <ActivityIndicator color={colors.accentBright} /> : null}
        {q.isError ? (
          <>
            <Text style={styles.err}>
              {formatInsightError(q.error, t)}
            </Text>
            <InsightsFallbackButton t={t} styles={styles} />
          </>
        ) : null}
        {q.data != null ? <PayloadView data={q.data} emptyText={t('profile.insightEmpty')} /> : null}
        <View style={styles.pager}>
          <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <Text style={styles.pagerBtnText}>{t('profile.pagePrev')}</Text>
          </Pressable>
          <Text style={styles.pagerInfo}>{page}</Text>
          <Pressable style={styles.pagerBtn} onPress={() => setPage((p) => p + 1)}>
            <Text style={styles.pagerBtnText}>{t('profile.pageNext')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function CustomerAnalysisScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const q = useQuery({
    queryKey: ['customer-analysis', user?.memberAccount],
    queryFn: () => fetchCustomerAnalysis(user?.memberAccount),
    enabled: !!user?.memberAccount,
  });

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {q.isLoading ? <ActivityIndicator color={colors.accentBright} /> : null}
        {q.isError ? (
          <>
            <Text style={styles.err}>
              {formatInsightError(q.error, t)}
            </Text>
            <InsightsFallbackButton t={t} styles={styles} />
          </>
        ) : null}
        {q.data != null ? <PayloadView data={q.data} emptyText={t('profile.insightEmpty')} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function RankingScreen() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const icafeQ = useQuery({
    queryKey: queryKeys.icafeIdForMember(),
    queryFn: () => bookingFlowApi.icafeIdForMember(),
  });

  const cafeId = useMemo(() => parseIcafeId(icafeQ.data), [icafeQ.data]);

  const q = useQuery({
    queryKey: ['ranking', cafeId],
    queryFn: async () => fetchRankingPayload(cafeId!),
    enabled: icafeQ.isSuccess && cafeId != null,
  });

  const url = q.data ? extractRankingUrl(q.data) : null;

  const onOpen = useCallback(() => {
    if (url) void Linking.openURL(url);
  }, [url]);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {icafeQ.isError ? (
          <>
            <Text style={styles.err}>{formatInsightError(icafeQ.error, t)}</Text>
            <InsightsFallbackButton t={t} styles={styles} />
          </>
        ) : null}
        {icafeQ.isSuccess && cafeId == null ? (
          <Text style={styles.err}>{t('profile.insightInvalidCafe')}</Text>
        ) : null}
        {q.isLoading ? <ActivityIndicator color={colors.accentBright} /> : null}
        {q.isError ? (
          <>
            <Text style={styles.err}>
              {formatInsightError(q.error, t)}
            </Text>
            <InsightsFallbackButton t={t} styles={styles} />
          </>
        ) : null}
        {url ? (
          <Pressable style={styles.primaryBtn} onPress={onOpen}>
            <Text style={styles.primaryBtnText}>{t('profile.rankingOpen')}</Text>
          </Pressable>
        ) : null}
        {q.data != null ? <PayloadView data={q.data} emptyText={t('profile.insightEmpty')} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 16, paddingBottom: 32 },
    gap: { gap: 12 },
    card: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mono: { color: colors.text, fontSize: 13, lineHeight: 18 },
    muted: { color: colors.muted, fontSize: 14 },
    err: { color: colors.danger, marginBottom: 12 },
    pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 },
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
    fallbackBtn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    fallbackBtnText: { color: colors.accentBright, fontWeight: '700', fontSize: 15 },
  });
}
