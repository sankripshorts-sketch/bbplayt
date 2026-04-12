# Живые тесты API (`tests/api-live`)

Запускают реальные HTTP-запросы к серверам из `.env`. **Один тест Vitest = один сценарий API** (см. `apiLive.spec.ts`). Для каждого сценария создаётся папка:

`artifacts/<slug>/`

| Файл | Содержимое |
|------|------------|
| `01-request.json` | Что ушло на сервер (URL, метод, заголовки с маскировкой `Authorization`/`Cookie`, тело). |
| `02-response.json` | Ответы HTTP (`http.exchanges`) и разобранное значение, которое вернула функция приложения (`parsedReturn`). |
| `03-feedback.md` | Вердикт: **работает** / **не работает** и краткий комментарий. |

После всего прогона: **`artifacts/SUITE_SUMMARY.md`** — сводка по сценариям и **полный список каждого HTTP-запроса** (метод, путь, статус); то же дублируется **крупным блоком в консоль**.

Сценарий **`random-flow-get-bundle`** — один параллельный набор GET (available + struct + prices + live pcs + memberPcStatus) со **случайными** датой/временем/длительностью.

## Запуск

```bash
npm run test:api
```

Рекомендуется с подробным логом тестов:

```bash
npm run test:api -- --reporter=verbose
```

После **каждого** сценария в **stdout** печатается блок: заголовок, **зачем нужен метод** (см. `scenarioDescriptions.ts`), затем **каждый HTTP-обмен** в порядке вызова: `METHOD путь → HTTP статус` и краткая строка из тела ответа (`message`, `error` и т.д.). Так видно, например, что в `icafe-load-member-profile` сначала уходит `GET .../memberSelf`, при отказе — второй запрос `GET .../members?search_field=member_account&...`.

Нужен Node 18+ (встроенный `fetch`). Переменные читаются из `.env` / `.env.local` в корне проекта (см. `vitest.setup.ts`).

### Обязательно

- `EXPO_PUBLIC_API_BASE_URL` — хост vibe (например `https://vibe.blackbearsplay.ru`).
- `TEST_USERNAME`, `TEST_PASSWORD` — учётная запись для `POST /login` и последующих вызовов с сессией.

### Опционально

- `EXPO_PUBLIC_ICAFE_API_BASE_URL` — если iCafe-прокси на другом хосте (иначе как в приложении берётся тот же базовый URL).
- `EXPO_PUBLIC_INSIGHTS_USE_ICAFE_CLOUD_PATHS=1` — пути как в [доке iCafe Cloud](https://dev.icafecloud.com/docs/) (`…/members/{id}/balanceHistory` и т.д.).
- `EXPO_PUBLIC_ICAFE_CLOUD_API_KEY` — **обязателен** для прямых запросов на `https://api.icafecloud.com/…`: заголовок `Authorization: Bearer` с **ключом из лицензии**, не с `POST /login`.
- `TEST_CAFE_ID` — числовой iCafe id клуба; иначе берётся первый клуб из `GET /cafes`.
- `TEST_BOOKING_DATE`, `TEST_BOOKING_TIME`, `TEST_BOOKING_MINS` — параметры для `available-pcs-for-booking` (по умолчанию завтра, 12:00, 60 мин).
- `TEST_TOPUP_VALUE_RUB` — сумма пополнения в сценарии topup (по умолчанию 100).

### Опасные / отключённые по умолчанию

- `TEST_ENABLE_TOPUP_FLOW=1` — два сценария: **memberMoney-topup-with-bonus** (`fetchBonus` → `memberTopupWithFetchBonusFlow`) и **memberMoney-topup-without-bonus** (только `memberTopupFlow`). Оба меняют баланс.
- `TEST_ENABLE_REGISTRATION=1` и `TEST_REGISTER_CAFE_ID`, при необходимости `TEST_REGISTER_PHONE` — создание нового участника (мусор в базе).

Артефакты в `artifacts/` не коммитятся (см. корневой `.gitignore`).

## Поведение при ошибках

- Переменные окружения подхватываются в `vitest.setup.ts` из `.env` и `.env.local` в корне проекта.
- Сценарий **`vibe-post-login`** пишет артефакты и при неуспешном логине (в `03-feedback.md` будет **не работает**).
- Если логин не прошёл, переменная `ctx` не заполняется — **остальные тесты завершатся ошибкой** («нужен успешный vibe-post-login»). Исправьте учётные данные и перезапустите.

## Что не включено по умолчанию

- `POST /booking` и `POST /booking-cancel` (создание/отмена брони) — меняют данные; при необходимости добавьте отдельные сценарии с флагом вроде `TEST_ENABLE_BOOKING=1`.
- `POST requestsms` / `verify` (SMS) — нужны реальный телефон и код; не автоматизированы здесь.
- Покрыты основные функции из `endpoints.ts`, `icafeMemberBalance`, `icafeLivePcs`, `memberProfileApi`, `profileInsightsApi`, `memberMoneyApi` (частично), опционально `registrationApi.createMember`.
