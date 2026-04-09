# API BlackBears Play (vibe + iCafe)

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
| POST | `/booking` | form: `icafe_id`, `pc_name`, `member_account`, `member_id`, `start_date`, `start_time`, `mins`, `rand_key`, `key` |
| GET | `/all-books-cafes` | опц. `memberAccount` (на сервере путь `/all-books-member` может быть отключён) |
| GET | `/icafe-id-for-member` | iCafe id для операций с клиентом |

Подробные примеры тел — в официальном документе конкурса.

## Подпись `key` для `/booking`

Поле `key` — MD5. В проекте: [`src/api/bookingKey.ts`](../src/api/bookingKey.ts). Если на сервере используется `MD5(rand_key + секрет)`, задайте **`EXPO_PUBLIC_BOOKING_SIGN_SECRET`**.

## Регистрация (последовательность из документа)

Реализовано в приложении: экраны **Регистрация** → **Подтверждение телефона** (`src/features/auth/`).

1. `POST {{icafeBase}}/api/v2/cafe/$cafeId/members` — тело как у iCafe (`member_account`, имена, `member_email`, `member_birthday` YYYY-MM-DD, `member_phone`, пароль, `member_confirm`).
2. `POST {{icafeBase}}/requestsms` — JSON `{ member_id, member_phone }` (как в референсном Android). Если у вас путь `request-sms`, задайте **`EXPO_PUBLIC_REQUEST_SMS_PATH=request-sms`**.
3. `POST {{icafeBase}}/verify` — JSON `{ member_id, encoded_data, code, rand_key, key }`, где **`key` = MD5(member_id + rand_key + private_key + секрет)`**. Секрет задаётся **`EXPO_PUBLIC_VERIFY_SIGN_SECRET`** (аналог `SECRET_KEY` в референсном клиенте). Без него подпись может не совпасть с бэкендом.

**Базовый URL** для шагов 1–3: **`EXPO_PUBLIC_ICAFE_API_BASE_URL`**, иначе берётся тот же, что и `EXPO_PUBLIC_API_BASE_URL` / `app.config.js` → `apiBaseUrl`.

## Пополнение баланса

В профиле: **WebView** с URL из **`EXPO_PUBLIC_TOP_UP_URL`** / `app.config.js` → `topUpUrl` (по умолчанию `https://bbgms.link/bbplay/ru`), плюс кнопка «Открыть в браузере».
