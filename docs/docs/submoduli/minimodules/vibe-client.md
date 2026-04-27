# `src/api/vibeClient.ts`

Основной HTTP-слой к **vibe-прокси** BlackBears: базовый URL из `EXPO_PUBLIC_API_BASE_URL`, заголовки, разбор JSON и ошибок (совместно с `client.ts` / `ApiError`).

Узкие сценарии (брони, баланс, ПК) часто вынесены в соседние модули `src/api/*` и/или `icafeClient.ts`.

## См. также

- [../api-and-backend.md](../api-and-backend.md)
- [icafe-client.md](icafe-client.md)
