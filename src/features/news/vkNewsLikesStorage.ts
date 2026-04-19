import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'vkNews.likedPostKeys';

export async function getLikedPostKeys(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function persist(keys: Set<string>): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify([...keys]));
}

/** Переключает локальную отметку «лайк» для поста. Без VK API — только в этом приложении. */
export async function toggleLikedPostKey(postKey: string): Promise<boolean> {
  const keys = await getLikedPostKeys();
  let liked: boolean;
  if (keys.has(postKey)) {
    keys.delete(postKey);
    liked = false;
  } else {
    keys.add(postKey);
    liked = true;
  }
  await persist(keys);
  return liked;
}
