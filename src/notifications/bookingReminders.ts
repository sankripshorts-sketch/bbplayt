import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { parseServerDateTimeString } from '../datetime/mskTime';
import { nowForBookingCompareMs } from '../datetime/serverBookingClock';
import type { AppPreferences } from '../preferences/appPreferences';

const ANDROID_CHANNEL_ID = 'booking-reminders';
export const BOOKING_NOTIFICATION_DATA_KIND = 'booking';
const BOOKING_DEEP_LINK = 'bbplay://booking';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Booking reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22e07a',
    });
  }
}

export async function requestReminderPermissions(): Promise<boolean> {
  await ensureNotificationChannel();
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/** Начало брони в московских дате/времени из UI (как в API). */
function bookingStartInstant(dateISO: string, timeHHmm: string): Date | null {
  const raw = `${dateISO.trim()} ${timeHHmm.trim()}`;
  return parseServerDateTimeString(raw);
}

export async function cancelBookingScheduledReminders(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const r of all) {
    const data = r.content.data as { kind?: string } | undefined;
    if (data?.kind === BOOKING_NOTIFICATION_DATA_KIND) {
      await Notifications.cancelScheduledNotificationAsync(r.identifier);
    }
  }
}

export type BookingReminderKind =
  | 't60'
  | 't30'
  | 't15'
  | 'single'
  | 'start'
  | 'visitFeedback'
  | 'prepDepart';

async function scheduleAt(
  date: Date,
  title: string,
  body: string,
  reminderKind: BookingReminderKind,
): Promise<void> {
  if (date.getTime() <= nowForBookingCompareMs() + 5000) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: {
        kind: BOOKING_NOTIFICATION_DATA_KIND,
        url: BOOKING_DEEP_LINK,
        reminderKind,
      },
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: date,
  });
}

export type BookingReminderMessages = {
  reminderTitle: string;
  /** Для одиночного напоминания (не offset) */
  reminderBody: string;
  startTitle: string;
  startBody: string;
  offsetBody: (minutesBefore: number) => string;
  prepTitle: string;
  prepBody: string;
};

export type BookingFollowUpMessages = {
  visitTitle: string;
  visitBody: string;
};

export async function scheduleBookingRemindersFromPrefs(
  prefs: AppPreferences,
  startDate: string,
  startTime: string,
  messages: BookingReminderMessages,
  followUp?: {
    durationMins: number;
    followUpMessages: BookingFollowUpMessages;
  },
): Promise<void> {
  await cancelBookingScheduledReminders();
  const granted = await requestReminderPermissions();
  if (!granted) return;

  const start = bookingStartInstant(startDate, startTime);
  if (!start) return;

  if (prefs.reminderMode === 'triple') {
    const map: { m: number; k: 't60' | 't30' | 't15' }[] = [
      { m: 60, k: 't60' },
      { m: 30, k: 't30' },
      { m: 15, k: 't15' },
    ];
    for (const { m, k } of map) {
      const when = new Date(start.getTime() - m * 60 * 1000);
      await scheduleAt(when, messages.reminderTitle, messages.offsetBody(m), k);
    }
  } else {
    const minutesBefore = prefs.reminderMinutesBefore;
    const when = new Date(start.getTime() - minutesBefore * 60 * 1000);
    await scheduleAt(when, messages.reminderTitle, messages.reminderBody, 'single');
  }

  const prepH = prefs.prepDepartHoursBefore;
  if (prepH > 0) {
    const prepWhen = new Date(start.getTime() - prepH * 60 * 60 * 1000);
    await scheduleAt(prepWhen, messages.prepTitle, messages.prepBody, 'prepDepart');
  }

  await scheduleAt(start, messages.startTitle, messages.startBody, 'start');

  if (followUp && followUp.durationMins > 0) {
    const end = new Date(start.getTime() + followUp.durationMins * 60 * 1000);
    const fu = followUp.followUpMessages;
    await scheduleAt(end, fu.visitTitle, fu.visitBody, 'visitFeedback');
  }
}
