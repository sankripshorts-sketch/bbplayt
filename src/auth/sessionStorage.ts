import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistedSession } from './sessionTypes';

/** @deprecated миграция: раньше вся сессия была одним JSON в SecureStore */
const LEGACY_SESSION_KEY = 'bbplay_session_v1';
const WEB_STORAGE_KEY = LEGACY_SESSION_KEY;

const USER_KEY = 'bbplay_session_user_v1';
const SECURE_TOKEN_KEY = 'bbplay_auth_token_v1';
const SECURE_COOKIE_KEY = 'bbplay_cookie_v1';

type SecureStoreModule = typeof import('expo-secure-store');

let secureStorePromise: Promise<SecureStoreModule | null> | null = null;

async function getSecureStore(): Promise<SecureStoreModule | null> {
  if (Platform.OS === 'web') return null;
  if (!secureStorePromise) {
    secureStorePromise = import('expo-secure-store').catch((e) => {
      if (__DEV__) console.warn('[sessionStorage] expo-secure-store load failed', e);
      return null;
    });
  }
  return secureStorePromise;
}

function isWeb(): boolean {
  return Platform.OS === 'web';
}

async function readLegacyWeb(): Promise<string | null> {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(WEB_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

async function writeLegacyWeb(json: string): Promise<void> {
  if (typeof localStorage !== 'undefined') localStorage.setItem(WEB_STORAGE_KEY, json);
}

async function removeLegacyWeb(): Promise<void> {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(WEB_STORAGE_KEY);
}

function parseSession(raw: string): PersistedSession | null {
  try {
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

async function readNativeSplit(): Promise<PersistedSession | null> {
  const userRaw = await AsyncStorage.getItem(USER_KEY);
  if (!userRaw) return null;
  const SecureStore = await getSecureStore();
  if (!SecureStore) return null;
  const [token, cookie] = await Promise.all([
    SecureStore.getItemAsync(SECURE_TOKEN_KEY),
    SecureStore.getItemAsync(SECURE_COOKIE_KEY),
  ]);
  try {
    const user = JSON.parse(userRaw) as PersistedSession['user'];
    return {
      user,
      ...(token ? { authToken: token } : {}),
      ...(cookie ? { cookie } : {}),
    };
  } catch {
    return null;
  }
}

async function writeNativeSplit(session: PersistedSession): Promise<void> {
  const SecureStore = await getSecureStore();
  if (!SecureStore) return;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user));
  const ops: Promise<void>[] = [];
  if (session.authToken && session.authToken.length > 0) {
    ops.push(SecureStore.setItemAsync(SECURE_TOKEN_KEY, session.authToken));
  } else {
    ops.push(SecureStore.deleteItemAsync(SECURE_TOKEN_KEY).catch(() => {}));
  }
  if (session.cookie && session.cookie.length > 0) {
    ops.push(SecureStore.setItemAsync(SECURE_COOKIE_KEY, session.cookie));
  } else {
    ops.push(SecureStore.deleteItemAsync(SECURE_COOKIE_KEY).catch(() => {}));
  }
  await Promise.all(ops);
  await SecureStore.deleteItemAsync(LEGACY_SESSION_KEY).catch(() => {});
}

async function readNativeLegacySecure(): Promise<PersistedSession | null> {
  const SecureStore = await getSecureStore();
  if (!SecureStore) return null;
  const raw = await SecureStore.getItemAsync(LEGACY_SESSION_KEY);
  if (!raw) return null;
  return parseSession(raw);
}

async function migrateNativeLegacyToSplit(legacy: PersistedSession): Promise<void> {
  await writeNativeSplit(legacy);
}

async function clearNativeSplit(): Promise<void> {
  const SecureStore = await getSecureStore();
  await AsyncStorage.removeItem(USER_KEY);
  if (SecureStore) {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(SECURE_COOKIE_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(LEGACY_SESSION_KEY).catch(() => {}),
    ]);
  }
}

export async function getSession(): Promise<PersistedSession | null> {
  if (isWeb()) {
    const raw = await readLegacyWeb();
    return raw ? parseSession(raw) : null;
  }

  const split = await readNativeSplit();
  if (split) return split;

  const legacy = await readNativeLegacySecure();
  if (legacy) {
    await migrateNativeLegacyToSplit(legacy);
    return legacy;
  }
  return null;
}

export async function setSession(session: PersistedSession) {
  if (isWeb()) {
    await writeLegacyWeb(JSON.stringify(session));
    return;
  }
  await writeNativeSplit(session);
}

export async function clearSession() {
  if (isWeb()) {
    await removeLegacyWeb();
    return;
  }
  await clearNativeSplit();
}
