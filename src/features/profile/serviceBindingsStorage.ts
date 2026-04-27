import AsyncStorage from '@react-native-async-storage/async-storage';

export type ServiceBindings = {
  steam: boolean;
  epicGames: boolean;
};

const STORAGE_KEY = 'profile.serviceBindings.v1';

const DEFAULT_BINDINGS: ServiceBindings = {
  steam: false,
  epicGames: false,
};

export async function loadServiceBindings(): Promise<ServiceBindings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BINDINGS;
    const parsed = JSON.parse(raw) as Partial<ServiceBindings> | null;
    return {
      steam: parsed?.steam === true,
      epicGames: parsed?.epicGames === true,
    };
  } catch {
    return DEFAULT_BINDINGS;
  }
}

export async function patchServiceBindings(
  patch: Partial<ServiceBindings>,
): Promise<ServiceBindings> {
  const current = await loadServiceBindings();
  const next: ServiceBindings = {
    steam: patch.steam ?? current.steam,
    epicGames: patch.epicGames ?? current.epicGames,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function saveServiceBindings(next: ServiceBindings): Promise<ServiceBindings> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
