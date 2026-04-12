import Constants from 'expo-constants';

/** Базовый URL vibe API — тот же, что в `src/api/vibeClient.ts`. */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return (fromEnv || extra?.apiBaseUrl || '').replace(/\/$/, '');
}
