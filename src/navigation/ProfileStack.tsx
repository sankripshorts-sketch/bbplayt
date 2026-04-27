import React from 'react';
import { HeaderBackButton } from '@react-navigation/elements';
import type { HeaderBackButtonProps } from '@react-navigation/elements';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import {
  BalanceHistoryScreen,
  CustomerAnalysisScreen,
  GameRankingUsersScreen,
  GameSessionsScreen,
  InsightsHubScreen,
  RankingScreen,
} from '../features/profile/InsightScreens';
import { EditProfileScreen } from '../features/profile/EditProfileScreen';
import { SettingsScreen } from '../features/profile/SettingsScreen';
import { SettingsAppearanceScreen } from '../features/profile/SettingsAppearanceScreen';
import { SettingsBookingRemindersScreen } from '../features/profile/SettingsBookingRemindersScreen';
import { SettingsCityScreen } from '../features/profile/SettingsCityScreen';
import { SettingsFaceScreen } from '../features/profile/SettingsFaceScreen';
import { FaceCaptureScreen } from '../features/profile/FaceCaptureScreen';
import { QrLoginScreen } from '../features/profile/QrLoginScreen';
import { NewsScreen } from '../features/news/NewsScreen';
import { useLocale } from '../i18n/LocaleContext';
import { fonts, useThemeColors } from '../theme';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

function headerBackOrProfileHome(
  navigation: NativeStackNavigationProp<ProfileStackParamList>,
): { headerLeft: (props: HeaderBackButtonProps) => React.ReactElement } {
  return {
    headerLeft: (props: HeaderBackButtonProps) => (
      <HeaderBackButton
        {...props}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('ProfileHome');
          }
        }}
      />
    ),
  };
}

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
        contentStyle: { flex: 1, backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="QrLogin" component={QrLoginScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="InsightsHub"
        component={InsightsHubScreen}
        options={({ navigation }) => ({
          title: t('profile.statisticsButton'),
          ...headerBackOrProfileHome(navigation),
        })}
      />
      <Stack.Screen
        name="News"
        component={NewsScreen}
        options={({ navigation }) => ({
          title: t('tabs.news'),
          ...headerBackOrProfileHome(navigation),
        })}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          title: t('profile.settings'),
          ...headerBackOrProfileHome(navigation),
        })}
      />
      <Stack.Screen
        name="SettingsCity"
        component={SettingsCityScreen}
        options={({ navigation }) => ({
          title: t('profile.settingsCityTitle'),
          ...headerBackOrProfileHome(navigation),
        })}
      />
      <Stack.Screen
        name="SettingsFace"
        component={SettingsFaceScreen}
        options={({ navigation }) => ({
          title: t('profile.sectionFace'),
          ...headerBackOrProfileHome(navigation),
        })}
      />
      <Stack.Screen
        name="FaceCapture"
        component={FaceCaptureScreen}
        options={({ navigation }) => ({
          title: t('profile.faceCaptureTitle'),
          ...headerBackOrProfileHome(navigation),
        })}
      />
      <Stack.Screen
        name="SettingsAppearance"
        component={SettingsAppearanceScreen}
        options={({ navigation }) => ({
          title: t('profile.sectionAppearance'),
          ...headerBackOrProfileHome(navigation),
        })}
      />
      <Stack.Screen
        name="SettingsBookingReminders"
        component={SettingsBookingRemindersScreen}
        options={({ navigation }) => ({
          title: t('profile.settingsHubBookingReminders'),
          ...headerBackOrProfileHome(navigation),
        })}
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
      <Stack.Screen
        name="GameRankingUsers"
        component={GameRankingUsersScreen}
        options={({ route, navigation }) => ({
          title: route.params.game,
          ...headerBackOrProfileHome(navigation),
        })}
      />
    </Stack.Navigator>
  );
}
