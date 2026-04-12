import type { PcListItem, PriceItem, ProductItem } from '../../api/types';
import {
  hourlyCandidatesForSessionMins,
  parseMinsFromPriceItem,
  parseMinsFromProduct,
  type TariffChoice,
} from './tariffSelection';

/** Сопоставление зоны ПК с полем `group` / `group_name` в `/all-prices-icafe` (док. конкурса 2026.04). */
export function normalizeZoneKey(raw: string | undefined | null): string {
  if (raw == null) return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Для сравнения «GameZone» ↔ «game zone» ↔ «Гейм» */
function compressZoneKey(raw: string | undefined | null): string {
  const n = normalizeZoneKey(raw);
  return n.replace(/[^a-zа-яё0-9]/gi, '');
}

function zoneKeysFuzzyEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  const na = normalizeZoneKey(a);
  const nb = normalizeZoneKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ca = compressZoneKey(a);
  const cb = compressZoneKey(b);
  if (ca.length >= 3 && cb.length >= 3 && ca === cb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

export function pcZoneLabel(pc: PcListItem): string {
  const a = typeof pc.pc_area_name === 'string' ? pc.pc_area_name.trim() : '';
  if (a.length > 0) return a;
  const b = typeof pc.pc_area === 'string' ? pc.pc_area.trim() : '';
  return b;
}

/**
 * Ключ для сопоставления с `group_name` в прайсе: сначала группа ПК iCafe (`pc_group_name`),
 * иначе подпись зала — иначе все ПК попадали на одну строку тарифа.
 */
export function pcPriceZoneKey(pc: PcListItem): string {
  const g = typeof pc.pc_group_name === 'string' ? pc.pc_group_name.trim() : '';
  if (g.length > 0) return normalizeZoneKey(g);
  return normalizeZoneKey(pcZoneLabel(pc));
}

/**
 * Одна «ступень сетки» почасового прайса: только длительность (мин).
 * Имена тарифа (`price_name`) у зон разные (Default / VIP / GameZone / …) — их нельзя требовать
 * совпадающими, иначе для не-Default ПК остаётся только строка Default и цена залипает на одной зоне.
 */
function priceTierSame(a: PriceItem, b: PriceItem): boolean {
  const ma = parseMinsFromPriceItem(a, 0);
  const mb = parseMinsFromPriceItem(b, 0);
  if (ma > 0 && mb > 0) return ma === mb;
  return String(a.duration ?? '') === String(b.duration ?? '');
}

function parseRubProduct(p: ProductItem): number {
  const raw = p.total_price ?? p.product_price;
  if (raw == null || raw === '') return NaN;
  const n = parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Одна «ступень» пакета: совпадают минуты сессии; имя в каталоге у разных зон разное
 * (напр. «Booking BootCamp 1 ч» vs «Booking GameZone 1 ч»), поэтому не требуем одного product_name.
 * Совпадение цены пакета отсекает разные по смыслу предложения с той же длительностью.
 */
function productTierSame(a: ProductItem, b: ProductItem): boolean {
  const ma = parseMinsFromProduct(a, 0);
  const mb = parseMinsFromProduct(b, 0);
  if (!ma || !mb || ma !== mb) return false;
  if (String(a.product_name ?? '').trim() === String(b.product_name ?? '').trim()) return true;
  const ra = parseRubProduct(a);
  const rb = parseRubProduct(b);
  if (Number.isFinite(ra) && Number.isFinite(rb) && Math.abs(ra - rb) < 0.005) return true;
  return false;
}

function pickByZone<T extends { group_name?: string; price_name?: string }>(candidates: T[], zoneKey: string): T | null {
  if (candidates.length === 0) return null;
  if (!zoneKey) {
    const ungrouped = candidates.find((c) => !c.group_name || String(c.group_name).trim() === '');
    return ungrouped ?? candidates[0] ?? null;
  }
  const exact = candidates.find((c) => normalizeZoneKey(c.group_name) === zoneKey);
  if (exact) return exact;
  const fuzzy = candidates.find((c) => zoneKeysFuzzyEqual(c.group_name, zoneKey));
  if (fuzzy) return fuzzy;
  /**
   * Если для зоны ПК нет отдельной строки в прайсе — общий тариф без `group_name` или строка Default
   * (как в реф. Android / док. vibe: иначе пакет «не найден по прайсу зала»).
   */
  const ungrouped = candidates.find((c) => !c.group_name || String(c.group_name).trim() === '');
  if (ungrouped) return ungrouped;
  const defaultNamed = candidates.find((c) => /default/i.test(String(c.price_name ?? '').trim()));
  if (defaultNamed) return defaultNamed;
  return candidates[0] ?? null;
}

/**
 * Находит строку тарифа для выбранного ПК: та же «ступень», что у шаблона (имя + длительность),
 * но с `group_name`, соответствующим зоне ПК (как GameZone vs Bootcamp в реф. Android — через id/группу в каталоге).
 */
export function resolveTariffForPc(
  template: TariffChoice,
  pc: PcListItem,
  prices: PriceItem[],
  products: ProductItem[],
): TariffChoice | null {
  const zoneKey = pcPriceZoneKey(pc);

  if (template.kind === 'price') {
    const tier = template.item;
    const candidates = prices.filter((p) => priceTierSame(p, tier));
    if (candidates.length === 0) return null;
    const hasAnyGroup = candidates.some((c) => !!c.group_name && String(c.group_name).trim() !== '');
    if (!hasAnyGroup) {
      return candidates.some((c) => c.price_id === tier.price_id) ? template : { kind: 'price', item: candidates[0] };
    }
    const picked = pickByZone(candidates, zoneKey);
    return picked ? { kind: 'price', item: picked } : null;
  }

  const tier = template.item;
  const candidates = products.filter((p) => productTierSame(p, tier));
  if (candidates.length === 0) return null;
  const hasAnyGroup = candidates.some((c) => !!c.group_name && String(c.group_name).trim() !== '');
  if (!hasAnyGroup) {
    return candidates.some((c) => c.product_id === tier.product_id) ? template : { kind: 'product', item: candidates[0] };
  }
  const picked = pickByZone(candidates, zoneKey);
  return picked ? { kind: 'product', item: picked } : null;
}

function parseRub(raw: string | undefined): number {
  if (raw == null || raw === '') return NaN;
  const n = parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * По API_VIBE: `price_price1` — цена за час; иначе `total_price` / длительность ступени (мин).
 * Итог брони по минутам: (руб/час) / 60 × минуты.
 */
export function hourlyRubPerMinuteFromPrice(p: PriceItem): number {
  const perHour = parseRub(p.price_price1);
  if (Number.isFinite(perHour) && perHour > 0) return perHour / 60;
  const total = parseRub(p.total_price);
  const tierMins = parseMinsFromPriceItem(p, 0);
  if (Number.isFinite(total) && total > 0 && tierMins > 0) return total / tierMins;
  return NaN;
}

/**
 * Диапазон ₽/час по всем зонам для выбранной длительности (VIP / Bootcamp / GameZone и т.д.).
 */
export function hourlyRubPerHourRangeForSession(
  prices: PriceItem[],
  sessionMins: number,
): { min: number; max: number } | null {
  const cands = hourlyCandidatesForSessionMins(prices, sessionMins);
  const perHour = cands
    .map((p) => {
      const rub = parseRub(p.price_price1);
      if (Number.isFinite(rub) && rub > 0) return rub;
      const total = parseRub(p.total_price);
      const tierMins = parseMinsFromPriceItem(p, sessionMins);
      if (Number.isFinite(total) && total > 0 && tierMins > 0) return (total / tierMins) * 60;
      return NaN;
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  if (perHour.length === 0) return null;
  return { min: Math.min(...perHour), max: Math.max(...perHour) };
}

/** Руб/мин для почасового тарифа (`kind === 'price'`). */
export function tariffRatePerMinuteRub(t: TariffChoice): number {
  if (t.kind === 'product') return NaN;
  return hourlyRubPerMinuteFromPrice(t.item);
}

/**
 * Пакет из каталога: `total_price` / `product_price` — цена пакета целиком (как в реф. Android для не-hourly продуктов).
 */
export function productPackagePriceRub(t: TariffChoice): number {
  if (t.kind !== 'product') return NaN;
  return parseRub(t.item.total_price ?? t.item.product_price);
}

export function totalBookingRub(
  template: TariffChoice | null,
  selectedPcs: PcListItem[],
  prices: PriceItem[],
  products: ProductItem[],
  bookingMinutes: number,
): number {
  if (!template || selectedPcs.length === 0) return NaN;
  if (!Number.isFinite(bookingMinutes) || bookingMinutes <= 0) return NaN;

  if (template.kind === 'product') {
    let sum = 0;
    for (const pc of selectedPcs) {
      const r = resolveTariffForPc(template, pc, prices, products);
      if (!r || r.kind !== 'product') return NaN;
      const flat = productPackagePriceRub(r);
      if (!Number.isFinite(flat)) return NaN;
      sum += flat;
    }
    return sum;
  }

  let sum = 0;
  for (const pc of selectedPcs) {
    const r = resolveTariffForPc(template, pc, prices, products);
    if (!r) return NaN;
    const rate = tariffRatePerMinuteRub(r);
    if (!Number.isFinite(rate)) return NaN;
    sum += rate * bookingMinutes;
  }
  return sum;
}

/**
 * Что слать в POST /booking / `booking-batch`:
 * — **пакет:** `product_id` из каталога (`/all-prices-icafe` → `products`);
 * — **почасовка:** id прайса **не передаём** — на vibe шлюз/iCafe сами выбирают тариф по ПК, слоту и `mins`
 *   (передача `price_id` из `prices[]` даёт iCafe 404 «Product not found» в фазе Buy offers).
 * Здесь `kind: 'price'` лишь значит «тариф почасовой»; сопоставление зоны нужно для цены в UI и проверки, что для зоны ПК есть строка прайса.
 */
export type BookingTariffApiIds =
  | { kind: 'product'; product_id: number }
  | { kind: 'price' };

export function bookingTariffIdsForApi(
  template: TariffChoice,
  pc: PcListItem,
  prices: PriceItem[],
  products: ProductItem[],
): BookingTariffApiIds | null {
  const r = resolveTariffForPc(template, pc, prices, products);
  if (!r) return null;
  if (r.kind === 'product') return { kind: 'product', product_id: r.item.product_id };
  return { kind: 'price' };
}
