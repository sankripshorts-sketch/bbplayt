import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../auth/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { CafesScreen } from '../features/cafes/CafesScreen';
import { NewsScreen } from '../features/news/NewsScreen';
import { BookingScreen } from '../features/booking/BookingScreen';
import { KnowledgeChatScreen } from '../features/chat/KnowledgeChatScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card, borderBottomColor: colors.border },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Профиль', headerShown: false }}
      />
      <Tab.Screen
        name="Cafes"
        component={CafesScreen}
        options={{ title: 'Клубы', headerShown: false }}
      />
      <Tab.Screen
        name="News"
        component={NewsScreen}
        options={{ title: 'Новости', headerShown: false }}
      />
      <Tab.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: 'Бронь', headerShown: false }}
      />
      <Tab.Screen
        name="Chat"
        component={KnowledgeChatScreen}
        options={{ title: 'Помощь', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
