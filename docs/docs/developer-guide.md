# Подробный путеводитель разработчика

Дополняет [submoduli/run.md](submoduli/run.md) и [submoduli/configuration.md](submoduli/configuration.md): **куда лезть** при конкретных задачах, без дублирования всей архитектуры (см. [modules/architecture.md](modules/architecture.md)).

## 1. Изменить тексты в интерфейсе

- **Перевод / язык UI:** `src/i18n/messagesRu.ts`, `messagesEn.ts` — ключи `t('...')` из `useLocale()`.
- **Системные подписи** (разрешения): `app.config.js` (например тексты `expo-location`, `expo-calendar`).

## 2. Тема, цвета, шрифты

- **Палитра / тёмная тема:** `src/theme/` — `ThemeContext`, цвета через `useThemeColors()`.
- **Шрифты:** `src/theme/appFonts.ts`, загрузка в `useAppFonts()` (см. `App.tsx` и `expo-font`).
- **Типовые стили сетки:** `src/theme/layoutTokens.ts`, `normalizeDinTextStyle`.

## 3. Добавить поле в запрос к API

1. Найдите существующий вызов в `src/api/` (или добавьте функцию рядом с близким сценарием).
2. Базовый транспорт: `vibeClient` / `icafeClient` + разбор в `client.ts` (`ApiError`).
3. Подключите в экране через `useQuery` / `useMutation` и **ключ** из `src/query/queryKeys.ts` (при списковых данных).
4. Если ответ **нормализуется** в отдельный файл — обновите типы в `src/api/types.ts` при необходимости.
5. Документируйте новый path в [api-spec.md](../api-spec.md) **на стороне контракта** (если меняется публичный API), не в коде.

## 4. Бронирование: что трогать

| Задача | Куда смотреть |
|--------|----------------|
| Подпись, режим `android` / `rand_secret` | `src/api/bookingKey.ts`, `src/config/bookingSignConfig.ts`, `EXPO_PUBLIC_*` в `.env.example` |
| Экран и UX (дата, зона, ПК) | `src/features/booking/BookingScreen.tsx` и соседние хуки `use*Query` / `use*Mutation` |
| Время / МСК / окна | `src/datetime/`, `src/features/booking/bookingTimeUtils.ts` |
| Схема зала | `src/features/cafes/ClubLayoutCanvas.tsx`, `HallMapPanel`, ENV `HALL_MAP_*` |
| Список броней пользователя | `useMemberBooksQuery` и путь `allBooksPath` в `app.config` `extra` |

## 5. Навигация и диплинки

- **Корневой навигатор:** `src/navigation/RootNavigator.tsx` — табы, `unmountOnBlur`, линкинг.
- **Профиль (стек):** `ProfileStack.tsx`, типы — `ProfileStackParamList` в `types.ts`.
- **Префилл брони извне:** таб `Booking` с параметром `prefill` (`BookingPrefillParams` в `types.ts`).
- **Схема URL:** `bbplay://` — фрагменты в `linking` внутри `RootNavigator.tsx`.

## 6. Уведомления

- **Напоминания о брони:** `src/notifications/bookingReminders.ts`, синк с `TodayBookingNotificationSync.tsx`.
- **Отзыв после визита:** `VisitFeedbackContext`, `visitFeedbackStorage.ts`.

## 7. Патч npm-пакета

1. Меняете файл в `node_modules/…`.
2. `npx patch-package <package-name>`.
3. Патч коммитится в `patches/`, при `npm install` применяется снова (`postinstall`).

## 8. Проверка перед PR

- `npm run lint` — TypeScript.
- `npm run test:unit` — обязателен, если трогали чистую логику.
- Ручной прогон: логин → клубы → бронь (стейдж), если менялись API или сессия.

## 9. Где «истина» для URL и секретов подписи

- **Сборка:** `app.config.js` читает `process.env.EXPO_PUBLIC_*` на этапе конфига; часть в `extra` (см. [configuration.md](submoduli/configuration.md)).
- **В рантайме** для некоторых значений — также `expo-constants` `Constants.expoConfig?.extra` (см. использование в `src/config/`).

См. также: [moduli-detail/modules-reference.md](moduli-detail/modules-reference.md), [modules-map.md](modules-map.md).
