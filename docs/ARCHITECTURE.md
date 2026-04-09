# BBplay — архитектура и инструменты

## Назначение

Приложение для сети **BlackBears Play**: авторизация на **`vibe.blackbearsplay.ru`**, список клубов, новости (встроенная страница VK), бронирование мест через API iCafe/vibe, локальный чат поддержки по JSON.

## Стек

| Компонент | Технология |
|-----------|------------|
| Платформа | **Expo SDK 51** (React Native 0.74, React 18) |
| Язык | **TypeScript** (strict, без `extends` от отсутствующего `expo/tsconfig.base` в IDE) |
| Навигация | `@react-navigation/native`, **bottom tabs** + экран логина |
| Серверное состояние | `@tanstack/react-query` |
| HTTP | [`src/api/vibeClient.ts`](../src/api/vibeClient.ts) — разбор `{ code, message, data }` |
| Сессия | [`src/auth/sessionStorage.ts`](../src/auth/sessionStorage.ts) — JSON в `expo-secure-store` |
| Подпись брони | `expo-crypto` (MD5), см. [`src/api/bookingKey.ts`](../src/api/bookingKey.ts) |
| Новости | `react-native-webview` — мобильная версия группы VK |

## Экраны

| Вкладка | Файл | Суть |
|---------|------|------|
| Профиль | `src/features/profile/ProfileScreen.tsx` | Аккаунт, member_id, баланс если есть в ответе логина, выход |
| Клубы | `src/features/cafes/CafesScreen.tsx` | `GET /cafes` |
| Новости | `src/features/news/NewsScreen.tsx` | WebView `m.vk.com/bbplay__tmb` |
| Бронь | `src/features/booking/BookingScreen.tsx` | тарифы, доступные ПК, `POST /booking`, список броней |
| Помощь | `src/features/chat/KnowledgeChatScreen.tsx` | локальный поиск по `assets/knowledge.json` |

## Поток данных

1. **Логин** — `POST /login` → разбор `data`, опционально токен и `Set-Cookie` → сохранение сессии.
2. **Клубы / бронь** — запросы к vibe с заголовками сессии, см. [`docs/api-spec.md`](api-spec.md).
3. **Чат** — только локальная база, без внешних LLM.

## AI-инструменты

Промпты — в [`docs/PROMPTS.md`](PROMPTS.md).

## Референс из архивов Android / iOS

Архивы `BBPlay-android-master` / `BBPlay-ios-dev` — для сверки URL, полей и алгоритма `key` у `POST /booking`, если отличается от текущей реализации.

## Сборка APK (Android) и iOS

### Один раз

1. `npm install`
2. Установите [EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli`
3. `eas login`
4. В каталоге проекта: `eas init` и подставьте **`extra.eas.projectId`** в [`app.config.js`](../app.config.js)
5. При необходимости скопируйте [`.env.example`](../.env.example) → `.env`

### Android APK (удобно для теста)

Профиль [`preview`](../eas.json) собирает **APK**:

```bash
eas build -p android --profile preview
```

Готовую ссылку на скачивание покажет EAS (веб-консоль и письмо).

### Android AAB (Google Play)

```bash
eas build -p android --profile production
```

### iOS (TestFlight / App Store)

Нужна учётная запись Apple Developer; настройка credentials через EAS:

```bash
eas build -p ios --profile preview
```

или `production` для релиза.

### Локально (без EAS)

Требуются Android Studio / Xcode:

```bash
npx expo prebuild
npx expo run:android
npx expo run:ios
```

| Платформа | Тип | Ссылка |
|-----------|-----|--------|
| Android | APK/AAB | _вставить после `eas build`_ |
| iOS | ipa / TestFlight | _вставить после `eas build`_ |
