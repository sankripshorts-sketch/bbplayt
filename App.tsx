import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Audio } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { persistOptions, queryClient } from './src/query/queryClient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { FoodProvider } from './src/features/food/FoodContext';
import { LocaleProvider } from './src/i18n/LocaleContext';
import { KnowledgeProvider } from './src/knowledge/KnowledgeContext';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { AppAlertProvider } from './src/components/AppAlertContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemedSystemChrome } from './src/components/ThemedSystemChrome';
import { ThemeProvider, applyDefaultTypography, useAppFonts } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    if (!body) return;

    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      bodyMargin: body.style.margin,
      bodyPadding: body.style.padding,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      rootHeight: root?.style.height ?? '',
      rootWidth: root?.style.width ?? '',
      rootOverflow: root?.style.overflow ?? '',
    };

    html.style.height = '100%';
    html.style.overflow = 'hidden';
    body.style.margin = '0';
    body.style.padding = '0';
    body.style.height = '100%';
    body.style.overflow = 'hidden';
    if (root) {
      root.style.height = '100%';
      root.style.width = '100%';
      root.style.overflow = 'hidden';
    }

    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      body.style.margin = prev.bodyMargin;
      body.style.padding = prev.bodyPadding;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      if (root) {
        root.style.height = prev.rootHeight;
        root.style.width = prev.rootWidth;
        root.style.overflow = prev.rootOverflow;
      }
    };
  }, []);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      applyDefaultTypography();
    }
  }, [fontsLoaded]);

  // Нативный сплэш снимаем в RootNavigator сразу при монтировании — один экран загрузки (лоадер бутстрапа),
  // без отдельной картинки splash до него.

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LocaleProvider>
            <AppAlertProvider>
              <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
                <AuthProvider>
                  <FoodProvider>
                    <KnowledgeProvider>
                      <AppErrorBoundary>
                        <ThemedSystemChrome />
                        <RootNavigator />
                      </AppErrorBoundary>
                    </KnowledgeProvider>
                  </FoodProvider>
                </AuthProvider>
              </PersistQueryClientProvider>
            </AppAlertProvider>
          </LocaleProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
