import { Platform } from 'react-native';
import type { PersistedSession } from './sessionTypes';

const SESSION_KEY = 'bbplay_session_v1';

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

async function readRaw(): Promise<string | null> {
  if (isWeb()) {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    } catch {
      return null;
    }
  }
  const SecureStore = await getSecureStore();
  if (!SecureStore) return null;
  return SecureStore.getItemAsync(SESSION_KEY);
}

async function writeRaw(json: string): Promise<void> {
  if (isWeb()) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, json);
    return;
  }
  const SecureStore = await getSecureStore();
  if (!SecureStore) return;
  await SecureStore.setItemAsync(SESSION_KEY, json);
}

async function removeRaw(): Promise<void> {
  if (isWeb()) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
    return;
  }
  const SecureStore = await getSecureStore();
  if (!SecureStore) return;
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getSession(): Promise<PersistedSession | null> {
  const raw = await readRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

export async function setSession(session: PersistedSession) {
  await writeRaw(JSON.stringify(session));
}

export async function clearSession() {
  await removeRaw();
}
