import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  BOOKING_NOTIFICATION_DATA_KIND,
  type BookingReminderKind,
} from '../notifications/bookingReminders';
import {
  acknowledgeTodaysBookingNotification,
  isTodaysBookingNotificationResponse,
} from '../notifications/todaysBookingHeadsUp';
import { useVisitFeedback, type VisitFeedbackNotificationHint } from '../notifications/VisitFeedbackContext';
import type { MainTabParamList } from './types';

/**
 * Обрабатывает тап по локальному пушу о брони только когда доступны табы (пользователь в сессии).
 */
function parseNumber(data: unknown): number | null {
  if (typeof data === 'number' && Number.isFinite(data)) return data;
  if (typeof data === 'string' && data.trim() !== '') {
    const n = Number(data);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function BookingNotificationListener() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { openVisitFeedbackPrompt } = useVisitFeedback();
  const processedResponseIdRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const go = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const reqId = response.notification.request.identifier;
      if (reqId && processedResponseIdRef.current.has(reqId)) return;

      const raw = response.notification.request.content.data;
      const data =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : undefined;

      if (isTodaysBookingNotificationResponse(data)) {
        if (reqId) processedResponseIdRef.current.add(reqId);
        const nid = response.notification.request.identifier;
        void acknowledgeTodaysBookingNotification(nid);
        navigation.navigate('Booking');
        return;
      }

      const booking = data as {
        kind?: string;
        reminderKind?: BookingReminderKind;
        icafeId?: unknown;
        visitStartMs?: unknown;
      } | undefined;
      if (booking?.kind !== BOOKING_NOTIFICATION_DATA_KIND) return;
      if (booking.reminderKind === 'visitFeedback') {
        if (reqId) processedResponseIdRef.current.add(reqId);
        const icafeId = parseNumber(booking.icafeId);
        const visitStartMs = parseNumber(booking.visitStartMs);
        const hint: VisitFeedbackNotificationHint | undefined =
          icafeId != null && visitStartMs != null ? { icafeId, visitStartMs } : undefined;
        openVisitFeedbackPrompt(hint);
        return;
      }
      if (reqId) processedResponseIdRef.current.add(reqId);
      navigation.navigate('Booking');
    };

    if (Platform.OS !== 'web') {
      void Notifications.getLastNotificationResponseAsync().then(go);
    }
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
  }, [navigation, openVisitFeedbackPrompt]);

  return null;
}
