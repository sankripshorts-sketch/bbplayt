import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bbplay.hints.v1';

export type HintId = 'booking_map' | 'clubs_route';

type Store = Partial<Record<HintId, boolean>>;

/** Синхронный кэш: после «Понятно» не ждём диск — иначе гонка при быстром уходе с экрана. */
const seenMemory = new Set<HintId>();

async function readDisk(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

export async function loadHints(): Promise<Store> {
  const disk = await readDisk();
  const out: Store = { ...disk };
  for (const id of seenMemory) {
    out[id] = true;
  }
  return out;
}

export async function markHintSeen(id: HintId): Promise<void> {
  seenMemory.add(id);
  try {
    const cur = await readDisk();
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...cur, [id]: true }));
  } catch {
    /* память уже отмечена — при следующем запуске с диска подтянется или снова запишем */
  }
}

export async function shouldShowHint(id: HintId): Promise<boolean> {
  if (seenMemory.has(id)) return false;
  const h = await readDisk();
  if (h[id]) {
    seenMemory.add(id);
    return false;
  }
  return true;
}
