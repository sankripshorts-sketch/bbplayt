# Аккаунт и сессия

## Роль

После успешного логина `AuthContext` хранит данные, необходимые для `Authorization: Bearer` и для подписи запросов (в т.ч. брони). Реализация: `src/auth/AuthContext.tsx`, `src/auth/sessionTypes.ts`, `src/auth/sessionStorage.ts` (SecureStore).

## Поток (упрощённо)

1. Пользователь вводит учётные данные на экране входа / регистрации (`features/auth/`).
2. Клиент вызывает API vibe/iCafe (см. `vibeClient`, `registrationApi` и т.д.).
3. В сессии сохраняются токен(ы), `member_id`, при необходимости `private_key` и прочие поля ответа.
4. Интерцепторы/обёртки API подставляют заголовок и тело.
5. Логаут очищает сессию и сбрасывает релевантные query.

## Верификация SMS

Пути `request-sms` / `requestsms` и состав тела настраиваются `EXPO_PUBLIC_REQUEST_SMS_*`. Подписи verify — `EXPO_PUBLIC_VERIFY_SIGN_SECRET` (должны совпадать с бэкендом).

## Безопасность

- Не логируйте полные токены в проде.
- SecureStore — предпочтительное место для чувствительных полей; не дублируйте их в обычном AsyncStorage без необходимости.

См. также: [api-and-backend.md](api-and-backend.md), [security.md](security.md).
