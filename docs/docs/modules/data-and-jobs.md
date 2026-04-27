# Данные, кэш и фоновая логика

В отличие от сервера с очередями, в **bbplay** нет воркера в классическом смысле. «Фон» — это **таймеры уведомлений**, **синхронизация с React Query** и **системные API** (календарь, пуши).

## React Query

Файл: `src/query/queryClient.ts`.

| Параметр | Смысл |
|----------|--------|
| `staleTime` / `gcTime` | Актуальность и время жизни кэша |
| `refetchOnWindowFocus: false` | На RN уменьшает лишние refetch при клавиатуре/фокусе |
| `retry` / `retryDelay` | Поведение при сетевых сбоях |

## Персист кэша

`PersistQueryClientProvider` + `createAsyncStoragePersister` (ключ `bbplay.react-query.v1`).

**Дегидратация** только для ключей, у которых первый сегмент:

- `cafes`
- `struct-rooms`
- `vk-wall`

Остальные запросы при перезапуске снова тянутся с сети. Срок `maxAge` — 7 дней (см. константы в `queryClient.ts`).

## Сессия и секреты

| Хранилище | Назначение |
|-----------|------------|
| `expo-secure-store` | Сессия, чувствительные поля (`sessionStorage.ts`) |
| `AsyncStorage` | Персист React Query, настройки/лайки и др. не-SecretStore сценарии |

## Локальные JSON и ассеты

- **База знаний** — `assets/knowledge.json` и/или URL из `extra.knowledgeJsonUrl` в `app.config.js`.
- **Каталоги промо/еды** — TypeScript-данные в `features/` по мере фичи.

## Уведомления и календарь

- `src/notifications/` — планирование напоминаний о брони, обработка отзыва после визита.
- `src/calendar/deviceCalendar.ts` — по желанию пользователя: событие в календаре устройства.

## Геолокация

`expo-location` — сортировка клубов по расстоянию; координаты не заменяют данные с API.

См. также: [architecture.md](architecture.md), [../submoduli/security.md](../submoduli/security.md).
