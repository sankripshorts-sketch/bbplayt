import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import {
  BalanceHistoryScreen,
  CustomerAnalysisScreen,
  GameSessionsScreen,
  RankingScreen,
} from '../features/profile/InsightScreens';
import { EditProfileScreen } from '../features/profile/EditProfileScreen';
import { SettingsScreen } from '../features/profile/SettingsScreen';
import { SettingsAppearanceScreen } from '../features/profile/SettingsAppearanceScreen';
import { SettingsBookingRemindersScreen } from '../features/profile/SettingsBookingRemindersScreen';
import { useLocale } from '../i18n/LocaleContext';
import { fonts, useThemeColors } from '../theme';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  const { t } = useLocale();
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.semibold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('profile.settings') }} />
      <Stack.Screen
        name="SettingsAppearance"
        component={SettingsAppearanceScreen}
        options={{ title: t('profile.sectionAppearance') }}
      />
      <Stack.Screen
        name="SettingsBookingReminders"
        component={SettingsBookingRemindersScreen}
        options={{ title: t('profile.settingsHubBookingReminders') }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: t('profile.editProfileTitle') }}
      />
      <Stack.Screen name="BalanceHistory" component={BalanceHistoryScreen} options={{ title: t('profile.balanceHistoryTitle') }} />
      <Stack.Screen name="GameSessions" component={GameSessionsScreen} options={{ title: t('profile.gameSessionsTitle') }} />
      <Stack.Screen name="CustomerAnalysis" component={CustomerAnalysisScreen} options={{ title: t('profile.customerAnalysisTitle') }} />
      <Stack.Screen name="Ranking" component={RankingScreen} options={{ title: t('profile.rankingTitle') }} />
    </Stack.Navigator>
  );
}
