import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bbplay.hints.v1';

export type HintId = 'booking_map' | 'clubs_route';

type Store = Partial<Record<HintId, boolean>>;

export async function loadHints(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

export async function markHintSeen(id: HintId): Promise<void> {
  const cur = await loadHints();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...cur, [id]: true }));
}

export async function shouldShowHint(id: HintId): Promise<boolean> {
  const h = await loadHints();
  return !h[id];
}
