# API и бэкенд

## Слой клиента

| Модуль | Назначение |
|--------|------------|
| `src/api/vibeClient.ts` | Основной HTTP к прокси BlackBears / vibe |
| `src/api/icafeClient.ts` | Пути iCafe v2 (cafe, members, брони, баланс, …) |
| `src/api/client.ts` | Общий `ApiError`, разбор ответов |
| `src/api/endpoints.ts` / `vibePaths` | Сборка URL |
| `src/api/*Api.ts` | Узкие модули: профиль, брони, ПК, цены, инсайты |
| `src/api/bookingKey.ts` / `bookingSignConfig` | Подпись POST брони |
| `src/config/` | URL, пути, режимы подписи, оффсеты зала |

## Где читать контракты

В корне `docs/` репозитория:

- [`api-spec.md`](../../api-spec.md)
- [`icafe-api.md`](../../icafe-api.md)
- [`API_VIBE_LOGIC.md`](../../API_VIBE_LOGIC.md)

## Типовые ответы прокси

- **200 + JSON** — данные; клиенты нормализуют в типы/флаги.
- **403 / «Api not allowed»** — путь не открыт для данного токена на шлюзе; чинится на **сервере**, а не в приложении. См. комментарии в [`.env.example`](../../../.env.example).
- **Ошибка брони** — неверная подпись, время, ПК, конфликт; сообщение пользователю из тела/маппинга `ApiError`.

## iCafe Cloud напрямую

Возможен режим с `EXPO_PUBLIC_ICAFE_API_BASE_URL` и ключом лицензии — редко; основной сценарий — **vibe-прокси** с `Authorization: Bearer` после логина.

## Что приложение **не** делает

- Не ходит в облачные LLM за чатом поддержки.
- Не хранит бизнес-логику ценообразования брони — только отображение и ввод по правилам API.

См. также: [account-login.md](account-login.md), [../modules/architecture.md](../modules/architecture.md).
