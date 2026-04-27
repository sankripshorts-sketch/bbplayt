# Структура репозитория

Монорепо **нет**: один npm-пакет `bbplay`, корень = корень git-репозитория.

## Дерево верхнего уровня

```text
bbplay/
├── App.tsx                 # Точка входа Expo
├── app.config.js           # Expo / EAS, extra, плагины, scheme bbplay://
├── package.json
├── eas.json                # Профили EAS build
├── .env.example            # Шаблон переменных (скопировать в .env)
├── .env                    # Локально, не коммитить
├── assets/                 # Иконки, splash, шрифты, knowledge.json
├── patches/                # patch-package
├── scripts/                # Вспомогательные скрипты (промпты, md)
├── tests/                  # vitest: unit/, api-live/
├── docs/                   # Документация
│   ├── ARCHITECTURE.md     # Обзор стека (читать первым из docs/)
│   ├── api-spec.md, icafe-api.md, API_VIBE_LOGIC.md — контракты
│   └── docs/               # Эта иерархия (README.md = оглавление)
└── src/
    ├── api/
    ├── auth/
    ├── features/           # По одной папке на продуктовую область
    ├── navigation/
    ├── query/
    └── …                   # см. modules-map.md
```

## Назначение каталогов

| Путь | Содержимое |
|------|------------|
| `App.tsx` | Провайдеры, шрифты, splash |
| `app.config.js` | Имя приложения, `ios`/`android`, `scheme`, `plugins`, `extra` |
| `assets/` | Статика: иконки, `knowledge.json` для офлайн-чата |
| `src/api/` | Все HTTP-обёртки и нормализация ответов |
| `src/features/*/` | Экраны и логика по фичам; крупные файлы — норма (бронь) |
| `src/navigation/` | Табы, стеки, deep link, синхронизация с уведомлениями |
| `src/query/` | React Query, bootstrap, ключи |
| `patches/` | Диффы `patch-package` для `node_modules` |
| `tests/` | Автотесты; `api-live` требует сеть и валидный backend |
| `docs/` | Архитектура, API, **подпапка `docs/`** с полным оглавлением |
| `scripts/` | Не влияют на рантайм приложения |

## Где лежит «главное оглавление» документации

- Краткий обзор стека: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).
- Подробная иерархия разделов: [`docs/docs/README.md`](../README.md).
- Практические задачи по коду: [`docs/docs/developer-guide.md`](../developer-guide.md).

См. также: [modules-map.md](../modules-map.md).
