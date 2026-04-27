# Карта каталога `src/`

Корень клиента: `bbplay/src/`. Ниже — **функциональные области**; полный перечень файлов не дублируется (см. [moduli-detail/modules-reference.md](moduli-detail/modules-reference.md)).

## Нижние вкладки (основное приложение)

После входа `RootNavigator` показывает **bottom tabs** (`createBottomTabNavigator`). Порядок и имена в коде (`MainTabParamList`):

| Имя таба (код) | Экран | Файл(ы) |
|----------------|--------|---------|
| `Profile` | Стек профиля: домой, новости, настройки, баланс, инсайты | `navigation/ProfileStack.tsx`, `features/profile/*`, `features/news/*` |
| `Cafes` | Клубы | `features/cafes/CafesScreen.tsx` |
| `Food` | Еда | `features/food/FoodScreen.tsx` + `FoodContext` |
| `Booking` | Бронирование | `features/booking/BookingScreen.tsx` |
| `Chat` | Помощь (база знаний) | `features/chat/KnowledgeChatScreen.tsx` |

Особенности: у части табов `unmountOnBlur: true` (снимок экрана сбрасывается при уходе); у **Booking** и **Chat** — `unmountOnBlur: false` (см. `RootNavigator.tsx`).

## Стек профиля (вложенный)

Типы: `ProfileStackParamList` в `navigation/types.ts`. Примеры экранов:

`ProfileHome`, `News`, `Settings`, `SettingsCity`, `SettingsAppearance`, `SettingsBookingReminders`, `EditProfile`, `BalanceHistory`, `GameSessions`, `CustomerAnalysis`, `Ranking`.

## Deep linking (`bbplay://`)

Конфиг в `RootNavigator.tsx` (`linking.config`):

| Путь | Куда ведёт |
|------|------------|
| `bbplay://profile` | Профиль, корень стека |
| `bbplay://profile/news` | Новости внутри профиля |
| `bbplay://cafes` | Клубы |
| `bbplay://food` | Еда |
| `bbplay://booking` | Бронь (доп. параметры префилла см. `Booking` в `types.ts`) |
| `bbplay://chat` | Чат помощи |

Точная вложенность и query-параметры — по актуальной версии `linking` в репозитории.

## Таблица каталогов `src/`

| Каталог / зона | Кратко |
|----------------|--------|
| `api/` | HTTP к vibe/iCafe: `vibeClient`, `icafeClient`, `client` (`ApiError`), нормализаторы, подписи брони |
| `auth/` | `AuthContext`, `sessionStorage` (SecureStore), типы сессии |
| `calendar/` | Запись брони в календарь устройства |
| `components/` | `AppErrorBoundary`, поля ввода, типографика |
| `config/` | URL, пути API, подписи, оффсеты схемы зала |
| `datetime/` | Время брони, МСК, серверные часы |
| `features/auth/` | Логин, регистрация |
| `features/balance/` | Пополнение, каталоги цен |
| `features/booking/` | Бронь: экран, тарифы, живые ПК, баннер «сегодня», отмена |
| `features/cafes/` | Список клубов, карта зала (`ClubLayoutCanvas`, `HallMapPanel`) |
| `features/chat/` | Поиск по базе знаний (без LLM) |
| `features/food/` | Еда, `FoodProvider` |
| `features/news/` | VK, WebView, локальные лайки |
| `features/profile/` | Профиль, настройки, инсайты |
| `features/promos/` | Промо, 3D-кости |
| `features/ui/` | Скелетоны, `ClubDataLoader` |
| `hints/` | Подсказки первого запуска |
| `i18n/` | `LocaleContext`, `messagesRu` / `messagesEn` |
| `knowledge/` | `KnowledgeContext`, поиск |
| `navigation/` | Навигаторы, sync уведомлений, слушатели брони |
| `notifications/` | Напоминания, фидбэк после визита |
| `preferences/` | Город и др. |
| `query/` | React Query, персист, `useAppBootstrap`, ключи |
| `theme/` | Тема, шрифты, токены |
| `utils/` | Утилиты |

## Корень репозитория (не в `src/`)

**`App.tsx`:** шрифты, splash, `GestureHandlerRootView`, `SafeAreaProvider`, цепочка провайдеров — `Theme` → `Locale` → `PersistQueryClient` → `Auth` → `Food` → `Knowledge` → `AppErrorBoundary` → `RootNavigator`.

## Зависимости между слоями

```text
App.tsx
  → navigation/RootNavigator (табы, линкинг, уведомления)
      → features/* (экраны)
           → api/* , query/* , auth/*, knowledge/*
  → query/queryClient     ←  персист части ключей
  → api/vibeClient        ←  vibe / iCafe
  → knowledge/            ←  assets/knowledge.json | extra.knowledgeJsonUrl
```

## Данные при старте

`useAppBootstrap` (в `RootNavigator`) после готовности **auth** и **knowledge** подгружает кафе, новости, данные бронирования; пока не готово — показывается загрузка через `ClubDataLoader` / UX навигации.

См. также: [modules/architecture.md](modules/architecture.md), [modules/data-and-jobs.md](modules/data-and-jobs.md), [../ARCHITECTURE.md](../ARCHITECTURE.md), [developer-guide.md](developer-guide.md).
