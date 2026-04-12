import Constants from 'expo-constants';

/**
 * Один секрет с бэкендом / реф. Android `BuildConfig.SECRET_KEY`.
 * Задаётся через env или `app.config.js` → `extra.contestSignSecret`.
 */
export function getContestSignSecret(): string {
  const v = process.env.EXPO_PUBLIC_VERIFY_SIGN_SECRET?.trim();
  const b = process.env.EXPO_PUBLIC_BOOKING_SIGN_SECRET?.trim();
  const extra = Constants.expoConfig?.extra as { contestSignSecret?: string } | undefined;
  const fromExtra = extra?.contestSignSecret?.trim();
  return v || b || fromExtra || '';
}
