# Инструкция: работа с API iCafe Cloud в проекте bbplay

Официальная спецификация: [dev.icafecloud.com/docs](https://dev.icafecloud.com/docs/). База для вызовов из браузера в доке: `https://api.icafecloud.com`.

В приложении используются **два базовых URL** (см. `.env.example`):

| Переменная | Назначение |
|------------|------------|
| **`EXPO_PUBLIC_API_BASE_URL`** | Шлюз BlackBears (vibe): логин, клубы, схема залов, прайсы, слоты, **POST /booking**, списки броней и т.д. Отмена в приложении — **iCafe Cloud `DELETE /api/v2/cafe/{cafeId}/bookings`** (см. §3.3). |
| **`EXPO_PUBLIC_ICAFE_API_BASE_URL`** | Прямые или проксируемые пути в стиле iCafe v2: регистрация, SMS, verify, участники, баланс, пополнение, профиль. Если не задан — часто подставляется тот же хост, что и у vibe. |
| **`EXPO_PUBLIC_ICAFE_CLOUD_API_KEY`** | Только для хоста **`*.icafecloud.com`**: по [официальной доке](https://dev.icafecloud.com/docs/) методы с «requires authentication» ожидают **`Authorization: Bearer {YOUR_AUTH_KEY}`**, где ключ берётся из **лицензии iCafe Cloud**, а не из ответа **`POST /login`** на vibe. Мобильное приложение в обычной схеме ходит на прокси BlackBears с Bearer сессии — этот ключ не задаётся. |

Ответы обычно в виде `{ "code": 0, "message": "...", "data": ... }`. Успех: `code === 0` (на части прокси встречаются и другие коды успеха — см. `icafeClient.ts` → `isIcafeProxySuccess`).

---

## 1. Авторизация в vibe

- **`POST /login`** — JSON с `username` и `password`.
- Сессия: заголовки **`Authorization: Bearer`** и при необходимости **`Cookie`** (см. `vibeClient.ts`, `AuthContext.tsx`).

Дальнейшие вызовы к vibe (брони, отмена, списки) идут с этими заголовками.

---

## 2. Регистрация и SMS (iCafe base)

Последовательность реализована в `src/api/registrationApi.ts` и экранах `RegisterScreen` / `RegisterVerifyScreen`.

### 2.1. Создание участника

`POST {icafeBase}/api/v2/cafe/{cafeId}/members`

Тело: `member_account`, имена, `member_email`, `member_birthday` (YYYY-MM-DD), `member_phone`, пароль, `member_confirm` — как в доке iCafe.

В ответе нужны `member_id` и **`private_key`** (для шага verify).

### 2.2. Запрос SMS-кода

Пути в доке и у разных прокси различаются:

- канонический вариант из документации: **`request-sms`**
- часто встречается: **`requestsms`** (без дефиса)

**Поведение клиента:** сначала запрос на первый путь из списка кандидатов; при **HTTP 404** выполняется повтор на следующий путь.

Порядок кандидатов (`requestSmsPathCandidates()`):

1. Если задан **`EXPO_PUBLIC_REQUEST_SMS_PATH`** — он первый, затем оба канонических варианта, кроме дубликата.
2. Иначе: **`request-sms`**, затем **`requestsms`**.

Тело запроса:

- по умолчанию: **`{ member_id, member_phone }`** (совместимо с большинством развёрнутых прокси);
- только **`{ member_id }`**, как в минимальной доке: **`EXPO_PUBLIC_REQUEST_SMS_INCLUDE_PHONE=0`** (или `false`).

### 2.3. Проверка кода

`POST {icafeBase}/verify` — JSON: `member_id`, `encoded_data`, `code`, `rand_key`, **`key`**.

**`key`** = MD5(`member_id` + `rand_key` + `private_key` + секрет). Секрет: **`EXPO_PUBLIC_VERIFY_SIGN_SECRET`** или `app.config.js` → `contestSignSecret` (см. `verifyKey.ts`).

---

## 3. Бронирование и отмена (vibe)

### 3.1. Данные для UI

- `GET /cafes`, `GET /struct-rooms-icafe`, `GET /all-prices-icafe`, `GET /available-pcs-for-booking` — см. `bookingFlowApi` в `src/api/endpoints.ts`.
- `GET` истории броней — путь из **`EXPO_PUBLIC_ALL_BOOKS_PATH`** / `extra.allBooksPath` (`src/config/vibePaths.ts`).

### 3.2. Создание брони

`POST /booking` (JSON) — подпись **`key`** в `bookingKey.ts`, режим **`EXPO_PUBLIC_BOOKING_KEY_MODE`**, секрет **`EXPO_PUBLIC_BOOKING_SIGN_SECRET`** / contest secret.

**Несколько ПК:** `POST /booking-batch` на vibe (`vibePostJsonBookingBatch`) — см. `bookingFlowApi.createBookingBatch`. При ошибке шлюза приложение откатывается на несколько вызовов `POST /booking`.

### 3.2.1. Онлайн-занятость на схеме

`GET /api/v2/cafe/{cafeId}/pcs` — занятость **сейчас** (не путать с прогнозом слота из `available-pcs-for-booking`). В UI: `useLivePcsQuery`, подсветка «в работе сейчас» на чипах (`pcLiveBusy`).

### 3.2.2. Сессия на ПК

`GET /api/v2/cafe/{cafeId}/memberPcStatus?member_id=…` — баннер «сейчас вы на ПК …» (`fetchMemberPcSessionInfo`). Продление сессии зависит от политики клуба и не всегда доступно через API.

### 3.3. Отмена брони

**В клиенте bbplay:** `DELETE {apiBase}/api/v2/cafe/{cafeId}/bookings` с телом JSON `{ pc_name, member_offer_id }` и **`Authorization: Bearer`** (см. [iCafe Cloud — Delete booking](https://dev.icafecloud.com/docs/)), реализация — `vibeDeleteIcafeBookings` в `src/api/vibeClient.ts`.

На части развёртываний шлюз **не пропускает** устаревший **`POST /booking-cancel`** (form + MD5 `key`) — ответ «Api not allowed»; прямой метод iCafe v2 выше обычно доступен. Функция **`buildCancelBookingKey`** в `bookingKey.ts` оставлена для совместимости со старыми прокси/скриптами, но **основной путь приложения** — DELETE.

В UI кнопка «Отменить»: **`TodaysBookingBanner`**, экран бронирования (после успеха список обновляется через React Query).

---

## 4. Остальные вызовы iCafe v2

Баланс, `memberSelf`, `PUT` профиля, topup, история сессий и т.д. — см. `memberProfileApi.ts`, `memberMoneyApi.ts`, `profileInsightsApi.ts`, `icafeMemberBalance.ts`. Часть путей может быть отключена на прокси (**«Api not allowed»**) — это настройка сервера.

---

## 5. Чек-лист при смене бэкенда

1. Совпадение секретов для **verify** и **booking** с сервером (отмена через DELETE v2 подписью MD5 не пользуется).
2. **`EXPO_PUBLIC_ICAFE_API_BASE_URL`** и **`EXPO_PUBLIC_API_BASE_URL`** указывают на нужные хосты.
3. SMS: при 404 на одном пути клиент сам пробует второй; при необходимости задайте **`EXPO_PUBLIC_REQUEST_SMS_PATH`** явно.
4. Если SMS требует только `member_id` — **`EXPO_PUBLIC_REQUEST_SMS_INCLUDE_PHONE=0`**.
5. История броней: **`EXPO_PUBLIC_ALL_BOOKS_PATH`** согласована с бэкендом.

---

## Связанные файлы в репозитории

| Файл | Роль |
|------|------|
| `src/api/icafeClient.ts` | База URL iCafe, POST/GET с прокси-ответами |
| `src/api/vibeClient.ts` | База vibe, логин, GET, form, POST booking |
| `src/api/registrationApi.ts` | Регистрация, SMS с fallback путей, verify |
| `src/api/endpoints.ts` | `bookingFlowApi`, `cafesApi` |
| `docs/api-spec.md` | Краткая сводка vibe + ссылки на эту инструкцию |
