import type { NavigatorScreenParams } from '@react-navigation/native';

export type BookingPrefillParams = {
  icafeId: number;
  /** Подставить место при совпадении имени и доступности (из «Мои брони»). */
  pcName?: string;
  /** Длительность в минутах; по умолчанию 60. */
  mins?: number;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  SettingsAppearance: undefined;
  SettingsBookingReminders: undefined;
  EditProfile: undefined;
  BalanceHistory: undefined;
  GameSessions: undefined;
  CustomerAnalysis: undefined;
  Ranking: undefined;
};

export type MainTabParamList = {
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  Cafes: undefined;
  News: undefined;
  Booking: { prefill?: BookingPrefillParams } | undefined;
  Chat: undefined;
};
