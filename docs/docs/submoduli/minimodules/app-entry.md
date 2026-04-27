# `App.tsx`

Корневой компонент Expo: жесты (`GestureHandlerRootView`), `SafeAreaProvider`, цепочка провайдеров, скрытие splash после загрузки шрифтов, настройка `expo-av`.

## Порядок провайдеров

`Theme` → `Locale` → `PersistQueryClient` → `Auth` → `Food` → `Knowledge` → `AppErrorBoundary` → `RootNavigator`.

## См. также

- [query-client.md](query-client.md)
- [root-navigator.md](root-navigator.md)
- [../../modules/architecture.md](../../modules/architecture.md)
