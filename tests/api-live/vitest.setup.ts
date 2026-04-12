import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { vi } from 'vitest';

loadEnv({ path: path.resolve(process.cwd(), '.env') });
loadEnv({ path: path.resolve(process.cwd(), '.env.local') });

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
