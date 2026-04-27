import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, type EventArg } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useLocale } from '../i18n/LocaleContext';
import { AuthNavigator } from './AuthNavigator';
import { ProfileStack } from './ProfileStack';
import { CafesScreen } from '../features/cafes/CafesScreen';
import { FoodScreen } from '../features/food/FoodScreen';
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
import { queryKeys } from '../query/queryKeys';
import { ClubDataLoader } from '../features/ui/ClubDataLoader';
import { DiceWelcomePromoOverlay } from '../features/promos/DiceWelcomePromoOverlay';

const Tab = createBottomTabNavigator<MainTabParamList>();
const TAB_BAR_EDGE_BLEED_PX = 128;
/** Не держим экран загрузки дольше этого, если сеть ведёт себя плохо. */
const BOOTSTRAP_MAX_WAIT_MS = 5000;

const linking = {
  prefixes: ['bbplay://'] as string[],
  config: {
    screens: {
      Profile: {
        path: 'profile',
        screens: {
          ProfileHome: '',
          News: 'news',
        },
      },
      Cafes: 'cafes',
      Food: 'food',
      Booking: 'booking',
      Chat: 'chat',
    },
  },
};

function MainTabs() {
  const { user, refreshMemberBalance } = useAuth();
  const qc = useQueryClient();
  const colors = useThemeColors();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  // Android can report bottom inset as 0 even with a system navigation bar.
  // Force a minimum bottom pad so the tab bar reaches the real screen edge.
  const tabBarBottomPad = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, 8);
  const lastRefreshAtRef = useRef(0);

  const refreshSessionDataOnTabFocus = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshAtRef.current < 5000) return;
    lastRefreshAtRef.current = now;
    if (user?.memberAccount?.trim()) {
      void qc.refetchQueries({ queryKey: queryKeys.books(user.memberAccount) });
    }
    void refreshMemberBalance().catch(() => {
      /* синхронизация данных на фокусе вкладки — best effort */
    });
  }, [qc, refreshMemberBalance, user?.memberAccount]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshSessionDataOnTabFocus();
    });
    return () => sub.remove();
  }, [refreshSessionDataOnTabFocus]);

  return (
    <VisitFeedbackProvider>
      <TodayBookingNotificationSync />
      <BookingNotificationListener />
      <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: colors.bg }}
      screenListeners={{
        focus: refreshSessionDataOnTabFocus,
      }}
      screenOptions={{
        unmountOnBlur: false,
        headerStyle: { backgroundColor: colors.card, borderBottomColor: colors.border },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          opacity: 1,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: tabBarBottomPad,
          paddingTop: 6,
          height: 56 + tabBarBottomPad,
          paddingHorizontal: 4,
          ...Platform.select({
            android: { elevation: 12 },
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.18,
              shadowRadius: 6,
            },
            web: { boxShadow: '0 -2px 6px rgba(0,0,0,0.18)' },
            default: {},
          }),
          overflow: 'visible',
        },
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              styles.tabBarEdgeBleed,
              styles.pointerNone,
              { backgroundColor: colors.card },
            ]}
          />
        ),
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
        listeners={({ navigation }) => ({
          tabPress: (e: EventArg<'tabPress', true>) => {
            const state = navigation.getState();
            const profileTabIndex = state.routes.findIndex((r: { name: string }) => r.name === 'Profile');
            const profileRoute = state.routes[profileTabIndex];
            const nested = profileRoute?.state as
              | { index?: number; routes?: { name?: string }[] }
              | undefined;
            const nestedName = nested?.routes?.[nested.index ?? 0]?.name;
            const profileFocused = state.index === profileTabIndex;
            if (profileFocused && nestedName && nestedName !== 'ProfileHome') {
              e.preventDefault();
              navigation.navigate('Profile', { screen: 'ProfileHome' });
            }
          },
        })}
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
        name="Booking"
        component={BookingScreen}
        options={{
          title: t('tabs.booking'),
          headerShown: false,
          unmountOnBlur: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-clock" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Food"
        component={FoodScreen}
        options={{
          title: t('tabs.food'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="silverware-fork-knife" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={KnowledgeChatScreen}
        options={{
          title: t('tabs.help'),
          headerShown: false,
          unmountOnBlur: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat-question-outline" size={size ?? 26} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
    </VisitFeedbackProvider>
  );
}

const styles = StyleSheet.create({
  tabBarEdgeBleed: {
    bottom: -TAB_BAR_EDGE_BLEED_PX,
  },
  pointerNone: {
    pointerEvents: 'none',
  },
});

export function RootNavigator() {
  const { user, ready } = useAuth();
  const colors = useThemeColors();
  const knowledgeReady = useKnowledgeReady();
  const { dataReady } = useAppBootstrap();
  const [bootstrapDeadlinePassed, setBootstrapDeadlinePassed] = useState(false);
  useEffect(() => {
    if (!ready) {
      setBootstrapDeadlinePassed(false);
      return;
    }
    const t = setTimeout(() => setBootstrapDeadlinePassed(true), BOOTSTRAP_MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, [ready]);
  const bootstrapping =
    !ready ||
    (!bootstrapDeadlinePassed && (!knowledgeReady || !dataReady));

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
        <ClubDataLoader imageSize={300} minHeight={400} style={{ transform: [{ translateY: 0 }] }} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
        {user ? <MainTabs /> : <AuthNavigator />}
      </NavigationContainer>
      {user ? <DiceWelcomePromoOverlay /> : null}
    </>
  );
}
