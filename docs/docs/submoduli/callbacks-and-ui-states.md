# Состояния UI и навигация

## Навигация

- **RootNavigator** решает: стек авторизации **или** основной таб-навигатор с вложенными стеками (профиль, бронь, …).
- **Deep link** `bbplay://` — сценарии открытия с экрана уведомлений или внешних ссылок.
- **Фокус** экрана: `refetchOnWindowFocus: false` в React Query, чтобы ввод в полях не сбрасывался на RN при всплытии клавиатуры.

## Загрузка

- `useAppBootstrap` — глобальная инициализация кэшей после auth/knowledge: пока не готово, показывается загрузка.
- **Suspense-образные** места: скелетоны в `features/ui/`.

## Ошибки

- `AppErrorBoundary` — падение в дереве React; пользовательский fallback.
- Сетевые/API ошибки — чаще через `ApiError` и локальные алерты на экранах.

## Модалки / шиты

- Бронь и промо используют модальные панели и кастомные жесты (`DraggableWheelSheet` и др.); важна координация с `Keyboard` / safe area.

## Уведомления

- `TodayBookingNotificationSync`, `BookingNotificationListener` — согласование планов напоминаний с бронями.
- `VisitFeedbackProvider` — сценарий отзыва после визита.

См. также: [user-flows.md](user-flows.md), [../modules/architecture.md](../modules/architecture.md).
