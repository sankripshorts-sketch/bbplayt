import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../../components/DinText';
import { useAppAlert } from '../../components/AppAlertContext';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { cafesApi } from '../../api/endpoints';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { queryKeys } from '../../query/queryKeys';
import {
  isMemberBookingCancelDisabledByCutoff,
  formatIntervalClock,
  getBannerBookingSections,
  type TodayBookingLine,
} from './memberBookingsUtils';
import { useMemberBooksQuery } from './useMemberBooksQuery';
import { useCancelBookingMutation } from './useCancelBookingMutation';
import { useBookingNowMs } from './useBookingNowMs';
import { cancelScheduledRemindersForCancelledBooking } from '../../notifications/bookingReminders';
import {
  acknowledgeTodaysBookingNotification,
  isTodaysBookingAcknowledgedForToday,
} from '../../notifications/todaysBookingHeadsUp';
import { formatPublicClubLabel, formatPublicErrorMessage, formatPublicPcLabel } from '../../utils/publicText';
import { useIsFocused } from '@react-navigation/native';

const AUTO_HIDE_SECONDS = 10;
const AUTO_HIDE_MS = AUTO_HIDE_SECONDS * 1000;

type Props = {
  /** Отступ снизу перед контентом */
  style?: object;
};

export function TodaysBookingBanner({ style }: Props) {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const { showAlert } = useAppAlert();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cancellingKey, setCancellingKey] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_HIDE_SECONDS);
  const swipeX = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const isFocused = useIsFocused();

  const booksQ = useMemberBooksQuery(user?.memberAccount, user?.memberId);
  const cafesQ = useQuery({
    queryKey: queryKeys.cafes(),
    queryFn: () => cafesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const addressById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cafesQ.data ?? []) {
      m.set(c.icafe_id, c.address);
    }
    return m;
  }, [cafesQ.data]);

  const nowMs = useBookingNowMs();
  const [ackLoaded, setAckLoaded] = useState(false);
  const [hideAfterAck, setHideAfterAck] = useState(false);

  useEffect(() => {
    if (!user?.memberAccount?.trim()) return;
    let cancelled = false;
    setAckLoaded(false);
    void isTodaysBookingAcknowledgedForToday().then((acked) => {
      if (!cancelled) {
        setHideAfterAck(acked);
        setAckLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.memberAccount]);

  const { today, otherUpcoming, nearestLine, isTodaySlot } = useMemo(() => {
    const sec = getBannerBookingSections(booksQ.data, addressById, nowMs);
    const line = [...sec.today, ...sec.otherUpcoming][0] ?? null;
    const isToday = line ? sec.today.some((l) => l.key === line.key) : false;
    return { ...sec, nearestLine: line, isTodaySlot: isToday };
  }, [booksQ.data, addressById, nowMs]);

  const cancelMutation = useCancelBookingMutation();

  const confirmCancel = useCallback(
    (line: TodayBookingLine) => {
      showAlert(t('booking.cancelBookingTitle'), t('booking.cancelBookingBody'), [
        { text: t('booking.cancelBookingDismiss'), style: 'cancel' },
        {
          text: t('booking.cancelBookingConfirm'),
          style: 'destructive',
          onPress: () => {
            setCancellingKey(line.key);
            const icafeId = Number(line.icafeId);
            cancelMutation.mutate(
              {
                icafeId,
                pcName: line.pcName,
                memberOfferId: line.memberOfferId,
              },
              {
                onSettled: () => setCancellingKey(null),
                onSuccess: () => {
                  void cancelScheduledRemindersForCancelledBooking({
                    icafeId,
                    visitStartMs: line.iv.start.getTime(),
                  });
                },
                onError: (err) => {
                  const msg = formatPublicErrorMessage(err, t, 'booking.errorGeneric');
                  showAlert(t('booking.errorGeneric'), msg);
                },
              },
            );
          },
        },
      ]);
    },
    [cancelMutation, showAlert, t],
  );

  useEffect(() => {
    if (!isFocused || !nearestLine || !ackLoaded || hideAfterAck || dismissed) return;
    setDismissed(false);
    setSecondsLeft(AUTO_HIDE_SECONDS);
    swipeX.setValue(0);
    progress.setValue(1);
    const tick = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: AUTO_HIDE_MS,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) setDismissed(true);
    });
    return () => {
      clearInterval(tick);
      anim.stop();
    };
  }, [isFocused, nearestLine, ackLoaded, hideAfterAck, dismissed, swipeX, progress]);

  const dismissBySwipe = useCallback(() => {
    setDismissed(true);
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          swipeX.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 90) {
            const dir = g.dx >= 0 ? 1 : -1;
            Animated.timing(swipeX, {
              toValue: dir * 420,
              duration: 160,
              useNativeDriver: true,
            }).start(dismissBySwipe);
            return;
          }
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 10,
          }).start();
        },
      }),
    [dismissBySwipe, swipeX],
  );

  if (!user?.memberAccount?.trim()) return null;
  if (!ackLoaded) return null;
  if (hideAfterAck) return null;
  if (!nearestLine) return null;
  if (!isFocused) return null;
  if (dismissed) return null;

  const line = nearestLine;
  const { from, to } = formatIntervalClock(locale, line.iv);
  const canCancel =
    line.iv.end.getTime() > nowMs &&
    line.memberOfferId > 0 &&
    !!user?.memberId?.trim() &&
    !isMemberBookingCancelDisabledByCutoff(line.iv, nowMs);
  const dateStr = line.iv.start.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Moscow',
  });
  const club = formatPublicClubLabel({ address: line.clubLabel, t });
  const pc = formatPublicPcLabel(line.pcName, t);
  const headline = isTodaySlot ? t('booking.bannerTodayTitle') : t('booking.bannerUpcomingTitle');
  const chipLabel = isTodaySlot ? t('booking.bannerChipToday') : t('booking.bannerChipUpcoming');
  const gradientTop = colors.cardElevated;
  const gradientBottom = isTodaySlot ? `${colors.accentDim}ee` : `${colors.zoneBg}ff`;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.outer,
        style,
        {
          transform: [{ translateX: swipeX }],
          opacity: swipeX.interpolate({
            inputRange: [-220, 0, 220],
            outputRange: [0.35, 1, 0.35],
          }),
        },
      ]}
    >
      <View style={styles.cardShell}>
        <LinearGradient
          colors={[gradientTop, gradientBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.15, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                opacity: progress.interpolate({
                  inputRange: [0, 0.06, 1],
                  outputRange: [0, 0.55, 1],
                }),
              },
            ]}
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.topRow}>
            <View style={[styles.chip, isTodaySlot ? styles.chipToday : styles.chipSoon]}>
              <MaterialCommunityIcons
                name={isTodaySlot ? 'white-balance-sunny' : 'calendar-clock'}
                size={14}
                color={isTodaySlot ? colors.accentBright : colors.muted}
              />
              <Text style={[styles.chipText, isTodaySlot ? styles.chipTextToday : styles.chipTextSoon]}>
                {chipLabel}
              </Text>
            </View>
            <Text style={styles.countdown} numberOfLines={1}>
              {secondsLeft > 0 ? t('notif.todaysBookingAutoHideIn', { sec: secondsLeft }) : ''}
            </Text>
          </View>

          <Text style={styles.headline} numberOfLines={2}>
            {headline}
          </Text>

          <View style={styles.timeBlock}>
            <Text style={styles.timeHero}>
              {from}
              <Text style={styles.timeDash}> — </Text>
              {to}
            </Text>
            {!isTodaySlot ? (
              <Text style={styles.dateCaption} numberOfLines={1}>
                {dateStr}
              </Text>
            ) : null}
          </View>

          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <View style={styles.metaIconWrap}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.accentBright} />
              </View>
              <Text style={styles.metaText} numberOfLines={2}>
                {club}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaIconWrap}>
                <MaterialCommunityIcons name="monitor" size={18} color={colors.accentBright} />
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                {pc}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            {canCancel ? (
              <Pressable
                onPress={() => confirmCancel(line)}
                disabled={cancellingKey === line.key}
                style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('booking.cancelBooking')}
              >
                {cancellingKey === line.key ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Text style={styles.btnGhostText}>{t('booking.cancelBooking')}</Text>
                )}
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                !canCancel && styles.btnPrimaryFull,
                pressed && styles.btnPressed,
              ]}
              onPress={() => {
                void (async () => {
                  await acknowledgeTodaysBookingNotification();
                  setHideAfterAck(true);
                })();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.btnPrimaryText}>{t('notif.todaysBookingAck')}</Text>
              <MaterialCommunityIcons name="check" size={18} color={colors.accentTextOnButton} />
            </Pressable>
          </View>

          <Text style={styles.swipeHint} numberOfLines={1}>
            {t('booking.bannerSwipeHint')}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    outer: {
      position: 'absolute',
      top: 8,
      left: 14,
      right: 14,
      zIndex: 1200,
    },
    cardShell: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderLight,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    progressTrack: {
      height: 3,
      backgroundColor: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
    },
    progressFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      height: '100%',
      borderRadius: 2,
      backgroundColor: colors.accentBright,
    },
    cardBody: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 5,
      paddingHorizontal: 11,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipToday: {
      backgroundColor: `${colors.accent}24`,
      borderColor: `${colors.accentBright}55`,
    },
    chipSoon: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderColor: colors.border,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    chipTextToday: { color: colors.accentBright },
    chipTextSoon: { color: colors.muted },
    countdown: {
      flex: 1,
      textAlign: 'right',
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedDark,
    },
    headline: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
      lineHeight: 22,
      marginBottom: 12,
    },
    timeBlock: {
      marginBottom: 14,
    },
    timeHero: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.8,
    },
    timeDash: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.muted,
    },
    dateCaption: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
    },
    metaBlock: {
      gap: 10,
      marginBottom: 16,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    metaIconWrap: {
      width: 28,
      alignItems: 'center',
      paddingTop: 1,
    },
    metaText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 20,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    btnPrimaryFull: {
      flex: 1,
    },
    btnGhost: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.zoneBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnGhostText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.danger,
    },
    btnPrimary: {
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.accentBright,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    btnPrimaryText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.accentTextOnButton,
    },
    btnPressed: { opacity: 0.88 },
    swipeHint: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedDark,
      textAlign: 'center',
    },
  });
}
