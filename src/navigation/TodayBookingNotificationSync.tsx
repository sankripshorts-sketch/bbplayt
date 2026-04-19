import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { cafesApi } from '../api/endpoints';
import { useLocale } from '../i18n/LocaleContext';
import { loadAppPreferences } from '../preferences/appPreferences';
import { queryKeys } from '../query/queryKeys';
import { useMemberBooksQuery } from '../features/booking/useMemberBooksQuery';
import { useBookingNowMs } from '../features/booking/useBookingNowMs';
import { formatIntervalClock, getBannerBookingSections } from '../features/booking/memberBookingsUtils';
import { requestReminderPermissions } from '../notifications/bookingReminders';
import { syncTodaysBookingHeadsUpNotification } from '../notifications/todaysBookingHeadsUp';
import { formatPublicClubLabel, formatPublicPcLabel } from '../utils/publicText';

/**
 * Синхронизирует локальный пуш «сегодня есть бронь» с расписанием и настройками.
 */
export function TodayBookingNotificationSync() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const booksQ = useMemberBooksQuery(user?.memberAccount);
  const nowMs = useBookingNowMs(60_000);
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

  /** Только незавершённые брони (конец слота по `nowMs` > сейчас); прошедшие не попадают в пуш. */
  const snapshot = useMemo(() => {
    const { today, otherUpcoming } = getBannerBookingSections(booksQ.data, addressById, nowMs);
    const useToday = today.length > 0;
    const lines = useToday ? today : otherUpcoming.slice(0, 4);
    const bodyLines = lines.map((line) => {
      const { from, to } = formatIntervalClock(locale, line.iv);
      const club = formatPublicClubLabel({ address: line.clubLabel, t });
      const pc = formatPublicPcLabel(line.pcName, t);
      if (useToday) {
        return t('booking.bannerTodayLine', {
          address: club,
          pc,
          from,
          to,
        });
      }
      const dateStr = line.iv.start.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Europe/Moscow',
      });
      return t('booking.bannerUpcomingLine', {
        date: dateStr,
        address: club,
        pc,
        from,
        to,
      });
    });
    const title = useToday ? t('notif.todaysBookingTitle') : t('notif.upcomingBookingTitle');
    return { has: lines.length > 0, bodyLines, title };
  }, [booksQ.data, addressById, locale, t, nowMs]);

  useEffect(() => {
    if (!user?.memberAccount?.trim()) return;

    let cancelled = false;
    const run = async () => {
      await requestReminderPermissions(t('notif.androidChannelReminders'));
      const prefs = await loadAppPreferences();
      if (cancelled) return;
      await syncTodaysBookingHeadsUpNotification({
        hasUpcomingToday: snapshot.has,
        bodyLines: snapshot.bodyLines,
        prefs,
        title: snapshot.title,
        ackLabel: t('notif.todaysBookingAck'),
        androidChannelName: t('notif.androidChannelToday'),
      });
    };

    void run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void run();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [user?.memberAccount, snapshot.has, snapshot.bodyLines, snapshot.title, t]);

  return null;
}
