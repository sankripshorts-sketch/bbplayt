import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../components/DinText';
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cancellingKey, setCancellingKey] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const swipeX = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const isFocused = useIsFocused();

  const booksQ = useMemberBooksQuery(user?.memberAccount);
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

  const nearestLine = useMemo(() => {
    const { today, otherUpcoming } = getBannerBookingSections(booksQ.data, addressById, nowMs);
    return [...today, ...otherUpcoming][0] ?? null;
  }, [booksQ.data, addressById, nowMs]);

  const cancelMutation = useCancelBookingMutation();

  const confirmCancel = useCallback(
    (line: TodayBookingLine) => {
      Alert.alert(t('booking.cancelBookingTitle'), t('booking.cancelBookingBody'), [
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
                  Alert.alert(t('booking.errorGeneric'), msg);
                },
              },
            );
          },
        },
      ]);
    },
    [cancelMutation, t],
  );

  useEffect(() => {
    if (!isFocused || !nearestLine || !ackLoaded || hideAfterAck || dismissed) return;
    setDismissed(false);
    swipeX.setValue(0);
    progress.setValue(1);
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: AUTO_HIDE_MS,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) setDismissed(true);
    });
    return () => {
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

  const renderLine = (line: TodayBookingLine) => {
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
    return (
      <View key={line.key} style={styles.lineRow}>
        <Text style={styles.line}>
          {t('booking.bannerUpcomingLine', {
            date: dateStr,
            address: club,
            pc,
            from,
            to,
          })}
        </Text>
        {canCancel ? (
          <Pressable
            onPress={() => confirmCancel(line)}
            disabled={cancellingKey === line.key}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('booking.cancelBooking')}
          >
            {cancellingKey === line.key ? (
              <ActivityIndicator size="small" color={colors.accentBright} />
            ) : (
              <Text style={styles.cancelBtnText}>{t('booking.cancelBooking')}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.wrap,
        style,
        {
          transform: [{ translateX: swipeX }],
          opacity: swipeX.interpolate({
            inputRange: [-220, 0, 220],
            outputRange: [0.3, 1, 0.3],
          }),
        },
      ]}
    >
      <View style={styles.iconBadge}>
        <MaterialCommunityIcons name="calendar-check" size={16} color={colors.accentBright} />
      </View>
      <View style={styles.textCol}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('booking.bannerUpcomingTitle')}</Text>
        </View>
        {renderLine(nearestLine)}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.ackBtn, pressed && styles.ackBtnPressed]}
            onPress={() => {
              void (async () => {
                await acknowledgeTodaysBookingNotification();
                setHideAfterAck(true);
              })();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.ackBtnText}>{t('notif.todaysBookingAck')}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingTop: 10,
      paddingBottom: 12,
      paddingHorizontal: 12,
      marginBottom: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentDim,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    iconBadge: {
      width: 24,
      height: 24,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: 'rgba(255,255,255,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    textCol: { flex: 1, minWidth: 0 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    title: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.2,
    },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 8,
    },
    line: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      fontWeight: '700',
      backgroundColor: 'rgba(0,0,0,0.12)',
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    cancelBtn: {
      minHeight: 38,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: 'rgba(0,0,0,0.14)',
      justifyContent: 'center',
    },
    cancelBtnPressed: { opacity: 0.85 },
    cancelBtnText: { fontSize: 12, fontWeight: '700', color: colors.accentBright },
    actionsRow: {
      marginTop: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ackBtn: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 11,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.accentBright,
    },
    ackBtnPressed: { opacity: 0.88 },
    ackBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    progressTrack: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 4,
      borderBottomLeftRadius: 13,
      borderBottomRightRadius: 13,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    progressFill: {
      position: 'absolute',
      right: 0,
      top: 0,
      height: '100%',
      borderTopLeftRadius: 2,
      borderBottomLeftRadius: 2,
      backgroundColor: colors.accentBright,
    },
  });
}
