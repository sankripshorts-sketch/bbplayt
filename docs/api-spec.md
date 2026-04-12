# API BlackBears Play (vibe + iCafe)

**Полная инструкция по iCafe и переменным окружения:** [`docs/icafe-api.md`](./icafe-api.md).

Источник: документ «методы API», iCafe Cloud ([документация](https://dev.icafecloud.com/docs/)), хост **`https://vibe.blackbearsplay.ru`**.

Все ответы в формате:

```json
{ "code": 0, "message": "Success", "data": ... }
```

`code === 0` — успех. Иные коды — ошибка (часто HTTP всё ещё 200). См. таблицу кодов в исходном документе (419 Empty mins, 416 Empty cafeId, 600 Booking is occupied и т.д.).

## Базовый URL

Переменная **`EXPO_PUBLIC_API_BASE_URL`** (по умолчанию `https://vibe.blackbearsplay.ru`).

## Авторизация

`POST /login` — JSON `{ "username": "...", "password": "..." }` (как в приложении; при несовпадении с бэкендом можно переключить на form в `vibeClient.ts`).

Сохраняются: поля из `data`, при необходимости `Authorization: Bearer` и/или заголовок `Cookie` из `Set-Cookie`.

## Эндпоинты vibe.blackbearsplay.ru

| Метод | Путь | Назначение |
|--------|------|--------------|
| GET | `/cafes` | Список клубов `address`, `icafe_id` |
| GET | `/available-pcs-for-booking` | Параметры: `cafeId`, `dateStart`, `timeStart`, `mins`, опц. `isFindWindow`, `priceName` |
| GET | `/struct-rooms-icafe` | `cafeId` — схема залов |
| GET | `/all-prices-icafe` | `cafeId`, опц. `memberId`, `mins`, `bookingDate` |
| POST | `/booking` | JSON: `icafe_id`, `pc_name`, `member_account`, `member_id`, `start_date`, `start_time`, `mins`, `rand_key`, `key`; для **пакета** опц. `product_id`. Почасовка без `price_id` (шлюз подбирает тариф) |
| DELETE | `/api/v2/cafe/{cafeId}/bookings` | JSON: `pc_name`, `member_offer_id`, Bearer — отмена брони (iCafe Cloud; см. `vibeDeleteIcafeBookings`). Старый `POST /booking-cancel` на шлюзе может быть отключён |
| GET | `/all-books-cafes` | опц. `memberAccount` (на сервере путь `/all-books-member` может быть отключён) |
| GET | `/icafe-id-for-member` | iCafe id для операций с клиентом |

### QA: путь истории броней (`GET` all-books)

Клиент берёт путь из **`EXPO_PUBLIC_ALL_BOOKS_PATH`** или `app.config.js` → `extra.allBooksPath` (см. [`src/config/vibePaths.ts`](../src/config/vibePaths.ts)). Перед релизом:

1. Уточните у бэкенда актуальный endpoint (`/all-books-member` или `/all-books-cafes`).
2. Задайте переменную, перезапустите Metro/сборку с очисткой кэша при необходимости.
3. В dev-сборке в профиле показывается строка «Путь API истории броней (resolved)» — сверьте с ожидаемым.
4. Откройте «Мои брони» с аккаунтом, у которого на сервере есть брони: список должен совпадать с прямым `GET` тем же `memberAccount` (Postman/curl). При пустом ответе проверьте альтернативный путь.

Подробные примеры тел — в официальном документе конкурса.

## Подпись `key` для `/booking`

Поле `key` — MD5. В проекте: [`src/api/bookingKey.ts`](../src/api/bookingKey.ts). Если на сервере используется `MD5(rand_key + секрет)`, задайте **`EXPO_PUBLIC_BOOKING_SIGN_SECRET`**.

## Регистрация (последовательность из документа)

Реализовано в приложении: экраны **Регистрация** → **Подтверждение телефона** (`src/features/auth/`).

1. `POST {{icafeBase}}/api/v2/cafe/$cafeId/members` — тело как у iCafe (`member_account`, имена, `member_email`, `member_birthday` YYYY-MM-DD, `member_phone`, пароль, `member_confirm`).
2. Запрос SMS: сначала **`request-sms`**, при **HTTP 404** — **`requestsms`** (или наоборот, если задан **`EXPO_PUBLIC_REQUEST_SMS_PATH`**). Реализация: `src/api/registrationApi.ts` → `requestMemberSms`. Тело по умолчанию `{ member_id, member_phone }`; только `member_id`: **`EXPO_PUBLIC_REQUEST_SMS_INCLUDE_PHONE=0`**.
3. `POST {{icafeBase}}/verify` — JSON `{ member_id, encoded_data, code, rand_key, key }`, где **`key` = MD5(member_id + rand_key + private_key + секрет)`**. Секрет как **`SECRET_KEY`** в референсном Android; в проеке по умолчанию задан в **`app.config.js`** → `extra.contestSignSecret`, либо переопределите **`EXPO_PUBLIC_VERIFY_SIGN_SECRET`**. Без совпадения с бэкендом верификация SMS не проходит (часто сообщение на английском).

**Базовый URL** для шагов 1–3: **`EXPO_PUBLIC_ICAFE_API_BASE_URL`**, иначе берётся тот же, что и `EXPO_PUBLIC_API_BASE_URL` / `app.config.js` → `apiBaseUrl`.

## Пополнение баланса

Официальное описание методов iCafeCloud: [dev.icafecloud.com/docs](https://dev.icafecloud.com/docs/) (в т.ч. действия над участниками). Обзорный wiki: [icafecloud.com/wiki.htm](https://www.icafecloud.com/wiki.htm).

**В приложении:** пользователь вводит **любую сумму** в ₽; в теле уходит `topup_value`. В официальном iCafe Cloud в `topup_ids` — **member id** участника (`memberMoneyApi.ts`, по умолчанию). Режим прокси с каталогом (в `topup_ids` — `product_id` из `GET /all-prices-icafe`): **`EXPO_PUBLIC_TOPUP_IDS_USE_PRODUCT_ID=1`**.

**Внешняя оплата:** ссылка «Страница оплаты в браузере» в модалке ведёт на URL из **`EXPO_PUBLIC_TOP_UP_URL`** / `app.config.js` → `topUpUrl` (по умолчанию `https://bbgms.link/bbplay/ru`).
