import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { LocaleProvider } from './src/i18n/LocaleContext';
import { KnowledgeProvider } from './src/knowledge/KnowledgeContext';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

export default function App() {
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
