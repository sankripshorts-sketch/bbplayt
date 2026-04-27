# Документация `bbplay`

Мобильное клиентское приложение сети **BlackBears Play** (Expo / React Native): вход и регистрация, клубы, еда, бронирование ПК, баланс и профиль, локальный чат поддержки по JSON-базе знаний, уведомления о бронях. Бизнес-логика — на **vibe** / iCafe API; приложение — тонкий клиент.

## Быстрый старт (новый разработчик)

1. Установить **Node.js** LTS, **git**, (для нативных билдов) **Android Studio** и/или **Xcode**.
2. Клонировать репозиторий, в корне: `npm install`.
3. Скопировать `.env.example` → `.env` (как минимум проверить `EXPO_PUBLIC_API_BASE_URL`).
4. Запустить `npm start`, открыть приложение в **Expo Go** или **dev client** / эмулятор.
5. Пройтись по сценарию входа; при ошибках API — [submoduli/troubleshooting.md](submoduli/troubleshooting.md).

Пошаговая детализация (требования к ОС, эмулятор, USB, кэш Metro, типичные ошибки): **[submoduli/run.md](submoduli/run.md)**. Расширенный справочник переменных и `app.config.js`: **[submoduli/configuration.md](submoduli/configuration.md)**.

## Оглавление по типам

| Каталог / файл | Назначение |
|----------------|------------|
| **[`modules/`](modules/README.md)** | Архитектура приложения, данные/кэш, зависимости npm |
| **[`submoduli/`](submoduli/README.md)** | Запуск, `.env`, сценарии, API, отладка, глоссарий, FAQ |
| **[`moduli-detail/`](moduli-detail/README.md)** | Крупные справочники: карта кода, ТЗ |
| **[`modules-map.md`](modules-map.md)** | Карта `src/`, навигация, слои, deep links |
| **[`developer-guide.md`](developer-guide.md)** | **Подробно:** куда смотреть при типичных задачах (тема, i18n, API, бронь) |

Полный обзор стека: **[`../ARCHITECTURE.md`](../ARCHITECTURE.md)** (корень `docs/`).

## В каком порядке читать

| Если нужно… | С чего начать |
|-------------|---------------|
| Поднять проект с нуля | [submoduli/run.md](submoduli/run.md) → [submoduli/configuration.md](submoduli/configuration.md) |
| Понять папки и файлы | [modules-map.md](modules-map.md) → [moduli-detail/modules-reference.md](moduli-detail/modules-reference.md) |
| Разобрать экраны и вкладки | [submoduli/user-guide.md](submoduli/user-guide.md) → [submoduli/user-flows.md](submoduli/user-flows.md) |
| Починить бэкенд/403/бронь | [submoduli/api-and-backend.md](submoduli/api-and-backend.md) → [submoduli/troubleshooting.md](submoduli/troubleshooting.md) + [`../api-spec.md`](../api-spec.md) |
| Собрать APK / релиз | [submoduli/deployment.md](submoduli/deployment.md) + `eas.json` в корне репо |
| Правка «как в проекте» | [developer-guide.md](developer-guide.md) |

## «Минимодули» (ключевые файлы)

По одному файлу — краткая страница: [submoduli/minimodules/README.md](submoduli/minimodules/README.md).

## Сквозные темы

- **Поведение и UI** — [submoduli/callbacks-and-ui-states.md](submoduli/callbacks-and-ui-states.md), [submoduli/user-flows.md](submoduli/user-flows.md), [submoduli/limits-and-behavior.md](submoduli/limits-and-behavior.md).
- **Архитектура кода** — [modules/architecture.md](modules/architecture.md), [moduli-detail/modules-reference.md](moduli-detail/modules-reference.md), [modules/data-and-jobs.md](modules/data-and-jobs.md), [modules/dependencies.md](modules/dependencies.md).
- **Бэкенд** — [submoduli/api-and-backend.md](submoduli/api-and-backend.md), [submoduli/account-login.md](submoduli/account-login.md), [submoduli/related-documentation.md](submoduli/related-documentation.md).
- **Сборка и прод** — [submoduli/deployment.md](submoduli/deployment.md), [submoduli/operations.md](submoduli/operations.md), [submoduli/security.md](submoduli/security.md).
- **Отладка** — [submoduli/testing-and-debugging.md](submoduli/testing-and-debugging.md), [submoduli/troubleshooting.md](submoduli/troubleshooting.md).
- **Сопровождение доки** — [submoduli/maintaining-docs.md](submoduli/maintaining-docs.md).
- **ТЗ и бэклог** — [moduli-detail/technical-spec.md](moduli-detail/technical-spec.md), [agent-tasks.md](agent-tasks.md).
- **Внешние контракты** — [`../api-spec.md`](../api-spec.md), [`../icafe-api.md`](../icafe-api.md), [`../API_VIBE_LOGIC.md`](../API_VIBE_LOGIC.md).

## Быстрые ссылки

- [Пользовательские сценарии](submoduli/user-guide.md) · [FAQ](submoduli/faq.md) · [Решение проблем](submoduli/troubleshooting.md) · [Глоссарий](submoduli/glossary.md)

## Для разработчиков

Карта исходников: [modules-map.md](modules-map.md). Скрипты экспорта промптов Cursor: [`../PROMPTS_ALL.md`](../PROMPTS_ALL.md) (команды `npm run export:cursor-prompts`, `npm run docs:prompts-md` в корне репо).
