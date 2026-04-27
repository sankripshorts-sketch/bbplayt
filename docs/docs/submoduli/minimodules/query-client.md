# `src/query/queryClient.ts`

- Экземпляр `QueryClient` с дефолтами: `staleTime`, `gcTime`, `retry`, **отключённый** `refetchOnWindowFocus` для RN.
- `asyncStoragePersister` + `persistOptions`: персист только запросов с ключами, начинающимися с `cafes`, `struct-rooms`, `vk-wall`.
- `maxAge` персиста: 7 дней.

## См. также

- [../../modules/data-and-jobs.md](../../modules/data-and-jobs.md)
- [app-entry.md](app-entry.md)
