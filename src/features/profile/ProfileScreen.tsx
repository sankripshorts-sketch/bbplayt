import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../components/DinText';
import { TextInput } from '../../components/DinTextInput';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bookingFlowApi } from '../../api/endpoints';
import { TodaysBookingBanner } from '../booking/TodaysBookingBanner';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { fonts, useThemeColors } from '../../theme';
import type { ProfileStackParamList } from '../../navigation/types';
import { localTopupBonusRub } from '../../utils/localTopupMock';
import { formatPublicErrorMessage } from '../../utils/publicText';
import { TabScreenTopBar } from '../../components/TabScreenTopBar';
import { DimmedSheetModal } from '../../components/DimmedSheetModal';
import { DraggableWheelSheet } from '../booking/DraggableWheelSheet';
import { grantDiceRollOnTopupIfEligible } from '../../preferences/diceMinigameRolls';
import { loadAppPreferences } from '../../preferences/appPreferences';
import { queryKeys } from '../../query/queryKeys';
import { ProfilePromoFeed } from '../promos/ProfilePromoFeed';
import { PromoDetailModal } from '../promos/PromoDetailModal';
import { DiceMinigameModal } from '../promos/DiceMinigameModal';
import type { PromoId } from '../promos/promoTypes';

const TOP_UP_QUICK_AMOUNTS = [100, 200, 500, 1000, 1500] as const;
type TopUpReceipt = {
  amountRub: number;
  bonusRub: number;
  balanceRub: number;
  bonusBalanceRub: number;
};

/** Фиксированные ширины полос в таблице бонусов (px). 100 ₽ — минимум, дальше — по заданной шкале. */
const TOP_UP_TABLE_PILL_WIDTH: Record<(typeof TOP_UP_QUICK_AMOUNTS)[number], number> = {
  100: 50,
  200: 100,
  500: 125,
  1000: 180,
  1500: 200,
};

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'ProfileHome'>>();
  const queryClient = useQueryClient();
  const { user, patchUser } = useAuth();
  const { t } = useLocale();
  const colors = useThemeColors();
  /** Табы уже снаружи области экрана — большой padding создавал пустоту над таббаром */
  const styles = useMemo(() => createStyles(colors, 14), [colors]);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpPromo, setTopUpPromo] = useState('');
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [topUpErr, setTopUpErr] = useState<string | null>(null);
  const [topUpReceipt, setTopUpReceipt] = useState<TopUpReceipt | null>(null);
  const [topUpBonusByAmount, setTopUpBonusByAmount] = useState<
    Record<(typeof TOP_UP_QUICK_AMOUNTS)[number], number | null>
  >({} as Record<(typeof TOP_UP_QUICK_AMOUNTS)[number], number | null>);
  const [localPromoBonusRub, setLocalPromoBonusRub] = useState(0);
  const [promoDetailId, setPromoDetailId] = useState<'birthday' | 'maps_review' | null>(null);
  const [diceOpen, setDiceOpen] = useState(false);
  const [diceRollsRefreshSignal, setDiceRollsRefreshSignal] = useState(0);

  const accountLabel = user?.memberAccount ?? '—';

  const refreshLocalPromoBonus = useCallback(() => {
    void loadAppPreferences().then((p) => setLocalPromoBonusRub(p.localPromoBonusRub));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLocalPromoBonus();
      if (user?.memberId) {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.icafeIdForMember(),
          queryFn: () => bookingFlowApi.icafeIdForMember(),
          staleTime: 5 * 60 * 1000,
        });
      }
    }, [refreshLocalPromoBonus, queryClient, user?.memberId]),
  );

  useFocusEffect(
    useCallback(() => {
      if (route.params?.openTopUp) {
        setTopUpOpen(true);
        navigation.setParams({ openTopUp: undefined });
      }
      if (route.params?.openDice) {
        setDiceOpen(true);
        navigation.setParams({ openDice: undefined });
      }
    }, [route.params?.openTopUp, route.params?.openDice, navigation]),
  );

  const onSelectPromo = useCallback((id: PromoId) => {
    if (id === 'dice') {
      setDiceOpen(true);
      return;
    }
    setPromoDetailId(id);
  }, []);

  useEffect(() => {
    if (!topUpOpen || !user?.memberId) {
      setTopUpBonusByAmount({} as Record<(typeof TOP_UP_QUICK_AMOUNTS)[number], number | null>);
      return;
    }
    const promo = topUpPromo.trim() || undefined;
    setTopUpBonusByAmount(
      Object.fromEntries(
        TOP_UP_QUICK_AMOUNTS.map(
          (amount) => [amount, localTopupBonusRub(amount, promo)] as const,
        ),
      ) as Record<(typeof TOP_UP_QUICK_AMOUNTS)[number], number | null>,
    );
  }, [topUpOpen, user?.memberId, topUpPromo]);

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
      const promo = topUpPromo.trim() || undefined;
      const bonus = localTopupBonusRub(amount, promo);
      const nextBalance = (user.balanceRub ?? 0) + amount;
      const nextBonus = (user.bonusBalanceRub ?? 0) + bonus;
      await patchUser({ balanceRub: nextBalance, bonusBalanceRub: nextBonus });
      await grantDiceRollOnTopupIfEligible(amount);
      if (diceOpen) {
        setDiceRollsRefreshSignal((s) => s + 1);
      }
      setTopUpOpen(false);
      setTopUpAmount('');
      setTopUpPromo('');
      setTopUpReceipt({
        amountRub: amount,
        bonusRub: bonus,
        balanceRub: nextBalance,
        bonusBalanceRub: nextBonus,
      });
    } catch (e) {
      setTopUpErr(formatPublicErrorMessage(e, t, 'profile.mockTopupError'));
    } finally {
      setTopUpBusy(false);
    }
  }, [user, topUpAmount, topUpPromo, patchUser, t, diceOpen]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.headerChrome}>
        <TabScreenTopBar
          title={t('tabs.profile')}
          horizontalPadding={0}
          rightAccessory={
            <View style={styles.settingsAccessory}>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                onPress={() => navigation.navigate('Settings')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.settings')}
              >
                <MaterialCommunityIcons name="cog-outline" size={26} color={colors.text} />
              </Pressable>
            </View>
          }
        />
        <ProfilePromoFeed
          paused={promoDetailId != null || diceOpen}
          onSelectPromo={onSelectPromo}
        />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        /** Вложенная горизонтальная лента акций иначе борется с этим скроллом (Android + часть web). */
        nestedScrollEnabled
        scrollEnabled={promoDetailId == null && !diceOpen}
      >
        <View style={styles.scrollTopSpacer} />
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroLine} numberOfLines={1}>
            {t('profile.greetingWithLogin', { login: accountLabel })}
          </Text>
        </View>

        <View style={styles.balanceTopUpCard}>
          <View style={styles.balanceTopUpCardTop}>
            <View style={styles.balanceLabelRow}>
              <MaterialCommunityIcons name="wallet-outline" size={16} color={colors.muted} />
              <Text style={styles.balanceCardLabel}>{t('profile.balance')}</Text>
            </View>
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
            {localPromoBonusRub > 0 ? (
              <Text style={styles.localPromoHint}>
                {t('profile.localPromoBonus', { amount: localPromoBonusRub.toFixed(0) })}
              </Text>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.balanceTopUpStrip,
              pressed && styles.balanceTopUpStripPressed,
            ]}
            onPress={() => setTopUpOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('profile.topUpInApp')}
          >
            <Text style={styles.balanceTopUpStripText}>{t('profile.topUpFused')}</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.qrLoginCard,
            pressed && styles.actionCardPressed,
          ]}
          onPress={() => navigation.navigate('QrLogin')}
          accessibilityRole="button"
          accessibilityLabel={t('profile.qrLoginShortcut')}
        >
          <View style={styles.qrLoginIcon}>
            <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.accentTextOnButton} />
          </View>
          <View style={styles.actionCardText}>
            <Text style={styles.qrLoginTitle} numberOfLines={1}>
              {t('profile.qrLoginShortcut')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accentTextOnButton} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
          ]}
          onPress={() => navigation.navigate('News')}
          accessibilityRole="button"
          accessibilityLabel={t('profile.newsShortcut')}
        >
          <MaterialCommunityIcons
            name="newspaper-variant-outline"
            size={22}
            color={colors.accentBright}
          />
          <View style={styles.actionCardText}>
            <Text style={styles.actionCardTitle} numberOfLines={1}>
              {t('profile.newsShortcut')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
        </Pressable>

        {user?.memberId ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => navigation.navigate('InsightsHub')}
              accessibilityRole="button"
              accessibilityLabel={t('profile.statisticsButton')}
            >
              <MaterialCommunityIcons name="chart-box-outline" size={22} color={colors.accentBright} />
              <View style={styles.actionCardText}>
                <Text style={styles.actionCardTitle} numberOfLines={2}>
                  {t('profile.statisticsButton')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          </>
        ) : null}

      </ScrollView>

      <PromoDetailModal
        visible={promoDetailId != null}
        promoId={promoDetailId}
        onClose={() => setPromoDetailId(null)}
      />
      <DiceMinigameModal
        visible={diceOpen}
        onClose={() => setDiceOpen(false)}
        onLocalBonusChanged={refreshLocalPromoBonus}
        onRequestTopUp={(presetAmountRub) => {
          setTopUpAmount(String(presetAmountRub));
          setTopUpOpen(true);
        }}
        reloadRollsSignal={diceRollsRefreshSignal}
      />

      <DimmedSheetModal
        visible={topUpOpen}
        onRequestClose={closeTopUp}
        contentAlign="stretch"
        contentWrapperStyle={styles.topUpModalHost}
      >
        {(onSheetDrag) => (
          <KeyboardAvoidingView
            style={styles.topUpKeyboardHost}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <DraggableWheelSheet
              open={topUpOpen}
              onRequestClose={closeTopUp}
              onDragOffsetChange={onSheetDrag}
              colors={colors}
              sheetStyle={styles.modalSheet}
              dragExtendBelowGrabberPx={100}
              extendToBottomEdge={false}
            >
            <SafeAreaView style={styles.topUpSheetInner} edges={['bottom']}>
            <View style={styles.modalBar}>
              <Text style={styles.modalTitle}>{t('profile.topUpModalTitle')}</Text>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
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
                  const bonusOk = bonus !== undefined && bonus !== null;
                  const bonusText = (() => {
                    if (bonus === undefined || bonus === null) return t('profile.topUpBonusUnavailable');
                    return bonus.toFixed(0);
                  })();
                  const isLast = idx === TOP_UP_QUICK_AMOUNTS.length - 1;
                  return (
                    <View
                      key={amount}
                      style={[styles.bonusTableRow, isLast && styles.bonusTableRowLast]}
                    >
                      <View style={styles.bonusTableAmountCell}>
                        <View
                          style={[
                            styles.bonusAmountBar,
                            { borderRightColor: colors.success, width: TOP_UP_TABLE_PILL_WIDTH[amount] },
                          ]}
                        >
                          <Text style={[styles.bonusAmountBarText, { color: colors.text }]}>
                            {`${amount}\u00a0₽`}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.bonusTableCell,
                          styles.bonusTableCellRight,
                          { color: bonusOk ? colors.text : colors.muted },
                        ]}
                      >
                        {bonusText}
                      </Text>
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
                      { borderRightColor: colors.accent },
                      pressed && styles.quickAmountChipPressed,
                    ]}
                    onPress={() => setTopUpAmount(String(n))}
                    disabled={topUpBusy}
                  >
                    <Text
                      style={[styles.quickAmountChipText, { color: colors.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      {`${n}\u00a0₽`}
                    </Text>
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
            </DraggableWheelSheet>
          </KeyboardAvoidingView>
        )}
      </DimmedSheetModal>
      <DimmedSheetModal
        visible={topUpReceipt != null}
        onRequestClose={() => setTopUpReceipt(null)}
        contentAlign="stretch"
        contentWrapperStyle={styles.topUpReceiptHost}
      >
        {() => (
          <View style={styles.topUpReceiptCard}>
            <View style={styles.topUpReceiptIcon}>
              <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
            </View>
            <Text style={styles.topUpReceiptTitle}>{t('profile.topUpSuccessTitle')}</Text>
            <Text style={styles.topUpReceiptLead}>
              {t('profile.topUpSuccessAmount', {
                amount: (topUpReceipt?.amountRub ?? 0).toFixed(0),
              })}
            </Text>
            {topUpReceipt && topUpReceipt.bonusRub > 0 ? (
              <Text style={styles.topUpReceiptBonus}>
                {t('profile.topUpSuccessBonus', {
                  bonus: topUpReceipt.bonusRub.toFixed(0),
                })}
              </Text>
            ) : (
              <Text style={styles.topUpReceiptMuted}>{t('profile.topUpSuccessBonusNone')}</Text>
            )}
            <View style={styles.topUpReceiptTotals}>
              <Text style={styles.topUpReceiptTotalsText}>
                {t('profile.topUpSuccessBalance', {
                  balance: (topUpReceipt?.balanceRub ?? 0).toFixed(2),
                })}
              </Text>
              <Text style={styles.topUpReceiptTotalsText}>
                {t('profile.topUpSuccessBonusBalance', {
                  bonusBalance: (topUpReceipt?.bonusBalanceRub ?? 0).toFixed(2),
                })}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.topUpReceiptButton, pressed && styles.topUpReceiptButtonPressed]}
              onPress={() => setTopUpReceipt(null)}
              accessibilityRole="button"
              accessibilityLabel={t('profile.topUpSuccessClose')}
            >
              <Text style={styles.topUpReceiptButtonText}>{t('profile.topUpSuccessClose')}</Text>
            </Pressable>
          </View>
        )}
      </DimmedSheetModal>
      <TodaysBookingBanner style={styles.bookingHeadsUpOverlay} />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette, contentPaddingBottom: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    topUpModalHost: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    topUpKeyboardHost: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-end',
    },
    topUpReceiptHost: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    topUpReceiptCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.cardElevated,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 14,
      alignItems: 'stretch',
      gap: 10,
    },
    topUpReceiptIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.success}22`,
      borderWidth: 1,
      borderColor: `${colors.success}55`,
      alignSelf: 'center',
    },
    topUpReceiptTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '800',
      textAlign: 'center',
    },
    topUpReceiptLead: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },
    topUpReceiptBonus: {
      color: colors.success,
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
    },
    topUpReceiptMuted: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
    },
    topUpReceiptTotals: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    topUpReceiptTotalsText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    topUpReceiptButton: {
      marginTop: 2,
      borderRadius: 12,
      backgroundColor: colors.accent,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topUpReceiptButtonPressed: { opacity: 0.9 },
    topUpReceiptButtonText: {
      color: colors.accentTextOnButton,
      fontSize: 15,
      fontWeight: '800',
    },
    /** Шапка вне скролла — заголовок и настройки всегда сверху */
    headerChrome: { paddingHorizontal: 16, paddingTop: 4 },
    bookingHeadsUpOverlay: {
      position: 'absolute',
      left: 16,
      right: 16,
      top: 8,
      zIndex: 30,
      elevation: 30,
    },
    /** Чтобы `flexGrow` у контента работал — скролл занимает всю высоту экрана */
    scrollView: { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: contentPaddingBottom,
    },
    /** Растягивает скролл по высоте экрана — контент оказывается у табов */
    scrollTopSpacer: { flexGrow: 1, minHeight: 1 },
    heroTextBlock: { marginBottom: 14 },
    heroLine: { fontSize: 22, fontWeight: '800', color: colors.text },
    heroHint: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
    qrLoginCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      backgroundColor: colors.accent,
      borderRadius: 15,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 12,
      minHeight: 64,
      borderWidth: 1,
      borderColor: colors.accentBright,
    },
    qrLoginIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    qrLoginTitle: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
      color: colors.accentTextOnButton,
    },
    iconBtn: {
      minWidth: 46,
      minHeight: 46,
      padding: 9,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsAccessory: { marginTop: 10 },
    iconBtnPressed: { opacity: 0.85 },
    balanceTopUpCard: {
      borderRadius: 18,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    balanceTopUpCardTop: {
      backgroundColor: colors.cardElevated,
      padding: 16,
    },
    balanceLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    balanceTopUpStrip: {
      backgroundColor: colors.accent,
      paddingVertical: 15,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    balanceTopUpStripPressed: { opacity: 0.92 },
    balanceTopUpStripText: {
      color: colors.accentTextOnButton,
      fontWeight: '800',
      fontSize: 16,
    },
    balanceCardLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
    balanceCardValue: { fontSize: 30, fontWeight: '800', color: colors.text },
    bonusHint: { marginTop: 8, fontSize: 14, color: colors.accentBright, fontWeight: '600' },
    localPromoHint: { marginTop: 6, fontSize: 13, color: colors.success, fontWeight: '600' },
    quickAmountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    quickAmountChip: {
      minWidth: 56,
      minHeight: 30,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderRightWidth: 3,
      backgroundColor: colors.chipOn,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    quickAmountChipPressed: { opacity: 0.88 },
    quickAmountChipText: {
      fontWeight: '700',
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      backgroundColor: colors.card,
      borderRadius: 15,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 12,
      minHeight: 64,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionCardPressed: { opacity: 0.92 },
    actionCardText: { flex: 1, minWidth: 0, justifyContent: 'center' },
    actionCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    modalSheet: {
      width: '100%',
      alignSelf: 'stretch',
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 0,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '82%',
    },
    topUpSheetInner: {
      minHeight: 0,
      width: '100%',
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 6,
    },
    modalScrollContent: {
      paddingBottom: 18,
      paddingTop: 0,
    },
    bonusTable: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 18,
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
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    bonusTableRowLast: { borderBottomWidth: 0 },
    bonusTableAmountCell: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingVertical: 4,
      paddingLeft: 8,
      paddingRight: 4,
    },
    bonusAmountBar: {
      minWidth: 48,
      borderRadius: 8,
      height: 30,
      justifyContent: 'center',
      borderWidth: 1,
      borderRightWidth: 3,
      backgroundColor: `${colors.success}22`,
      borderColor: `${colors.success}44`,
      overflow: 'visible',
      position: 'relative',
    },
    bonusAmountBarText: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '700',
      position: 'absolute',
      left: 6,
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    },
    bonusTableCell: {
      flex: 1,
      paddingVertical: 8,
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
      marginBottom: 8,
    },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 },
    inputLabel: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 9,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.card,
      marginBottom: 10,
    },
    topUpErr: { color: colors.danger, fontSize: 13, marginBottom: 8 },
    modalSubmit: {
      backgroundColor: colors.accent,
      paddingVertical: 13,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    modalSubmitPressed: { opacity: 0.9 },
    modalSubmitText: { color: colors.accentTextOnButton, fontWeight: '800', fontSize: 16 },
    processingHint: { textAlign: 'center', color: colors.muted, marginTop: 10, fontSize: 13 },
  });
}
