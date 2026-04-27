import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import {
  BOOKING_NOTIFICATION_DATA_KIND,
  type BookingReminderKind,
} from '../notifications/bookingReminders';
import {
  acknowledgeTodaysBookingNotification,
  isTodaysBookingNotificationResponse,
} from '../notifications/todaysBookingHeadsUp';
import { useVisitFeedback } from '../notifications/VisitFeedbackContext';
import type { MainTabParamList } from './types';

/**
 * Обрабатывает тап по локальному пушу о брони только когда доступны табы (пользователь в сессии).
 */
export function BookingNotificationListener() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { openVisitFeedbackPrompt } = useVisitFeedback();

  useEffect(() => {
    const go = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const raw = response.notification.request.content.data;
      const data =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : undefined;

      if (isTodaysBookingNotificationResponse(data)) {
        const nid = response.notification.request.identifier;
        void acknowledgeTodaysBookingNotification(nid);
        navigation.navigate('Booking');
        return;
      }

      const booking = data as { kind?: string; reminderKind?: BookingReminderKind } | undefined;
      if (booking?.kind !== BOOKING_NOTIFICATION_DATA_KIND) return;
      if (booking.reminderKind === 'visitFeedback') {
        openVisitFeedbackPrompt();
        return;
      }
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
