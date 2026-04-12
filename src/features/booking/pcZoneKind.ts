import type { PcListItem, PriceItem, StructPc } from '../../api/types';

/** Три канонические залы + прочее (не сопоставилось). */
export type PcZoneKind = 'VIP' | 'BootCamp' | 'GameZone' | 'Other';

export const BOOKING_ZONE_ORDER: PcZoneKind[] = ['VIP', 'BootCamp', 'GameZone', 'Other'];

/**
 * Приводит строку зоны (ПК или group_name прайса) к одному из трёх типов или Other.
 */
export function normalizePcZoneKind(raw: string | undefined | null): PcZoneKind {
  if (raw == null) return 'Other';
  const s = String(raw).trim();
  if (!s) return 'Other';
  const n = s.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
  const c = n.replace(/[^a-zа-яё0-9]/gi, '');

  if (c === 'vip' || n.startsWith('vip ') || /^вип\b/i.test(s) || /^vip\b/i.test(s)) return 'VIP';
  if (c.includes('bootcamp') || n.includes('boot camp') || /буткемп/i.test(s)) return 'BootCamp';
  if (
    c.includes('gamezone') ||
    (n.includes('game') && n.includes('zone')) ||
    /^гейм/i.test(s) ||
    /гейм[\s-]?зон/i.test(s) ||
    /игров(ая|ой)\s+зон/i.test(s) ||
    /^gamezone$/i.test(s.trim())
  )
    return 'GameZone';
  return 'Other';
}

export function pcZoneKindFromPc(pc: PcListItem): PcZoneKind {
  const parts = [
    typeof pc.pc_area_name === 'string' ? pc.pc_area_name.trim() : '',
    typeof pc.pc_area === 'string' ? pc.pc_area.trim() : '',
    typeof pc.pc_group_name === 'string' ? pc.pc_group_name.trim() : '',
    typeof pc.price_name === 'string' ? pc.price_name.trim() : '',
  ];
  for (const fragment of parts) {
    if (!fragment) continue;
    const k = normalizePcZoneKind(fragment);
    if (k !== 'Other') return k;
  }
  return 'Other';
}

/** Зона чипа на схеме зала: те же поля, что у списка ПК, плюс имя зоны комнаты из `/struct-rooms-icafe`. */
export function pcZoneKindFromStructPc(pc: StructPc, roomAreaName: string): PcZoneKind {
  const parts = [
    typeof pc.pc_area_name === 'string' ? pc.pc_area_name.trim() : '',
    typeof roomAreaName === 'string' ? roomAreaName.trim() : '',
    typeof pc.pc_group_name === 'string' ? pc.pc_group_name.trim() : '',
  ];
  for (const fragment of parts) {
    if (!fragment) continue;
    const k = normalizePcZoneKind(fragment);
    if (k !== 'Other') return k;
  }
  return 'Other';
}

/**
 * Строка прайса подходит под выбранную зону брони (включая пустой `group_name` для любой зоны).
 * Для подбора почасового шаблона по зоне лучше {@link priceItemExplicitZoneRow} + {@link priceItemUngrouped}.
 */
export function priceItemMatchesBookingZone(p: PriceItem, zone: PcZoneKind): boolean {
  const g = p.group_name;
  if (g == null || String(g).trim() === '') return true;
  const k = normalizePcZoneKind(g);
  if (zone === 'Other') return k === 'Other';
  return k === zone;
}

/** Непустой `group_name`, зона строки совпадает с `zone` (после нормализации). */
export function priceItemExplicitZoneRow(p: PriceItem, zone: PcZoneKind): boolean {
  const g = p.group_name;
  if (g == null || String(g).trim() === '') return false;
  return normalizePcZoneKind(g) === zone;
}

export function priceItemUngrouped(p: PriceItem): boolean {
  return !p.group_name || String(p.group_name).trim() === '';
}

/** Секция «Условия» по зонам: VIP/BootCamp/GameZone — только явные строки; Other — без группы и прочее. */
export function priceItemInTermsSection(p: PriceItem, zone: PcZoneKind): boolean {
  if (zone === 'Other') {
    return priceItemUngrouped(p) || normalizePcZoneKind(p.group_name) === 'Other';
  }
  return priceItemExplicitZoneRow(p, zone);
}

/** Сортировка ПК: VIP → BootCamp → GameZone → Other, внутри — по имени. */
export function comparePcByZoneThenName(a: PcListItem, b: PcListItem): number {
  const za = pcZoneKindFromPc(a);
  const zb = pcZoneKindFromPc(b);
  const ia = BOOKING_ZONE_ORDER.indexOf(za);
  const ib = BOOKING_ZONE_ORDER.indexOf(zb);
  if (ia !== ib) return ia - ib;
  return String(a.pc_name).localeCompare(String(b.pc_name), undefined, { numeric: true });
}
