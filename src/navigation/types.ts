import type { NavigatorScreenParams } from '@react-navigation/native';

export type BookingPrefillParams = {
  icafeId: number;
  pcName: string;
  mins: number;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
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
