import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingFlowApi } from '../../api/endpoints';
import { TodaysBookingBanner } from '../booking/TodaysBookingBanner';
import { fetchMemberTopupBonus, memberTopupSmartFlow } from '../../api/memberMoneyApi';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { getAllBooksPath } from '../../config/vibePaths';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import type { ProfileStackParamList } from '../../navigation/types';

const TOP_UP_QUICK_AMOUNTS = [100, 200, 500, 1000, 1500] as const;

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, logout, refreshMemberBalance } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpPromo, setTopUpPromo] = useState('');
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [topUpErr, setTopUpErr] = useState<string | null>(null);
  const [topUpBonusByAmount, setTopUpBonusByAmount] = useState<
    Record<(typeof TOP_UP_QUICK_AMOUNTS)[number], number | null>
  >({} as Record<(typeof TOP_UP_QUICK_AMOUNTS)[number], number | null>);
  const [topUpBonusPreviewLoading, setTopUpBonusPreviewLoading] = useState(false);

  const accountLabel = user?.memberAccount ?? '—';

  useEffect(() => {
    if (!topUpOpen || !user?.memberId) {
      setTopUpBonusByAmount({} as Record<(typeof TOP_UP_QUICK_AMOUNTS)[number], number | null>);
      setTopUpBonusPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setTopUpBonusPreviewLoading(true);
    const promo = topUpPromo.trim() || undefined;
    void (async () => {
      try {
        const { icafe_id } = await bookingFlowApi.icafeIdForMember();
        const cafeId = Number(String(icafe_id).trim());
        if (!Number.isFinite(cafeId)) {
          throw new ApiError('icafe-id-for-member: некорректный club id', 0);
        }
        const entries = await Promise.all(
          TOP_UP_QUICK_AMOUNTS.map(async (amount) => {
            try {
              const { bonusAmount } = await fetchMemberTopupBonus({
                cafeId,
                memberId: user.memberId!,
                topupValue: amount,
                promoCode: promo,
              });
              const b =
                bonusAmount != null && Number.isFinite(bonusAmount) && bonusAmount >= 0
                  ? bonusAmount
                  : 0;
              return [amount, b] as const;
            } catch {
              return [amount, null] as const;
            }
          })
        );
        if (cancelled) return;
        setTopUpBonusByAmount(
          Object.fromEntries(entries) as Record<
            (typeof TOP_UP_QUICK_AMOUNTS)[number],
            number | null
          >
        );
      } catch {
        if (!cancelled) {
          setTopUpBonusByAmount({} as Record<(typeof TOP_UP_QUICK_AMOUNTS)[number], number | null>);
        }
      } finally {
        if (!cancelled) setTopUpBonusPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topUpOpen, user?.memberId, topUpPromo]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.memberId || !user.memberAccount.trim()) return;
      void refreshMemberBalance();
    }, [user?.memberId, user?.memberAccount, refreshMemberBalance])
  );

  const closeTopUp = useCallback(() => {
    if (topUpBusy) return;
    setTopUpOpen(false);
    setTopUpErr(null);
  }, [topUpBusy]);

  const onSubmitTopUp = useCallback(async () => {
    if (!user?.memberId) return;
    const raw = topUpAmount.replace(/\s/g, '').replace(',', '.');
    const amount = parseFloat(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpErr(t('profile.topUpAmountInvalid'));
      return;
    }
    setTopUpErr(null);
    setTopUpBusy(true);
    try {
      const { icafe_id } = await bookingFlowApi.icafeIdForMember();
      const cafeId = Number(String(icafe_id).trim());
      if (!Number.isFinite(cafeId)) {
        throw new ApiError('icafe-id-for-member: некорректный club id', 0);
      }
      await memberTopupSmartFlow({
        cafeId,
        memberId: user.memberId,
        topupValue: amount,
        promoCode: topUpPromo.trim() || undefined,
      });
      await refreshMemberBalance();
      setTopUpOpen(false);
      setTopUpAmount('');
      setTopUpPromo('');
      Alert.alert('', t('profile.mockTopupSuccess'));
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : t('profile.mockTopupError');
      setTopUpErr(msg);
    } finally {
      setTopUpBusy(false);
    }
  }, [user?.memberId, topUpAmount, topUpPromo, refreshMemberBalance, t]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TodaysBookingBanner />
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.heroGreeting}>{t('profile.greeting')}</Text>
            <Text style={styles.heroAccount} numberOfLines={2}>
              {accountLabel}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.settings')}
          >
            <MaterialCommunityIcons name="cog-outline" size={26} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceCardLabel}>{t('profile.balance')}</Text>
          {user?.balanceRub !== undefined ? (
            <Text style={styles.balanceCardValue}>{user.balanceRub.toFixed(2)} ₽</Text>
          ) : (
            <Text style={styles.heroHint}>{t('profile.balanceHint')}</Text>
          )}
          {user?.memberId ? (
            <Text style={styles.bonusHint}>
              {t('profile.bonusBalance')}:{' '}
              {user.bonusBalanceRub !== undefined
                ? `${user.bonusBalanceRub.toFixed(2)} ₽`
                : '—'}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>{t('profile.topUpModalTitle')}</Text>
        <Pressable
          style={({ pressed }) => [styles.primaryCta, pressed && styles.primaryCtaPressed]}
          onPress={() => setTopUpOpen(true)}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="wallet-plus-outline" size={22} color={colors.accentTextOnButton} />
          <Text style={styles.primaryCtaText}>{t('profile.topUpInApp')}</Text>
        </Pressable>

        {user?.memberId ? (
          <>
            <Text style={styles.sectionTitle}>{t('profile.insightSectionTitle')}</Text>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => navigation.navigate('BalanceHistory')}
            >
              <MaterialCommunityIcons name="cash-multiple" size={22} color={colors.accent} />
              <View style={styles.actionCardText}>
                <Text style={styles.actionCardTitle}>{t('profile.ctaBalanceHistory')}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => navigation.navigate('GameSessions')}
            >
              <MaterialCommunityIcons name="controller-classic-outline" size={22} color={colors.accent} />
              <View style={styles.actionCardText}>
                <Text style={styles.actionCardTitle}>{t('profile.ctaGameSessions')}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => navigation.navigate('CustomerAnalysis')}
              disabled={!user?.memberAccount}
            >
              <MaterialCommunityIcons name="chart-line" size={22} color={colors.accent} />
              <View style={styles.actionCardText}>
                <Text style={styles.actionCardTitle}>{t('profile.ctaCustomerAnalysis')}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              onPress={() => navigation.navigate('Ranking')}
            >
              <MaterialCommunityIcons name="trophy-outline" size={22} color={colors.accent} />
              <View style={styles.actionCardText}>
                <Text style={styles.actionCardTitle}>{t('profile.ctaRanking')}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          </>
        ) : null}

        {__DEV__ ? (
          <View style={styles.card}>
            <Text style={styles.devBooksPath}>
              {t('profile.devAllBooksPath')} {getAllBooksPath()}
            </Text>
          </View>
        ) : null}

        <Pressable onPress={() => logout()} style={styles.out}>
          <Text style={styles.outText}>{t('profile.logout')}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={topUpOpen} animationType="slide" transparent onRequestClose={closeTopUp}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeTopUp} />
          <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
            <View style={styles.modalGrab}>
              <View style={styles.modalGrabBar} />
            </View>
            <View style={styles.modalBar}>
              <Text style={styles.modalTitle}>{t('profile.topUpModalTitle')}</Text>
              <Pressable onPress={closeTopUp} hitSlop={12} disabled={topUpBusy}>
                <Text style={styles.modalClose}>{t('profile.close')}</Text>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
            <Text style={styles.modalHint}>{t('profile.mockTopupAutoHint')}</Text>
            {user?.memberId ? (
              <View style={styles.bonusTable}>
                <Text style={styles.bonusTableTitle}>{t('profile.topUpBonusPreviewTitle')}</Text>
                <View style={styles.bonusTableHeaderRow}>
                  <Text style={[styles.bonusTableCell, styles.bonusTableHeaderCell]}>
                    {t('profile.topUpBonusColAmount')}
                  </Text>
                  <Text style={[styles.bonusTableCell, styles.bonusTableHeaderCell, styles.bonusTableCellRight]}>
                    {t('profile.topUpBonusColBonus')}
                  </Text>
                </View>
                {TOP_UP_QUICK_AMOUNTS.map((amount, idx) => {
                  const bonus = topUpBonusByAmount[amount];
                  const bonusText = (() => {
                    if (topUpBonusPreviewLoading) return t('profile.topUpBonusLoading');
                    if (bonus === undefined || bonus === null) return t('profile.topUpBonusUnavailable');
                    return `${bonus.toFixed(0)} ₽`;
                  })();
                  const isLast = idx === TOP_UP_QUICK_AMOUNTS.length - 1;
                  return (
                    <View
                      key={amount}
                      style={[styles.bonusTableRow, isLast && styles.bonusTableRowLast]}
                    >
                      <Text style={styles.bonusTableCell}>{amount} ₽</Text>
                      <Text style={[styles.bonusTableCell, styles.bonusTableCellRight]}>{bonusText}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
            <Text style={styles.inputLabel}>{t('profile.topUpAmountLabel')}</Text>
            <View style={styles.quickAmountsRow}>
              {TOP_UP_QUICK_AMOUNTS.map((n) => (
                <Pressable
                  key={n}
                  style={({ pressed }) => [
                    styles.quickAmountChip,
                    pressed && styles.quickAmountChipPressed,
                  ]}
                  onPress={() => setTopUpAmount(String(n))}
                  disabled={topUpBusy}
                >
                  <Text style={styles.quickAmountChipText}>{n} ₽</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              keyboardType="decimal-pad"
              placeholder="100"
              placeholderTextColor={colors.muted}
              editable={!topUpBusy}
            />
            <Text style={styles.inputLabel}>{t('profile.topupPromoPlaceholder')}</Text>
            <TextInput
              style={styles.input}
              value={topUpPromo}
              onChangeText={setTopUpPromo}
              autoCapitalize="none"
              editable={!topUpBusy}
            />
            <Text style={styles.promoHint}>{t('profile.topupPromoHint')}</Text>
            {topUpErr ? <Text style={styles.topUpErr}>{topUpErr}</Text> : null}
            <Pressable
              style={({ pressed }) => [
                styles.modalSubmit,
                (pressed || topUpBusy) && styles.modalSubmitPressed,
              ]}
              onPress={() => void onSubmitTopUp()}
              disabled={topUpBusy}
            >
              {topUpBusy ? (
                <ActivityIndicator color={colors.accentTextOnButton} />
              ) : (
                <Text style={styles.modalSubmitText}>{t('profile.topUpSubmit')}</Text>
              )}
            </Pressable>
            {topUpBusy ? (
              <Text style={styles.processingHint}>{t('profile.topUpProcessing')}</Text>
            ) : null}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 20, paddingBottom: 40 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 12,
    },
    headerTitles: { flex: 1, minWidth: 0 },
    heroGreeting: { fontSize: 15, fontWeight: '600', color: colors.muted, marginBottom: 6 },
    heroAccount: { fontSize: 24, fontWeight: '800', color: colors.text },
    heroHint: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
    iconBtn: {
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    iconBtnPressed: { opacity: 0.85 },
    balanceCard: {
      backgroundColor: colors.cardElevated,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    balanceCardLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 8 },
    balanceCardValue: { fontSize: 32, fontWeight: '800', color: colors.accent },
    bonusHint: { marginTop: 10, fontSize: 14, color: colors.muted, fontWeight: '600' },
    quickAmountsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    quickAmountChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    quickAmountChipPressed: { opacity: 0.88 },
    quickAmountChipText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.muted,
      marginBottom: 10,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionCardPressed: { opacity: 0.92 },
    actionCardText: { flex: 1, minWidth: 0 },
    actionCardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    actionCardSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
    primaryCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.accent,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 14,
      marginBottom: 10,
    },
    primaryCtaPressed: { opacity: 0.92 },
    primaryCtaText: { color: colors.accentTextOnButton, fontWeight: '800', fontSize: 16 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    out: {
      alignSelf: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 4,
    },
    outText: { color: colors.danger, fontWeight: '600' },
    devBooksPath: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '92%',
    },
    modalGrab: { alignItems: 'center', paddingBottom: 8 },
    modalGrabBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
    modalScrollContent: { paddingBottom: 8 },
    bonusTable: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 16,
      overflow: 'hidden',
    },
    bonusTableTitle: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 6,
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    bonusTableHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardElevated,
    },
    bonusTableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    bonusTableRowLast: { borderBottomWidth: 0 },
    bonusTableCell: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    bonusTableHeaderCell: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    bonusTableCellRight: { textAlign: 'right' },
    modalBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 },
    modalClose: { color: colors.accent, fontSize: 16, fontWeight: '600' },
    modalHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 14 },
    inputLabel: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 17,
      color: colors.text,
      backgroundColor: colors.card,
      marginBottom: 14,
    },
    promoHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 12 },
    topUpErr: { color: colors.danger, fontSize: 13, marginBottom: 10 },
    modalSubmit: {
      backgroundColor: colors.accent,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    modalSubmitPressed: { opacity: 0.9 },
    modalSubmitText: { color: colors.accentTextOnButton, fontWeight: '800', fontSize: 16 },
    processingHint: { textAlign: 'center', color: colors.muted, marginTop: 10, fontSize: 13 },
  });
}
