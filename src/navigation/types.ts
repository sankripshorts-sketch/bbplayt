import type { NavigatorScreenParams } from '@react-navigation/native';

export type BookingPrefillParams = {
  icafeId: number;
  /** Подставить место при совпадении имени и доступности (из «Мои брони»). */
  pcName?: string;
  /** Длительность в минутах; по умолчанию 60. */
  mins?: number;
  /** YYYY-MM-DD (московский календарный день для брони). */
  dateISO?: string;
  /** HH:mm (московские часы для брони). */
  timeHHmm?: string;
  /** Сразу открыть меню поиска ближайшего окна. */
  openNearestSearch?: boolean;
  /** Предпочтительный формат выбора ПК на экране брони. */
  pcPickerMode?: 'scheme' | 'list';
};

export type ProfileStackParamList = {
  ProfileHome: { openTopUp?: boolean; openDice?: boolean } | undefined;
  QrLogin: undefined;
  InsightsHub: undefined;
  GameRankingUsers: { game: 'CS2' | 'Dota 2' | 'Valorant' | 'PUBG' };
  News: undefined;
  Settings: undefined;
  SettingsCity: undefined;
  SettingsFace: undefined;
  FaceCapture: undefined;
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
  Food: undefined;
  Booking: { prefill?: BookingPrefillParams } | undefined;
  Chat: undefined;
};
