# Запуск

## Требования к окружению

| Компонент | Рекомендация |
|-----------|----------------|
| **Node.js** | LTS (см. совместимость с Expo 51 в [доках Expo](https://docs.expo.dev/)) |
| **npm** | Идёт с Node; при необходимости `corepack` для pnpm/yarn не обязателен — проект на `npm` |
| **Git** | Для клонирования и версионирования |
| **Android** | [Android Studio](https://developer.android.com/studio) — SDK, эмулятор, при устройстве по USB — драйверы / отладка по USB |
| **iOS** | Только **macOS**: Xcode, симулятор или устройство |
| **Физическое устройство** | Приложение **Expo Go** из магазина или **development build** (EAS), одна сеть Wi‑Fi с ПК для Metro (или туннель) |

На **Windows** нативная сборка iOS недоступна; Android — полный цикл. WSL для Metro возможен, но пути и USB иногда проще в обычном PowerShell/cmd.

## Первый запуск (пошагово)

1. Перейти в каталог репозитория (корень `bbplay`, где лежит `package.json`).
2. Выполнить `npm install` (создаётся `node_modules`, срабатывает `postinstall` → `patch-package`).
3. Скопировать **`.env.example`** в **`.env`** в корне репо (тот же уровень, что `package.json`).
4. В `.env` задать минимум **`EXPO_PUBLIC_API_BASE_URL`** (или оставить значение по умолчанию из примера, если стейдж доступен).
5. Запустить **`npm start`** — откроется **Expo Dev Tools** в терминале и/или браузере, появится QR-код.
6. На телефоне: открыть **Expo Go**, отсканировать QR (режим **LAN** — телефон и ПК в одной сети; **Tunnel** — если LAN блокируется).
7. Дождаться сборки бандла; при ошибке — см. раздел «Проблемы» ниже.

Детали переменных: [configuration.md](configuration.md). Структура папок: [workspace-layout.md](workspace-layout.md).

## Команды `package.json`

| Скрипт | Действие |
|--------|----------|
| `npm start` | `expo start` — Metro Bundler, QR для Expo Go / dev client |
| `npm run android` | Сборка и запуск на Android (эмулятор должен быть уже запущен или устройство подключено) |
| `npm run ios` | Запуск на iOS-симуляторе (macOS) |
| `npm run web` | Веб-таргет; не все нативные модули ведут себя как на телефоне |
| `npm run lint` | `tsc --noEmit` — проверка типов без эмита JS |
| `npm run test:unit` | Vitest, каталог `tests/unit` |
| `npm run test:api` | Vitest, `tests/api-live` — **живые** HTTP-запросы; нужен доступ к API и корректный `.env` |
| `npm run test:api:watch` | То же в watch-режиме для отладки тестов |

## Android: эмулятор

1. В Android Studio — **Device Manager** → создать виртуальное устройство (рекомендуется образ с Play Store, если нужны сервисы).
2. Запустить эмулятор **до** `npm run android` или выбрать устройство в интерактивном меню Expo.
3. Если порт Metro занят — Expo подскажет другой; при конфликтах закройте лишние процессы Node.

## Android: устройство по USB

1. Включить **режим разработчика** и **USB-отладку** на телефоне.
2. Подключить кабелем; при запросе разрешить отладку.
3. `adb devices` должен показать устройство (Android SDK platform-tools в PATH).
4. `npm run android` или в меню Expo выбрать устройство.

## iOS (macOS)

1. Установить **Xcode** из App Store, открыть хотя бы раз (лицензия, компоненты).
2. `npm run ios` — соберёт и откроет симулятор. Для реального устройства — подпись Apple Developer, профили, см. [deployment.md](deployment.md).

## Очистка кэша Metro

При «странных» ошибках после обновления зависимостей или правок в `babel`/`metro`:

```bash
npx expo start -c
```

Либо удалить кэш вручную (Expo документация описывает каталоги кэша для вашей ОС).

## Что нужно для «живого» приложения

- **Доступный бэкенд** по URL из `EXPO_PUBLIC_API_BASE_URL`. Без него логин, клубы и брони не заработают.
- Для **push-уведомлений** в полном объёме часто нужен **development build** или **production** билд, не только Expo Go (зависит от плагинов и учётных записей Apple/Google).

## Типичные проблемы при старте

| Симптом | Что проверить |
|---------|----------------|
| `Cannot connect to Metro` на телефоне | Одна Wi‑Fi сеть, файрвол ПК, попробовать **Tunnel** в Dev Tools |
| Белый экран после splash | Логи Metro; падение в нативе — Logcat / Xcode |
| Ошибки импорта после `git pull` | `npm install`, `npx expo start -c` |
| `patch-package` ругается | Не коммитить ручные правки в `node_modules` без `patch-package`; восстановить `npm install` |

См. также: [troubleshooting.md](troubleshooting.md), [../developer-guide.md](../developer-guide.md).
