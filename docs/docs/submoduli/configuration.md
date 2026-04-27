# Конфигурация

## Как попадают переменные в приложение

1. Файл **`.env`** в **корне репозитория** (рядом с `package.json`). Expo / `app.config.js` подхватывают `process.env` при **запуске Metro и при prebuild/EAS** (не перезагружайте только Hot Reload — для новых `EXPO_PUBLIC_*` нужен **рестарт Metro** или пересборка).
2. Префикс **`EXPO_PUBLIC_`** означает: значение **вшивается в клиентский JS-бандл**. Это не секреты для сервера — любой может прочитать их в APK/IPA.
3. Полный перечень с **длинными комментариями** — [`.env.example`](../../../.env.example). Держите `.env` в `.gitignore` (секреты команды не коммитить).

## Группы переменных (обзор)

| Группа | Примеры | Назначение |
|--------|---------|------------|
| API | `EXPO_PUBLIC_API_BASE_URL` | База vibe: списки, прокси iCafe, многие GET/POST |
| iCafe прямой | `EXPO_PUBLIC_ICAFE_API_BASE_URL`, `EXPO_PUBLIC_ICAFE_CLOUD_API_KEY` | Редкий режим обхода прокси к Cloud |
| Регистрация / SMS | `EXPO_PUBLIC_REQUEST_SMS_PATH`, `EXPO_PUBLIC_REQUEST_SMS_INCLUDE_PHONE` | Куда слать запрос кода, состав тела |
| Подписи | `EXPO_PUBLIC_VERIFY_SIGN_SECRET`, `EXPO_PUBLIC_BOOKING_SIGN_SECRET`, `EXPO_PUBLIC_BOOKING_KEY_MODE` | MD5 для verify и брони — **должны совпадать с сервером** |
| Бронь (тонкая настройка) | `EXPO_PUBLIC_BOOKING_LOOSE_SUCCESS`, `EXPO_PUBLIC_BOOKING_PRESERVE_PC_NAME_CASE` | Совместимость с ответами/именами ПК |
| VK / новости | `EXPO_PUBLIC_VK_GROUP_ID`, `EXPO_PUBLIC_VK_M_URL`, `EXPO_PUBLIC_VK_WALL_PROXY_TEMPLATE` | Лента, WebView, обход CORS на web |
| Схема зала | `EXPO_PUBLIC_HALL_MAP_OFFSET_*`, `EXPO_PUBLIC_HALL_MAP_CLUB_OFFSETS_JSON`, … | Подгонка канваса под конкретные клубы |
| Список броней | `EXPO_PUBLIC_ALL_BOOKS_PATH` | Путь к «все брони пользователя» (история vs короткий список) |
| Topup / баланс | `EXPO_PUBLIC_TOP_UP_URL`, `EXPO_PUBLIC_TOPUP_*`, `EXPO_PUBLIC_TOPUP_WITHOUT_BEARER` | WebView оплаты, тело `topup` / `fetchBonus` |
| Инсайты | `EXPO_PUBLIC_INSIGHTS_UI_MODE`, `EXPO_PUBLIC_INSIGHTS_USE_ICAFE_CLOUD_PATHS` | live vs заглушки, прямые пути Cloud |
| База знаний (чат) | `EXPO_PUBLIC_KNOWLEDGE_JSON_URL` (дублирует/дополняет `extra` в config) | Удалённый JSON вместо только `assets/knowledge.json` |
| Клубы | `EXPO_PUBLIC_JOB_REVIEW_URL` | Ссылка «отзыв о работе» |

Если поведение «не сходится» с бэкендом — **сначала** сверяйте **точные** пути и поля в [`api-spec.md`](../../api-spec.md), [`API_VIBE_LOGIC.md`](../../API_VIBE_LOGIC.md), не только `.env`.

## `app.config.js` и `extra`

Файл в корне репозитория экспортирует объект `ExpoConfig`. Ниже — **логические** поля `extra` (попадают в `Constants.expoConfig.extra` в рантайме, если не переопределено). Точные строки смотрите в файле.

| Ключ `extra` | Источник | Смысл |
|--------------|----------|--------|
| `eas.projectId` | зашито | ID проекта EAS |
| `apiBaseUrl` | `EXPO_PUBLIC_API_BASE_URL` или дефолт | База API (часто дублирует публичный URL) |
| `topUpUrl` | `EXPO_PUBLIC_TOP_UP_URL` | Полный URL страницы пополнения; пусто — строится от api |
| `contestSignSecret` | verify/booking env или fallback в config | Секрет для MD5 (должен совпадать с договором бэка) |
| `icafeApiBaseUrl` | `EXPO_PUBLIC_ICAFE_API_BASE_URL` | Отдельный хост iCafe при регистрации |
| `allBooksPath` | `EXPO_PUBLIC_ALL_BOOKS_PATH` | Путь GET списка броней (например `/all-books-member`) |
| `knowledgeJsonUrl` | `EXPO_PUBLIC_KNOWLEDGE_JSON_URL` | URL JSON для чата |
| `jobReviewUrl` | `EXPO_PUBLIC_JOB_REVIEW_URL` | Форма отзыва о работе клуба |

**Схема диплинка, иконки, bundle id, разрешения, плагины** (`expo-notifications`, `expo-calendar`, `expo-location`, …) — тоже в `app.config.js`. Меняете **нативные** настройки — для стора обычно нужен **новый prebuild/билд**, не только OTA-обновление JS (если не используете чистый managed без изменений плагинов — уточняйте в Expo по каждой правке).

## EAS: переменные на сборку

В облачной сборке `eas build` переменные задают:

- в **EAS Secrets** / env для профиля в `eas.json`, или
- в **dashboard** Expo для проекта.

Локальный `.env` **не** подставляется на сервер EAS автоматически, если вы явно не настроили передачу. Для production проверяйте, что `EXPO_PUBLIC_*` в билде — те же, что на стенде.

## Секреты

- Не кладите в `EXPO_PUBLIC_*` настоящие **только серверные** токены, которые нельзя утекать.
- Подписи `VERIFY` / `BOOKING` в клиенте — **договорные** с прокси (как в референсном Android); это не уязвимость «одной строки», а контракт; всё равно не публикуйте лишнего в публичных репо.

См. также: [security.md](security.md), [../modules/dependencies.md](../modules/dependencies.md), [troubleshooting.md](troubleshooting.md).
