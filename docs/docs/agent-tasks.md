# Таски для агента: `bbplay`

Контекст: [`moduli-detail/technical-spec.md`](moduli-detail/technical-spec.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md). Файл — **подсказка** для бэклога; наполняйте реальными задачами в команде. Принципы: маленькие diff, соглашения из существующего кода, без лишних рефакторингов.

## Как работать

1. Перед таском: прочитать связанные файлы в `src/`, [`docs/api-spec.md`](../api-spec.md) при смене контракта.
2. После: при изменении публичного поведения — одна запись в [`moduli-detail/modules-reference.md`](moduli-detail/modules-reference.md) или в соответствующем разделе [`docs/docs/submoduli/`](submoduli/README.md).
3. Тесты: `npm run lint`, при затрагивании API — `npm run test:api` (нужен доступ к бэкенду).
4. Секреты в git не класть; `EXPO_PUBLIC_*` согласовать с бэкендом.

## Примеры направлений (заполняйте P0/P1 сами)

| ID | Тема | Намёк на файлы |
|----|------|----------------|
| T-x | Синхронизация брони с уведомлениями | `src/navigation/TodayBookingNotificationSync.tsx`, `src/notifications/bookingReminders.ts` |
| T-x | Ошибка API на экране брони | `src/features/booking/`, `src/api/`, i18n |
| T-x | Схема зала: оффсеты для нового клуба | `EXPO_PUBLIC_HALL_MAP_*`, `features/cafes/` |
| T-x | Обновить `modules-map.md` при новом каталоге в `src/features/` | `docs/docs/modules-map.md` |

Старый бэклог из **telegram-bot** в этом файле **не** используется.

Оглавление: [`README.md`](README.md).
