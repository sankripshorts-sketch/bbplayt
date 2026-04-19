import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { vi } from 'vitest';

loadEnv({ path: path.resolve(process.cwd(), '.env') });
loadEnv({ path: path.resolve(process.cwd(), '.env.local') });

/** `sessionStorage` в web-режиме пишет в `localStorage`; в `environment: 'node'` его нет — без полифилла логин в api-live не сохраняется. */
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    getItem: (k: string) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
}

/** Vitest 4 / Rolldown не парсят Flow в `react-native/index.js`; для api-live достаточно web-режима. */
vi.mock('react-native', () => {
  const Platform = {
    OS: 'web' as const,
    select: <T>(s: { ios?: T; android?: T; web?: T; default?: T }) => s.web ?? s.default,
  };
  return { Platform };
});

/** Node MD5 вместо expo-crypto (без подтягивания react-native в Vitest). */
vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { MD5: 'MD5' },
  digestStringAsync: async (_algo: string, payload: string) =>
    createHash('md5').update(payload, 'utf8').digest('hex'),
}));

vi.mock('expo-constants', () => ({
  default: {
    get expoConfig() {
      const api =
        process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
        process.env.EXPO_PUBLIC_ICAFE_API_BASE_URL?.replace(/\/$/, '') ||
        '';
      return {
        extra: {
          apiBaseUrl: api || undefined,
          icafeApiBaseUrl: process.env.EXPO_PUBLIC_ICAFE_API_BASE_URL?.replace(/\/$/, '') || undefined,
        },
      };
    },
  },
}));

vi.mock('expo-secure-store', () => {
  let mem: string | null = null;
  return {
    getItemAsync: async () => mem,
    setItemAsync: async (_k: string, v: string) => {
      mem = v;
    },
    deleteItemAsync: async () => {
      mem = null;
    },
  };
});
