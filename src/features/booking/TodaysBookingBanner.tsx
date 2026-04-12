import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';
import { cafesApi } from '../../api/endpoints';
import { useLocale } from '../../i18n/LocaleContext';
import type { ColorPalette } from '../../theme/palettes';
import { useThemeColors } from '../../theme';
import { queryKeys } from '../../query/queryKeys';
import {
  formatIntervalClock,
  getBannerBookingSections,
  type TodayBookingLine,
} from './memberBookingsUtils';
import { useMemberBooksQuery } from './useMemberBooksQuery';
import { useCancelBookingMutation } from './useCancelBookingMutation';
import { useBookingNowMs } from './useBookingNowMs';
import { acknowledgeTodaysBookingNotification } from '../../notifications/todaysBookingHeadsUp';

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
  const { todayLines, upcomingLines } = useMemo(() => {
    const { today, otherUpcoming } = getBannerBookingSections(booksQ.data, addressById, nowMs);
    return {
      todayLines: today,
      upcomingLines: otherUpcoming.slice(0, 5),
    };
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
                onError: (err) => {
                  const msg = err instanceof ApiError ? err.message : t('booking.errorGeneric');
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

  if (!user?.memberAccount?.trim()) return null;
  if (!todayLines.length && !upcomingLines.length) return null;

  const renderLine = (line: (typeof todayLines)[0], withDate: boolean) => {
    const { from, to } = formatIntervalClock(locale, line.iv);
    const canCancel =
      line.iv.end.getTime() > nowMs &&
      line.memberOfferId > 0 &&
      !!user?.memberId?.trim();

    if (withDate) {
      const dateStr = line.iv.start.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Europe/Moscow',
      });
      return (
        <View key={line.key} style={styles.lineRow}>
          <Text style={styles.line}>
            {t('booking.bannerUpcomingLine', {
              date: dateStr,
              address: line.clubLabel,
              pc: line.pcName,
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
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={styles.cancelBtnText}>{t('booking.cancelBooking')}</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      );
    }
    return (
      <View key={line.key} style={styles.lineRow}>
        <Text style={styles.line}>
          {t('booking.bannerTodayLine', {
            address: line.clubLabel,
            pc: line.pcName,
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
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.cancelBtnText}>{t('booking.cancelBooking')}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.wrap, style]}>
      <MaterialCommunityIcons name="calendar-check" size={22} color={colors.accent} />
      <View style={styles.textCol}>
        {todayLines.length ? (
          <>
            <Text style={styles.title}>{t('booking.bannerTodayTitle')}</Text>
            {todayLines.map((line) => renderLine(line, false))}
          </>
        ) : null}
        {upcomingLines.length ? (
          <>
            <Text style={[styles.title, todayLines.length ? styles.titleSecond : null]}>
              {t('booking.bannerUpcomingTitle')}
            </Text>
            {upcomingLines.map((line) => renderLine(line, true))}
          </>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.ackBtn, pressed && styles.ackBtnPressed]}
          onPress={() => void acknowledgeTodaysBookingNotification()}
          accessibilityRole="button"
        >
          <Text style={styles.ackBtnText}>{t('notif.todaysBookingAck')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentDim,
    },
    textCol: { flex: 1, minWidth: 0 },
    title: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    titleSecond: { marginTop: 10 },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 4,
    },
    line: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20, fontWeight: '600' },
    cancelBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    cancelBtnPressed: { opacity: 0.85 },
    cancelBtnText: { fontSize: 12, fontWeight: '700', color: colors.accent },
    ackBtn: {
      alignSelf: 'flex-start',
      marginTop: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.accent,
    },
    ackBtnPressed: { opacity: 0.88 },
    ackBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  });
}
