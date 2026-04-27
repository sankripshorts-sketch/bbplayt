# Тестирование и отладка

## Статическая проверка (обязательный минимум перед PR)

```bash
npm run lint
```

Запускает `tsc --noEmit` — **все** ошибки типов в проекте, не только открытые файлы.

## Юнит-тесты (Vitest)

```bash
npm run test:unit
```

- Каталог: `tests/unit/`.
- Подходят для **чистых функций**: разбор дат, нормализация, хелперы **без** `fetch` и без нативных модулей.

## Интеграционные / API live

```bash
npm run test:api
# или в watch
npm run test:api:watch
```

- Каталог: `tests/api-live/`.
- Выполняют **реальные HTTP**-запросы к backend.
- **Требуются:** валидный `.env` с рабочим `EXPO_PUBLIC_API_BASE_URL`, тестовая учётка (если тесты залогинены), сеть.
- Не гоняйте на **прод** без осознанного риска; договоритесь с бэкендом о тестовом member.

## Отладка в IDE

- Точки останова в **VS Code / Cursor** с привязкой к Metro: см. [React Native docs](https://reactnative.dev/docs/debugging) (Hermes, Flipper, Chrome — что актуально для вашей версии Expo).

## React Query

- В проде **Devtools** обычно не подключают.
- Временно: `console.log` **query key** / **status** в компоненте, или **Flipper** с плагином React Query, если настроен.

## Частые предметы отладки

| Проблема | Куда поставить внимание |
|----------|-------------------------|
| «Двойной» refetch | `refetchOnWindowFocus: false` уже в `queryClient`; ищите ручной `refetch()` |
| Старая дата на экране брони | `useBookingNowMs`, МСК, `serverBookingClock` |
| Неверный host API | `Constants.expoConfig?.extra` vs ожидаемый `EXPO_PUBLIC_` в билде EAS |
| CORS (web) | Не iOS/Android; для VK — proxy env |

## Минимальный чек перед релизом

1. `npm run lint` — без ошибок.
2. `npm run test:unit` — зелёный.
3. Ручной smoke: login → clubs → create booking (стейдж) → logout.
4. Проверка **релизного** профиля EAS с теми же `EXPO_PUBLIC`, что на стенде.

См. также: [troubleshooting.md](troubleshooting.md), [run.md](run.md).
