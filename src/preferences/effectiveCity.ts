import type { CafeItem } from '../api/types';
import {
  DEFAULT_CITY_ID,
  inferCityIdFromCafe,
  inferCityIdFromCoords,
  isKnownCityId,
} from '../config/citiesCatalog';
import type { AppPreferences } from './appPreferences';

/**
 * Город для новостей / фильтра клубов: вручную из настроек → по избранному/последней брони → гео → дефолт.
 */
export function resolveEffectiveCityId(prefs: AppPreferences, cafes: CafeItem[] | undefined): string {
  if (prefs.cityIdManual && isKnownCityId(prefs.cityIdManual)) return prefs.cityIdManual;
  const clubId = prefs.lastBookingClubId ?? prefs.favoriteClubId;
  if (clubId != null && cafes?.length) {
    const cafe = cafes.find((c) => c.icafe_id === clubId);
    if (cafe) {
      const inferred = inferCityIdFromCafe(cafe);
      if (inferred) return inferred;
    }
  }
  if (prefs.cityIdFromGeo && isKnownCityId(prefs.cityIdFromGeo)) return prefs.cityIdFromGeo;
  return DEFAULT_CITY_ID;
}

/** Однократная попытка гео: нет ручного города, ещё не пробовали, нет клуба в префах для вывода города. */
export function shouldAttemptCityGeoBootstrap(prefs: AppPreferences, cafes: CafeItem[] | undefined): boolean {
  if (prefs.cityIdManual) return false;
  if (prefs.cityGeoAttempted) return false;
  const clubId = prefs.lastBookingClubId ?? prefs.favoriteClubId;
  if (clubId != null && cafes?.some((c) => c.icafe_id === clubId)) return false;
  return true;
}

export async function tryGeolocationCityGuess(): Promise<string | null> {
  try {
    const { Platform } = await import('react-native');
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          maximumAge: 120_000,
          timeout: 12_000,
        });
      });
      return inferCityIdFromCoords(pos.coords.latitude, pos.coords.longitude);
    }
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return inferCityIdFromCoords(loc.coords.latitude, loc.coords.longitude);
  } catch {
    return null;
  }
}
