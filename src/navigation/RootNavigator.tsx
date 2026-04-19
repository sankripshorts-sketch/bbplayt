import React, { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { useLocale } from '../i18n/LocaleContext';
import { AuthNavigator } from './AuthNavigator';
import { ProfileStack } from './ProfileStack';
import { CafesScreen } from '../features/cafes/CafesScreen';
import { NewsScreen } from '../features/news/NewsScreen';
import { BookingScreen } from '../features/booking/BookingScreen';
import { KnowledgeChatScreen } from '../features/chat/KnowledgeChatScreen';
import { fonts, useThemeColors } from '../theme';
import { navigationRef } from './navigationRef';
import type { MainTabParamList } from './types';
import { BookingNotificationListener } from './BookingNotificationListener';
import { TodayBookingNotificationSync } from './TodayBookingNotificationSync';
import { VisitFeedbackProvider } from '../notifications/VisitFeedbackContext';
import { useKnowledgeReady } from '../knowledge/KnowledgeContext';
import { useAppBootstrap } from '../query/useAppBootstrap';

const Tab = createBottomTabNavigator<MainTabParamList>();

const linking = {
  prefixes: ['bbplay://'] as string[],
  config: {
    screens: {
      Profile: 'profile',
      Cafes: 'cafes',
      News: 'news',
      Booking: 'booking',
      Chat: 'chat',
    },
  },
};

function MainTabs() {
  const colors = useThemeColors();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const tabBarBottomPad = Math.max(insets.bottom, 4);

  return (
    <VisitFeedbackProvider>
      <TodayBookingNotificationSync />
      <BookingNotificationListener />
      <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card, borderBottomColor: colors.border },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          paddingBottom: tabBarBottomPad,
          paddingTop: 4,
          height: 52 + tabBarBottomPad,
          paddingHorizontal: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fonts.semibold,
          marginBottom: 0,
          maxWidth: 72,
        },
        tabBarAllowFontScaling: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: t('tabs.profile'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Cafes"
        component={CafesScreen}
        options={{
          title: t('tabs.cafes'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="storefront-outline" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="News"
        component={NewsScreen}
        options={{
          title: t('tabs.news'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="newspaper-variant-outline" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Booking"
        component={BookingScreen}
        options={{
          title: t('tabs.booking'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-clock" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={KnowledgeChatScreen}
        options={{
          title: t('tabs.help'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat-question-outline" size={size ?? 26} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
    </VisitFeedbackProvider>
  );
}

export function RootNavigator() {
  const { user, ready } = useAuth();
  const colors = useThemeColors();
  const knowledgeReady = useKnowledgeReady();
  const { dataReady } = useAppBootstrap();
  const bootstrapping = !ready || !knowledgeReady || !dataReady;

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: colors.bg,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        primary: colors.accent,
      },
    }),
    [colors],
  );

  if (bootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.accentBright} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      {user ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
