import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, type EventArg } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
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
import { DiceWelcomePromoOverlay } from '../features/promos/DiceWelcomePromoOverlay';
import { FirstLoginTutorialOverlay } from '../features/promos/FirstLoginTutorialOverlay';
import { ClubDataLoader } from '../features/ui/ClubDataLoader';

const Tab = createBottomTabNavigator<MainTabParamList>();
const TAB_BAR_EDGE_BLEED_PX = 128;

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
    if (user?.memberAccount?.trim() || user?.memberId?.trim()) {
      void qc.refetchQueries({ queryKey: queryKeys.books(user?.memberAccount, user?.memberId) });
    }
    void refreshMemberBalance().catch(() => {
      /* синхронизация данных на фокусе вкладки — best effort */
    });
  }, [qc, refreshMemberBalance, user?.memberAccount, user?.memberId]);

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
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.tabBarEdgeBleed,
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
  bootstrapRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  bootstrapLoader: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export function RootNavigator() {
  const { user, ready } = useAuth();
  const colors = useThemeColors();
  const { t } = useLocale();
  const knowledgeReady = useKnowledgeReady();
  const { dataReady } = useAppBootstrap();
  const isRestoringCache = useIsRestoring();
  const [promoUnlocked, setPromoUnlocked] = useState(false);
  const promoUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user) {
      if (promoUnlockTimerRef.current) {
        clearTimeout(promoUnlockTimerRef.current);
        promoUnlockTimerRef.current = null;
      }
      setPromoUnlocked(false);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (promoUnlockTimerRef.current) {
        clearTimeout(promoUnlockTimerRef.current);
      }
    };
  }, []);

  /**
   * Пока идёт бутстрап — экран с лоадером. Ждём и восстановление RQ из AsyncStorage (`useIsRestoring`):
   * иначе кэш ещё подтягивается, UI уже без лоадера, а 1–3 с «мёртвый» экран/фриз.
   */
  const bootstrapping =
    !ready || !knowledgeReady || !dataReady || isRestoringCache;

  useLayoutEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleTutorialDone = useCallback(() => {
    // Небольшая пауза между закрытием туториала и следующей акцией, чтобы переход не был резким.
    if (promoUnlockTimerRef.current) {
      clearTimeout(promoUnlockTimerRef.current);
    }
    promoUnlockTimerRef.current = setTimeout(() => {
      setPromoUnlocked(true);
      promoUnlockTimerRef.current = null;
    }, 220);
  }, []);

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
      <View style={[styles.bootstrapRoot, { backgroundColor: colors.bg }]}>
        <ClubDataLoader message={t('common.loadingData')} minHeight={0} style={styles.bootstrapLoader} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
        {user ? <MainTabs /> : <AuthNavigator />}
      </NavigationContainer>
      {user ? <FirstLoginTutorialOverlay onDone={handleTutorialDone} /> : null}
      {user && promoUnlocked ? <DiceWelcomePromoOverlay /> : null}
    </>
  );
}
