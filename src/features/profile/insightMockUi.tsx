import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../components/DinText';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';

const PAGE_SIZE = 4;

/** Реальные данные с API: `EXPO_PUBLIC_INSIGHTS_UI_MODE=live` в .env */
export function insightsUseLiveApi(): boolean {
  return process.env.EXPO_PUBLIC_INSIGHTS_UI_MODE === 'live';
}

type Loc = 'ru' | 'en';

function locFrom(locale: string): Loc {
  return locale === 'en' ? 'en' : 'ru';
}

type MockMoneyRow = { when: string; title: string; amount: string; positive: boolean };
type MockSessionRow = { when: string; pc: string; duration: string; tariff: string };
type MockStatRow = { label: string; value: string };

function allMockBalanceRows(loc: Loc): MockMoneyRow[] {
  if (loc === 'en') {
    return [
      { when: 'Apr 26, 19:42', title: 'Account top-up', amount: '+500.00 ₽', positive: true },
      { when: 'Apr 25, 14:08', title: 'PC session · PC 7', amount: '−180.00 ₽', positive: false },
      { when: 'Apr 24, 21:15', title: 'Cancellation of booking', amount: '+100.00 ₽', positive: true },
      { when: 'Apr 23, 18:02', title: 'PC session · PC 12', amount: '−220.00 ₽', positive: false },
      { when: 'Apr 22, 12:30', title: 'Promo bonus', amount: '+50.00 ₽', positive: true },
      { when: 'Apr 21, 20:11', title: 'PC session · VIP-03', amount: '−340.00 ₽', positive: false },
    ];
  }
  return [
    { when: '26 апр., 19:42', title: 'Пополнение счёта', amount: '+500,00 ₽', positive: true },
    { when: '25 апр., 14:08', title: 'Сессия на ПК · ПК 7', amount: '−180,00 ₽', positive: false },
    { when: '24 апр., 21:15', title: 'Отмена брони', amount: '+100,00 ₽', positive: true },
    { when: '23 апр., 18:02', title: 'Сессия на ПК · ПК 12', amount: '−220,00 ₽', positive: false },
    { when: '22 апр., 12:30', title: 'Бонус по акции', amount: '+50,00 ₽', positive: true },
    { when: '21 апр., 20:11', title: 'Сессия на ПК · VIP-03', amount: '−340,00 ₽', positive: false },
  ];
}

function allMockSessionRows(loc: Loc): MockSessionRow[] {
  if (loc === 'en') {
    return [
      { when: 'Apr 26, 18:10–21:40', pc: 'PC 7 · Game zone', duration: '3 h 30 m', tariff: 'Standard' },
      { when: 'Apr 25, 16:00–19:20', pc: 'PC 12 · Bootcamp', duration: '3 h 20 m', tariff: 'Evening' },
      { when: 'Apr 24, 22:05–01:10', pc: 'VIP-03', duration: '3 h 5 m', tariff: 'Night' },
      { when: 'Apr 23, 12:15–15:00', pc: 'PC 2 · Game zone', duration: '2 h 45 m', tariff: 'Day' },
      { when: 'Apr 22, 19:30–23:50', pc: 'PC 9', duration: '4 h 20 m', tariff: 'Standard' },
    ];
  }
  return [
    { when: '26 апр., 18:10–21:40', pc: 'ПК 7 · Game zone', duration: '3 ч 30 мин', tariff: 'Стандарт' },
    { when: '25 апр., 16:00–19:20', pc: 'ПК 12 · Bootcamp', duration: '3 ч 20 мин', tariff: 'Вечер' },
    { when: '24 апр., 22:05–01:10', pc: 'VIP-03', duration: '3 ч 5 мин', tariff: 'Ночь' },
    { when: '23 апр., 12:15–15:00', pc: 'ПК 2 · Game zone', duration: '2 ч 45 мин', tariff: 'День' },
    { when: '22 апр., 19:30–23:50', pc: 'ПК 9', duration: '4 ч 20 мин', tariff: 'Стандарт' },
  ];
}

function mockAnalysisRows(loc: Loc): MockStatRow[] {
  if (loc === 'en') {
    return [
      { label: 'Visits in the last 30 days', value: '9' },
      { label: 'Time spent in the last 30 days', value: '26 h 10 m' },
      { label: 'Average visit duration', value: '2 h 54 m' },
      { label: 'Peak visit time', value: 'Evening, Fri-Sun' },
      { label: 'Most visited zone', value: 'Game zone' },
    ];
  }
  return [
    { label: 'Посещений за последние 30 дней', value: '9' },
    { label: 'Проведено времени за последние 30 дней', value: '26 ч 10 мин' },
    { label: 'Средняя длительность визита', value: '2 ч 54 мин' },
    { label: 'Пиковое время посещений', value: 'Вечером, пт-вс' },
    { label: 'Самая посещаемая зона', value: 'Игровая зона' },
  ];
}

function mockBannerText(loc: Loc): string {
  return loc === 'en'
    ? 'Sample data — the list will fill from the API when it is ready.'
    : 'Пример данных — список подставится из API, когда он заработает.';
}

function createMockStyles(colors: ColorPalette) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.zoneBg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    bannerText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.muted },
    card: {
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    when: { fontSize: 12, color: colors.muted, marginBottom: 4 },
    title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
    amount: { fontSize: 16, fontWeight: '800' },
    amountPos: { color: colors.success },
    amountNeg: { color: colors.danger },
    subLine: { fontSize: 13, color: colors.muted, marginTop: 6 },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    statRowLast: { borderBottomWidth: 0 },
    statLabel: { fontSize: 14, color: colors.muted, flex: 1, paddingRight: 8 },
    statValue: { fontSize: 15, fontWeight: '700', color: colors.text },
    rankRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rankRowPressed: { opacity: 0.82 },
    rankRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
    rankRowLabel: { fontSize: 14, color: colors.accentBright, fontWeight: '700' },
    rankRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rankHero: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    rankPlace: { fontSize: 36, fontWeight: '800', color: colors.accentBright },
    rankClub: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 6, textAlign: 'center' },
    rankNet: { fontSize: 14, color: colors.muted, marginTop: 4, textAlign: 'center' },
    pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 },
    pagerBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    pagerBtnDisabled: { opacity: 0.45 },
    pagerBtnText: { color: colors.accentBright, fontWeight: '700' },
    pagerInfo: { color: colors.text, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  });
}

export type InsightMockVariant = 'balance' | 'sessions' | 'analysis' | 'ranking';
export type RankingGame = 'CS2' | 'Dota 2' | 'Valorant' | 'PUBG';

export function InsightMockPlaceholder({
  variant,
  page,
  onPageChange,
  onSelectGame,
}: {
  variant: InsightMockVariant;
  page: number;
  onPageChange?: (p: number) => void;
  onSelectGame?: (game: RankingGame) => void;
}) {
  const { locale, t } = useLocale();
  const colors = useThemeColors();
  const loc = locFrom(locale);
  const styles = useMemo(() => createMockStyles(colors), [colors]);

  const balanceAll = useMemo(() => allMockBalanceRows(loc), [loc]);
  const sessionAll = useMemo(() => allMockSessionRows(loc), [loc]);
  const analysisRows = useMemo(() => mockAnalysisRows(loc), [loc]);

  const { slice, totalPages } = useMemo(() => {
    if (variant === 'balance') {
      const total = Math.max(1, Math.ceil(balanceAll.length / PAGE_SIZE));
      const p = Math.min(Math.max(1, page), total);
      const start = (p - 1) * PAGE_SIZE;
      return { slice: balanceAll.slice(start, start + PAGE_SIZE), totalPages: total };
    }
    if (variant === 'sessions') {
      const total = Math.max(1, Math.ceil(sessionAll.length / PAGE_SIZE));
      const p = Math.min(Math.max(1, page), total);
      const start = (p - 1) * PAGE_SIZE;
      return { slice: sessionAll.slice(start, start + PAGE_SIZE), totalPages: total };
    }
    return { slice: [] as unknown[], totalPages: 1 };
  }, [variant, page, balanceAll, sessionAll]);

  const showPager = variant === 'balance' || variant === 'sessions';

  return (
    <View>
      <View style={styles.banner}>
        <MaterialCommunityIcons name="information-outline" size={22} color={colors.accentBright} />
        <Text style={styles.bannerText}>{mockBannerText(loc)}</Text>
      </View>

      {variant === 'balance'
        ? (slice as MockMoneyRow[]).map((row, i) => (
            <View key={`${row.when}-${i}`} style={styles.card}>
              <Text style={styles.when}>{row.when}</Text>
              <View style={styles.rowTop}>
                <Text style={styles.title}>{row.title}</Text>
                <Text style={[styles.amount, row.positive ? styles.amountPos : styles.amountNeg]}>{row.amount}</Text>
              </View>
            </View>
          ))
        : null}

      {variant === 'sessions'
        ? (slice as MockSessionRow[]).map((row, i) => (
            <View key={`${row.when}-${i}`} style={styles.card}>
              <Text style={styles.when}>{row.when}</Text>
              <Text style={styles.title}>{row.pc}</Text>
              <Text style={styles.subLine}>
                {loc === 'en' ? 'Duration' : 'Длительность'}: {row.duration} · {row.tariff}
              </Text>
            </View>
          ))
        : null}

      {variant === 'analysis' ? (
        <View style={styles.card}>
          {analysisRows.map((row, idx) => (
            <View
              key={row.label}
              style={[styles.statRow, idx === analysisRows.length - 1 ? styles.statRowLast : null]}
            >
              <Text style={styles.statLabel}>{row.label}</Text>
              <Text style={styles.statValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {variant === 'ranking' ? (
        <View style={styles.rankHero}>
          <MaterialCommunityIcons name="trophy-variant-outline" size={40} color={colors.accentBright} />
          <Text style={styles.rankClub}>
            {loc === 'en' ? 'Rank by game' : 'Рейтинг по играм'}
          </Text>
          <View style={[styles.card, { width: '100%', marginTop: 12, marginBottom: 0 }]}>
            <Pressable
              style={({ pressed }) => [styles.rankRow, pressed && styles.rankRowPressed]}
              onPress={() => onSelectGame?.('CS2')}
            >
              <View style={styles.rankRowLeft}>
                <MaterialCommunityIcons name="gesture-tap" size={16} color={colors.accentBright} />
                <Text style={styles.rankRowLabel}>CS2</Text>
              </View>
              <View style={styles.rankRowRight}>
                <Text style={styles.statValue}>#12</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.rankRow, pressed && styles.rankRowPressed]}
              onPress={() => onSelectGame?.('Dota 2')}
            >
              <View style={styles.rankRowLeft}>
                <MaterialCommunityIcons name="gesture-tap" size={16} color={colors.accentBright} />
                <Text style={styles.rankRowLabel}>Dota 2</Text>
              </View>
              <View style={styles.rankRowRight}>
                <Text style={styles.statValue}>#8</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.rankRow, pressed && styles.rankRowPressed]}
              onPress={() => onSelectGame?.('Valorant')}
            >
              <View style={styles.rankRowLeft}>
                <MaterialCommunityIcons name="gesture-tap" size={16} color={colors.accentBright} />
                <Text style={styles.rankRowLabel}>Valorant</Text>
              </View>
              <View style={styles.rankRowRight}>
                <Text style={styles.statValue}>#19</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.rankRow, styles.statRowLast, pressed && styles.rankRowPressed]}
              onPress={() => onSelectGame?.('PUBG')}
            >
              <View style={styles.rankRowLeft}>
                <MaterialCommunityIcons name="gesture-tap" size={16} color={colors.accentBright} />
                <Text style={styles.rankRowLabel}>PUBG</Text>
              </View>
              <View style={styles.rankRowRight}>
                <Text style={styles.statValue}>#5</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showPager && onPageChange ? null : null}
    </View>
  );
}
