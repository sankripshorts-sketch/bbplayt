import type { PcListItem, StructPc } from '../../api/types';
import { pcZoneKindFromPc, pcZoneKindFromStructPc, type PcZoneKind } from './pcZoneKind';

/** Зоны, участвующие в поиске «ближайший слот» (без Other). */
export type NearestNamedZone = Exclude<PcZoneKind, 'Other'>;

export type NearestZoneFilter =
  | { mode: 'any' }
  | { mode: 'kinds'; kinds: NearestNamedZone[] };

export function pcMatchesNearestZoneFilter(p: PcListItem, filter: NearestZoneFilter): boolean {
  if (filter.mode === 'any') return true;
  const z = pcZoneKindFromPc(p);
  if (z === 'Other') return false;
  return filter.kinds.includes(z);
}

/** Та же логика, что у {@link pcMatchesNearestZoneFilter}, для чипов на SVG/схеме зала. */
export function structPcMatchesNearestZoneFilter(
  pc: StructPc,
  roomAreaName: string,
  filter: NearestZoneFilter,
): boolean {
  if (filter.mode === 'any') return true;
  const z = pcZoneKindFromStructPc(pc, roomAreaName);
  if (z === 'Other') return false;
  return filter.kinds.includes(z);
}

/** Уникальные зоны, не более max; пустой массив — ошибка. */
export function normalizeKindsList(
  kinds: NearestNamedZone[],
  max = 3,
): NearestNamedZone[] | null {
  const u = [...new Set(kinds)];
  if (!u.length || u.length > max) return null;
  return u;
}
