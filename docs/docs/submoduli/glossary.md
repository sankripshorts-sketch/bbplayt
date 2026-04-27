# Глоссарий

| Термин | Значение в bbplay |
|--------|-------------------|
| **Vibe** | Прикладной HTTP-слой BlackBears: хост/путь из `EXPO_PUBLIC_API_BASE_URL` и модулей `vibeClient` / `vibePaths` |
| **iCafe (Cloud / v2)** | API клубного ПО: кафе, members, сессии, брони. Клиент ходит через **прокси** или, редко, **напрямую** к Cloud |
| **Member** | Учётная запись в системе iCafe после логина; в сессии — `member_id`, часто `private_key`, идентификаторы кафе |
| **private_key** | Ключ сессии для подписи части запросов (в т.ч. режим `android` в брони) — не путать с «паролем» пользователя |
| **Proxy / прокси** | Сервер BlackBears перед iCafe: маршрутизация, проверка токена, **список разрешённых путей** (отсюда 403) |
| **Сессия приложения** | `AuthContext` + `SecureStore`: access-токен, member-поля, флаги после логина |
| **React Query (RQ)** | Кэш и фоновые refetch HTTP-списков; defaults в `queryClient.ts` |
| **Персист RQ** | Сохранение **части** кэша в `AsyncStorage` (ключи `cafes`, `struct-rooms`, `vk-wall`) — не полный офлайн |
| **База знаний** | JSON для чата: структура в `knowledge/`, исходник — `assets/knowledge.json` и/или `knowledgeJsonUrl` |
| **Deep link** | URL-схема `bbplay://` (см. `app.config.js` `scheme` и `linking` в `RootNavigator`) |
| **EAS** | Expo Application Services — `eas build`, секреты сборки, артефакты APK/AAB/IPA |
| **Expo Go** | Универсальное приложение из стора с Expo SDK; не все пуши/нативные вещи 1:1 с standalone |
| **Dev client** | Сборка с нативным `expo-dev-client` для длительной отладки с плагинами |
| **Подпись брони** | MD5 от набора полей + секрет(ы) по режиму `BOOKING_KEY_MODE` — совпадение с бэком обязательно |
| **structRooms** (условно) | Данные о зонах/координатах для **схемы зала**; подгонка визуализации — env `HALL_MAP_*` |

См. также: [../modules-map.md](../modules-map.md), [api-and-backend.md](api-and-backend.md), [../ARCHITECTURE.md](../ARCHITECTURE.md).
