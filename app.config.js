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
    backgroundColor: '#0a0514',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.bbplay.app',
    infoPlist: {
      LSApplicationQueriesSchemes: ['yandexmaps', 'comgooglemaps', 'maps'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0a0514',
    },
    package: 'com.bbplay.app',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'READ_CALENDAR',
      'WRITE_CALENDAR',
    ],
  },
  scheme: 'bbplay',
  plugins: [
    'expo-font',
    'expo-notifications',
    [
      'expo-calendar',
      {
        calendarPermission:
          'BBplay может добавлять брони в календарь, когда вы нажимаете «Добавить в календарь».',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'BBplay использует геолокацию для сортировки клубов по расстоянию.',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '92bb932c-d723-42a6-b257-cfb55083e166',
    },
    apiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL || 'https://vibe.blackbearsplay.ru',
    /**
     * Оплата / ЛК (WebView). Пусто → URL строится от apiBaseUrl + bbplay/ru (тот же сервер, что API).
     * Или задайте полный URL: EXPO_PUBLIC_TOP_UP_URL
     */
    topUpUrl: process.env.EXPO_PUBLIC_TOP_UP_URL || '',
    /**
     * MD5 для POST /verify и /booking (как BuildConfig.SECRET_KEY в реф. Android).
     * Переопределение: EXPO_PUBLIC_VERIFY_SIGN_SECRET или EXPO_PUBLIC_BOOKING_SIGN_SECRET.
     */
    contestSignSecret:
      process.env.EXPO_PUBLIC_VERIFY_SIGN_SECRET ||
      process.env.EXPO_PUBLIC_BOOKING_SIGN_SECRET ||
      'M0R4SGnGrNnNFkeT2125LFB0cAHbBkXD',
    /**
     * Если регистрация идёт на другом хосте — задайте. Иначе = apiBaseUrl.
     */
    icafeApiBaseUrl: process.env.EXPO_PUBLIC_ICAFE_API_BASE_URL || '',
    /** GET vibe: брони пользователя (см. API_VIBE — по умолчанию `/all-books-cafes`) */
    allBooksPath: process.env.EXPO_PUBLIC_ALL_BOOKS_PATH || '/all-books-cafes',
    /** Опционально: публичный URL JSON базы знаний для чата (формат как assets/knowledge.json) */
    knowledgeJsonUrl: process.env.EXPO_PUBLIC_KNOWLEDGE_JSON_URL || '',
    /** Опционально: URL формы «отзыв о работе» (экран «Клубы»). Пусто — показывается подсказка. */
    jobReviewUrl: process.env.EXPO_PUBLIC_JOB_REVIEW_URL || '',
  },
};
