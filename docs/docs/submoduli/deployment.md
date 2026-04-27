# Сборка и публикация

## Когда что использовать

| Цель | Инструмент |
|------|------------|
| Быстрый JS-HMR, Expo Go / туннель | `npm start` (без EAS) |
| Нужны **кастомные плагины** / стабильные пуши | **development build** (`development` в `eas.json`) |
| **Внутренняя** раздача APK тестерам (Android) | `eas build -p android --profile preview` |
| **Google Play** (AAB) | `eas build -p android --profile production` |
| **TestFlight / App Store** (iOS) | `eas build -p ios` + `eas submit` (настройка отдельно) |

## EAS Build (облако)

1. Аккаунт на [expo.dev](https://expo.dev/), проект с `projectId` из `app.config.js` `extra.eas` (сейчас в репо задан; не меняйте без миграции проекта).
2. Установить CLI: `npm install -g eas-cli`.
3. `eas login`.
4. Убедиться, что **версия** `cli` в `eas.json` удовлетворяется: `"cli": { "version": ">= 7.8.0" }`.
5. Сборка:

```bash
eas build -p android --profile preview
eas build -p android --profile production
eas build -p ios --profile production
```

6. **Переменные** `EXPO_PUBLIC_*` для облачной сборки: задать в **EAS** (секреты / env), иначе подставятся дефолты из `app.config.js` (например `apiBaseUrl`).

### Профили из `eas.json` (текущие)

| Профиль | Примечание |
|---------|------------|
| `development` | `developmentClient: true` — dev client, internal |
| `preview` | `distribution: internal`, Android `buildType: apk`, iOS `simulator: false` |
| `production` | Android `buildType: app-bundle` (AAB) |

`appVersionSource: remote` — версию можно вести с EAS/remote; согласуйте с `app.config.js` `version`.

## Локальные нативные сборки (без EAS)

Генерация `android/`, `ios/` и запуск нативной сборки:

```bash
npx expo prebuild
npx expo run:android
npx expo run:ios
```

Нужны **Android Studio** (SDK, NDK по требованию плагинов) и/или **Xcode** (только macOS). После `prebuild` в репозитории появляются папки `android/`, `ios/` (часто в `.gitignore` — ориентир на политику команды).

## Публикация в сторы

- **Контент:** `app.config.js` — `name`, `version`, `ios.bundleIdentifier` (`com.bbplay.app`), `android.package`, иконки, splash, разрешения, **плагины** (уведомления, календарь, гео).
- **Signing:** iOS — сертификаты и профили в Apple Developer; Android — keystore (EAS может управлять credentials).
- **Секреты** push (FCM, APNs) — в EAS, не в репо.

## OTA-обновления (Expo Updates)

В этой доке не детализированы. Если в проекте включён `expo-updates`, **нативные** изменения (плагины) всё равно требуют **новой** сборки; JS — по политике EAS Update.

## Env на прод-стенд

- Один **набор** `EXPO_PUBLIC_*` на контур (staging/prod) — **один к одному** с сервером (подписи, пути, URL topup).
- Проверка: скачать **AAB** → декомпиляция не нужна: достаточно знать, что в EAS для билда заданы нужные env.

См. также: [../ARCHITECTURE.md](../ARCHITECTURE.md) (EAS-таблица), [configuration.md](configuration.md), [operations.md](operations.md).
