# Зависимости

## Среда

| Категория | Версия / заметка |
|-----------|------------------|
| Node.js | LTS, совместимая с Expo 51 |
| **Expo** | `~51.0.39` (см. `package.json`) |
| **React Native** | `0.74.5` |
| **TypeScript** | `~5.3.3` |
| **Тесты** | `vitest` — `tests/unit`, `tests/api-live` |

## Основные npm-пакеты

| Область | Пакеты |
|---------|--------|
| Навигация | `@react-navigation/native`, `native-stack`, `bottom-tabs` |
| Состояние сервера | `@tanstack/react-query`, `react-query-persist-client`, `query-async-storage-persister` |
| Хранение | `@react-native-async-storage/async-storage`, `expo-secure-store` |
| Expo | `expo-av`, `expo-calendar`, `expo-clipboard`, `expo-constants`, `expo-crypto`, `expo-device`, `expo-font`, `expo-haptics`, `expo-linear-gradient`, `expo-location`, `expo-notifications`, `expo-splash-screen`, `expo-status-bar`, … |
| UI / жесты | `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`, `react-native-webview` |
| Web (опц.) | `react-native-web`, `@expo/metro-runtime` |
| Крипто/подписи | `md5`, `expo-crypto` |
| 3D (промо) | `expo-three`, `three` |

## Патчи

`patch-package` + `postinstall` — кастомные правки в `node_modules` лежат в [`patches/`](../../../patches/) репозитория.

## Внешние сервисы (рантайм)

Не npm: **vibe** / **iCafe** HTTP API, **VK** (новости), push-сервисы Expo при настройке EAS.

## Документация поставщиков

- [Expo](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [TanStack Query](https://tanstack.com/query/latest)

См. также: [../ARCHITECTURE.md](../ARCHITECTURE.md), [../submoduli/configuration.md](../submoduli/configuration.md).
