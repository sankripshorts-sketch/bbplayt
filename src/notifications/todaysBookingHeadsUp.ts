import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatISODateMoscow } from '../datetime/mskTime';
import { nowForBookingCompareMs } from '../datetime/serverBookingClock';
import type { AppPreferences } from '../preferences/appPreferences';

const ACK_STORAGE = 'bbplay.todaysBooking.ackDayISO';
const ONCE_SHOWN_STORAGE = 'bbplay.todaysBooking.onceShownDayISO';

export const TODAYS_BOOKING_NOTIF_ID = 'bbplay-todays-booking';
export const TODAYS_BOOKING_DATA_KIND = 'todaysBooking';
const CATEGORY_ID = 'TODAYS_BOOKING';
const ACTION_ACK = 'ACK';

const ANDROID_CHANNEL_TODAY = 'booking-today';

let categoryRegistered = false;

export async function ensureTodaysBookingCategory(ackLabel: string): Promise<void> {
  if (categoryRegistered) return;
  if (Platform.OS === 'ios') {
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      {
        identifier: ACTION_ACK,
        buttonTitle: ackLabel,
        options: { opensAppToForeground: true },
      },
    ]);
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_TODAY, {
      name: 'Booking today',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      sound: 'default',
    });
  }
  categoryRegistered = true;
}

async function readDayKey(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function writeDayKey(key: string, day: string): Promise<void> {
  await AsyncStorage.setItem(key, day);
}

function todayISO(): string {
  return formatISODateMoscow(new Date(nowForBookingCompareMs()));
}

/**
 * Локальное уведомление «сегодня есть бронь»: для `until_ack` на Android — ongoing (sticky),
 * снимается по кнопке «Я помню» или из слушателя ответа.
 */
export async function syncTodaysBookingHeadsUpNotification(input: {
  hasUpcomingToday: boolean;
  bodyLines: string[];
  prefs: AppPreferences;
  title: string;
  ackLabel: string;
}): Promise<void> {
  const { hasUpcomingToday, bodyLines, prefs, title, ackLabel } = input;
  const day = todayISO();

  await ensureTodaysBookingCategory(ackLabel);

  const granted = (await Notifications.getPermissionsAsync()).status === 'granted';
  if (!granted) return;

  if (!hasUpcomingToday || bodyLines.length === 0) {
    await Notifications.cancelScheduledNotificationAsync(TODAYS_BOOKING_NOTIF_ID).catch(() => {});
    return;
  }

  const body = bodyLines.join('\n').slice(0, 800);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prev = scheduled.find((x) => x.identifier === TODAYS_BOOKING_NOTIF_ID);
  if (prev?.content.title === title && prev.content.body === body) {
    return;
  }

  const acked = await readDayKey(ACK_STORAGE);
  if (acked === day) {
    return;
  }

  if (prefs.todaysBookingNotifMode === 'once') {
    const shown = await readDayKey(ONCE_SHOWN_STORAGE);
    if (shown === day) {
      return;
    }
  }

  const sticky = prefs.todaysBookingNotifMode === 'until_ack' && Platform.OS === 'android';

  await Notifications.cancelScheduledNotificationAsync(TODAYS_BOOKING_NOTIF_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: TODAYS_BOOKING_NOTIF_ID,
    content: {
      title,
      body,
      data: {
        kind: TODAYS_BOOKING_DATA_KIND,
      },
      sound: true,
      ...(Platform.OS === 'android'
        ? {
            channelId: ANDROID_CHANNEL_TODAY,
            priority: Notifications.AndroidNotificationPriority.MAX,
            sticky,
            autoDismiss: !sticky,
          }
        : {
            categoryIdentifier: CATEGORY_ID,
          }),
    },
    trigger: null,
  });

  if (prefs.todaysBookingNotifMode === 'once') {
    await writeDayKey(ONCE_SHOWN_STORAGE, day);
  }
}

/**
 * Снять напоминание «бронь на сегодня»: отметить день, отменить scheduled и убрать из шторки.
 * @param presentedNotificationId — `notification.request.identifier` из ответа Expo (тап по пушу); иначе снимаем по нашему id.
 */
export async function acknowledgeTodaysBookingNotification(
  presentedNotificationId?: string | null,
): Promise<void> {
  const day = todayISO();
  await writeDayKey(ACK_STORAGE, day);
  await Notifications.cancelScheduledNotificationAsync(TODAYS_BOOKING_NOTIF_ID).catch(() => {});
  const id = presentedNotificationId?.trim() || TODAYS_BOOKING_NOTIF_ID;
  await Notifications.dismissNotificationAsync(id).catch(() => {});
  if (id !== TODAYS_BOOKING_NOTIF_ID) {
    await Notifications.dismissNotificationAsync(TODAYS_BOOKING_NOTIF_ID).catch(() => {});
  }
}

export function isTodaysBookingNotificationResponse(
  data: Record<string, unknown> | undefined,
): boolean {
  return data?.kind === TODAYS_BOOKING_DATA_KIND;
}

export { ACTION_ACK as TODAYS_BOOKING_ACTION_ACK };
