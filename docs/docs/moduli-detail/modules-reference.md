# Справочник кода (оглавлением)

Полного автоматического перечисления каждой функции (как в крупных Python-пакетах) здесь **нет** — держим поддерживаемый **индекс** по зонам. Точка входа: репозиторий `src/`.

## Корень

| Путь | Роль |
|------|------|
| [`App.tsx`](../../../App.tsx) (корень репо) | Провайдеры, `PersistQueryClient`, splash, шрифты |
| [`app.config.js`](../../../app.config.js) | Expo, `extra`, EAS, deep link |

## `src/api/`

| Файл (примеры) | Назначение |
|----------------|------------|
| `vibeClient.ts` | Базовый fetch к vibe |
| `icafeClient.ts` | iCafe v2 пути |
| `client.ts` | `ApiError` |
| `endpoints.ts` | Хелперы URL |
| `cafeBookingProducts.ts` | Тарифы/продукты |
| `icafeCafeBookings.ts` | Брони клуба |
| `icafeLivePcs.ts` | Живые ПК |
| `icafeMemberBalance.ts` | Баланс |
| `memberProfileApi.ts` / `memberMoneyApi.ts` / `memberPcStatusApi.ts` | Профиль, деньги, статусы |
| `normalize*.ts` | Парсинг ответов |
| `bookingKey.ts`, `md5Utf8.ts`, `verifyKey.ts` | Подписи |
| `types.ts` | Общие типы ответов |

## `src/auth/`

- `AuthContext.tsx` — сессия, login/logout.
- `sessionStorage.ts` — SecureStore.
- `sessionTypes.ts` — форма сессии.

## `src/navigation/`

| Файл | Назначение |
|------|------------|
| `RootNavigator.tsx` | `NavigationContainer`, main tabs, `linking` (`bbplay://`), обёртки `VisitFeedbackProvider` / sync уведомлений, bootstrap |
| `AuthNavigator.tsx` | Стек до входа (логин, регистрация, …) |
| `ProfileStack.tsx` | Вложенный стек таба `Profile` |
| `ProfileStack` / `MainTab` типы | `navigation/types.ts` — `ProfileStackParamList`, `MainTabParamList`, `BookingPrefillParams` |
| `TodayBookingNotificationSync.tsx` | Согласование локальных напоминаний с бронями |
| `BookingNotificationListener.tsx` | Обработка входящих уведомлений, навигация |
| `navigationRef.ts` | Ref `NavigationContainer` для императивной навигации извне дерева экранов |

**Параметры таба `Booking`:** `Booking | { prefill?: BookingPrefillParams }` — префилл из диплинка / «мои брони».

## `src/query/`

- `queryClient.ts` — React Query, персист, опции.
- `useAppBootstrap.ts` — стартовая подгрузка.
- `queryKeys.ts` — фабрика ключей.

## `src/features/booking/`

- `BookingScreen.tsx` — основной UX брони (крупный модуль).
- `use*Query` / `use*Mutation` — данные.
- `bookingTimeUtils.ts`, `zoneTariffResolve.ts`, `pcZoneKind.ts` — правила.
- `ClubLayoutCanvas` не здесь: см. `features/cafes/`.

## `src/features/cafes/`

- `CafesScreen.tsx`, `ClubLayoutCanvas.tsx`, `HallMapPanel.tsx` — список и схема.
- `mapLinks.ts` — внешние ссылки.

## `src/features/auth/`, `profile/`, `news/`, `chat/`, `promos/`, `balance/`, `ui/`

Имена файлов в целом соответствуют экранам и хукам; крупные экраны — `*Screen.tsx`.

## `src/knowledge/`

- `KnowledgeContext.tsx` — загрузка JSON.
- `search.ts` — поиск.
- `types.ts` — структура знаний.

## `src/notifications/`, `src/calendar/`, `src/preferences/`, `src/config/`, `src/datetime/`, `src/i18n/`, `src/theme/`

См. имена файлов: доменно очевидны (например `bookingReminders.ts`, `vibePaths.ts`, `deviceCalendar.ts`).

## Тесты

- `tests/unit/` — юнит.
- `tests/api-live/` — интеграция с сетью.

---

При добавлении **новой фичи** с несколькими файлами: расширьте [../modules-map.md](../modules-map.md) и, при уникальности, одну строку в таблицу выше.
