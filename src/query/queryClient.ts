import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';

const PERSIST_KEY = 'bbplay.react-query.v1';
const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnReconnect: true,
      /** RN: refetch при «фокусе» окна часто дергается при клавиатуре. */
      refetchOnWindowFocus: false,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSIST_KEY,
  throttleTime: 1000,
});

/** Какие query-ключи пишем в AsyncStorage (см. also gcTime / staleTime в хуках). */
function shouldPersistQueryKey(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0];
  if (typeof head !== 'string') return false;
  return (
    head === 'cafes' ||
    head === 'struct-rooms' ||
    head === 'vk-wall' ||
    head === 'icafe-id-for-member' ||
    head === 'all-prices' ||
    head === 'books' ||
    head === 'cafe-booking-products' ||
    head === 'cafe-bookings-icafe' ||
    head === 'live-pcs'
  );
}

export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister: asyncStoragePersister,
  maxAge: PERSIST_MAX_AGE_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => shouldPersistQueryKey(query.queryKey),
  },
};
