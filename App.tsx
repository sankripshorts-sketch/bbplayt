import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { LocaleProvider } from './src/i18n/LocaleContext';
import { KnowledgeProvider } from './src/knowledge/KnowledgeContext';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, applyDefaultTypography, useAppFonts } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      /** RN: иначе refetch при «фокусе» окна часто дергается при клавиатуре и сбрасывает ввод. */
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) {
      applyDefaultTypography();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LocaleProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <KnowledgeProvider>
                  <AppErrorBoundary>
                    <StatusBar style="light" />
                    <RootNavigator />
                  </AppErrorBoundary>
                </KnowledgeProvider>
              </AuthProvider>
            </QueryClientProvider>
          </LocaleProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
