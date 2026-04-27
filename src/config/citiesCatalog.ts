import type { CafeItem } from '../api/types';

/** Канонический id города в префах и API каталога (расширяйте по мере открытия городов). */
export type CityId = string;

export type CityDefinition = {
  id: CityId;
  nameRu: string;
  nameEn: string;
  /** Центр для геоподсказки и привязки клубов по координатам */
  center: { lat: number; lng: number };
  /** Положительный id сообщества VK (club{id}, wall-{id}) */
  vkGroupId: number;
  /** Подпись в шапке новостей, если нет EXPO_PUBLIC_VK_GROUP_TITLE */
  vkCommunityTitle?: string;
  /** Аватар в карточках новостей, если нет EXPO_PUBLIC_VK_GROUP_AVATAR_URL и нет в HTML ленты */
  vkGroupAvatarUrl?: string;
};

/**
 * Каталог городов сети: новости VK, гео, фильтр клубов.
 * Новые города — новая строка + клубы в API с lat/lng или адресом с названием города.
 */
export const BB_CITIES: readonly CityDefinition[] = [
  {
    id: 'tambov',
    nameRu: 'Тамбов',
    nameEn: 'Tambov',
    center: { lat: 52.7212, lng: 41.4523 },
    vkGroupId: 221562447,
    vkCommunityTitle: 'BlackBears Play · Тамбов',
    vkGroupAvatarUrl:
      'https://sun1-47.userapi.com/s/v1/ig2/4tgOIqkRDSOO06ebW9WDlyuDGixhxN84_5T4m5lpNd-VovNaFDk6WfbXHeMdQAvas6Ri-PpeCHOA6hdsKH1A-8lQ.jpg?quality=95&crop=101,101,879,879&as=160x160,240x240&ava=1',
  },
  {
    id: 'lipetsk',
    nameRu: 'Липецк',
    nameEn: 'Lipetsk',
    center: { lat: 52.6031, lng: 39.5708 },
    /** id сообщества https://vk.com/blackbearsplaylipetsk (resolveScreenName в HTML VK) */
    vkGroupId: 219911959,
    vkCommunityTitle: 'BlackBears Play · Липецк',
    vkGroupAvatarUrl:
      'https://sun1-24.userapi.com/s/v1/ig2/acJTtvPUxYUBwK144fGVtxQ3nqAazpE4cnC5J_rySCXwNJzAzsGFcNI-cuS2JHFo1qy0HESbSSYvR2RCgM64_lsW.jpg?quality=95&crop=0,0,1080,1080&as=160x160,240x240&ava=1',
  },
] as const;

export const DEFAULT_CITY_ID: CityId = BB_CITIES[0]!.id;

const CITY_BY_ID = new Map<string, CityDefinition>(BB_CITIES.map((c) => [c.id, c]));

export function isKnownCityId(id: string | null | undefined): id is CityId {
  return Boolean(id && CITY_BY_ID.has(id));
}

export function getCityDefinition(cityId: string): CityDefinition | undefined {
  return CITY_BY_ID.get(cityId);
}

export function cityDisplayName(cityId: string, locale: 'ru' | 'en'): string {
  const c = CITY_BY_ID.get(cityId);
  if (!c) return cityId;
  return locale === 'en' ? c.nameEn : c.nameRu;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

const GEO_MAX_KM = 130;

/** Ближайший город из каталога, если в пределах GEO_MAX_KM */
export function inferCityIdFromCoords(lat: number, lng: number): CityId | null {
  let best: { id: CityId; km: number } | null = null;
  for (const c of BB_CITIES) {
    const km = haversineKm(lat, lng, c.center.lat, c.center.lng);
    if (km <= GEO_MAX_KM && (!best || km < best.km)) best = { id: c.id, km };
  }
  return best?.id ?? null;
}

/** По координатам клуба или подстроке в адресе */
export function inferCityIdFromCafe(cafe: CafeItem): CityId | null {
  if (typeof cafe.lat === 'number' && typeof cafe.lng === 'number' && Number.isFinite(cafe.lat + cafe.lng)) {
    const fromCoords = inferCityIdFromCoords(cafe.lat, cafe.lng);
    if (fromCoords) return fromCoords;
  }
  const addr = `${cafe.address ?? ''} ${cafe.name ?? ''}`.toLowerCase();
  if (addr.includes('липецк') || addr.includes('lipetsk')) {
    const lip = CITY_BY_ID.get('lipetsk');
    if (lip) return lip.id;
  }
  if (addr.includes('тамбов') || addr.includes('tambov')) {
    const t = CITY_BY_ID.get('tambov');
    if (t) return t.id;
  }
  return null;
}

export function cafesInCity(cafes: readonly CafeItem[], cityId: CityId): CafeItem[] {
  return cafes.filter((c) => inferCityIdFromCafe(c) === cityId);
}

/** Города для колеса: сначала те, к которым привязан хотя бы один клуб из API; иначе полный каталог. */
export function orderedCitiesForPicker(cafes: readonly CafeItem[]): CityDefinition[] {
  const matched = BB_CITIES.filter((def) => cafes.some((c) => inferCityIdFromCafe(c) === def.id));
  return matched.length > 0 ? matched : [...BB_CITIES];
}

export function vkGroupIdForCityId(cityId: string): number {
  return CITY_BY_ID.get(cityId)?.vkGroupId ?? BB_CITIES[0]!.vkGroupId;
}

export function vkCommunityTitleForCity(cityId: string, locale: 'ru' | 'en'): string | undefined {
  const c = CITY_BY_ID.get(cityId);
  if (!c?.vkCommunityTitle) return undefined;
  return c.vkCommunityTitle;
}
