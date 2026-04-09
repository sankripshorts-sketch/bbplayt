/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'BBplay',
  slug: 'bbplay',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#141824',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.bbplay.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#141824',
    },
    package: 'com.bbplay.app',
  },
  scheme: 'bbplay',
  extra: {
    eas: {
      projectId: '92bb932c-d723-42a6-b257-cfb55083e166',
    },
    apiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL || 'https://vibe.blackbearsplay.ru',
    /** Оплата / ЛК (WebView в приложении) */
    topUpUrl: process.env.EXPO_PUBLIC_TOP_UP_URL || 'https://bbgms.link/bbplay/ru',
    /**
     * Если регистрация идёт на другом хосте — задайте. Иначе = apiBaseUrl.
     */
    icafeApiBaseUrl: process.env.EXPO_PUBLIC_ICAFE_API_BASE_URL || '',
  },
};
