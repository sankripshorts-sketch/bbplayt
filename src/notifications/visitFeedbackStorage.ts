import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'bbplay.visitFeedback.handledKeys.v1';

export async function loadHandledVisitKeys(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export async function addHandledVisitKey(key: string): Promise<void> {
  const set = await loadHandledVisitKeys();
  set.add(key);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}
