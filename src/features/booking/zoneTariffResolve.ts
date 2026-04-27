import type { PcListItem, PriceItem, ProductItem } from '../../api/types';
import { normalizePcZoneKind, type PcZoneKind, pcZoneKindFromPc } from './pcZoneKind';
import {
  catalogProductSessionMins,
  hourlyCandidatesForSessionMins,
  isLikelyTopupOrDepositProduct,
  matchPriceTierToMinutes,
  parseMinsFromPriceItem,
  parseMinsFromProduct,
  pickHourlyTemplateForSessionMins,
  pickProductPackageForZoneKind,
  shouldChargeViaCatalogProducts,
  wheelProductPcZoneKind,
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

/** Строки прайса только с явной зоной GameZone (без VIP/BootCamp и без «общих» без group_name). */
export function priceItemsGameZoneOnly(prices: PriceItem[]): PriceItem[] {
  return prices.filter((p) => normalizePcZoneKind(p.group_name) === 'GameZone');
}

/** Пакеты каталога только GameZone — для подписи «выгоднее» в колесе времени/длительности. */
export function productItemsGameZoneOnly(products: ProductItem[]): ProductItem[] {
  return products.filter((p) => normalizePcZoneKind(p.group_name) === 'GameZone');
}

/** Строки почасового прайса под зону (VIP / BootCamp / GameZone); если зональных нет — общие без `group_name`. */
export function priceItemsForPcZoneKind(prices: PriceItem[], zone: PcZoneKind): PriceItem[] {
  if (zone === 'Other') return prices;
  const explicit = prices.filter((p) => normalizePcZoneKind(p.group_name) === zone);
  if (explicit.length > 0) return explicit;
  return prices.filter((p) => !p.group_name || String(p.group_name).trim() === '');
}

/** Пакеты каталога той же зоны; иначе общие без группы — как при сопоставлении с ПК. */
export function productItemsForPcZoneKind(products: ProductItem[], zone: PcZoneKind): ProductItem[] {
  if (zone === 'Other') return products;
  const explicit = products.filter((p) => normalizePcZoneKind(p.group_name) === zone);
  if (explicit.length > 0) return explicit;
  return products.filter((p) => !p.group_name || String(p.group_name).trim() === '');
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

/**
 * Цена пакета из каталога. Сначала `product_price` — в выдаче iCafe с участником там часто
 * фактическая сумма, а `total_price` остаётся витринной/без скидки; иначе `total_price` и запасные поля.
 */
export function productRubFromItem(p: ProductItem): number {
  const o = p as Record<string, unknown>;
  const candidates: unknown[] = [
    p.product_price,
    p.total_price,
    o.price,
    o.sum,
    o.amount,
    o.product_sum,
    o.cost,
  ];
  for (const raw of candidates) {
    if (raw == null || raw === '') continue;
    const n = parseFloat(String(raw).replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return NaN;
}

function parseRubProduct(p: ProductItem): number {
  return productRubFromItem(p);
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
 * Все строки прайса той же зоны, что и {@link pickByZone} (для выбора «лучшей» ступени среди нескольких кандидатов).
 */
function priceTiersMatchingPcZone(candidates: PriceItem[], zoneKey: string): PriceItem[] {
  if (candidates.length === 0) return [];
  if (!zoneKey) {
    const u = candidates.filter((c) => !c.group_name || String(c.group_name).trim() === '');
    return u.length > 0 ? u : [...candidates];
  }
  const exact = candidates.filter((c) => normalizeZoneKey(c.group_name) === zoneKey);
  if (exact.length > 0) return exact;
  const fuzzy = candidates.filter((c) => zoneKeysFuzzyEqual(c.group_name, zoneKey));
  if (fuzzy.length > 0) return fuzzy;
  const ungrouped = candidates.filter((c) => !c.group_name || String(c.group_name).trim() === '');
  if (ungrouped.length > 0) return ungrouped;
  const def = candidates.filter((c) => /default/i.test(String(c.price_name ?? '').trim()));
  if (def.length > 0) return def;
  return [...candidates];
}

/**
 * Среди кандидатов с одинаковой «близостью» к опорным минутам — зона как у пакета и **максимальная** опорная ₽/ч
 * (не первая строка в ответе API и не заниженная колонка).
 */
function pickBestHourlyStickerTierForBaseline(candidates: PriceItem[], zoneKey: string): PriceItem | null {
  const zoned = priceTiersMatchingPcZone(candidates, zoneKey);
  if (zoned.length === 0) return null;
  return pickPriceTierWithMaxHourlyRubForBaseline(zoned);
}

/**
 * Ключ зоны для сопоставления строк `prices`: у пакета зона часто только в имени (`<<<GZ`), не в `group_name` —
 * иначе `zoneKey` пустой и берётся не та ступень / заниженная ₽/ч (~50% вместо ~75%).
 */
function zoneKeyForPackageHourlyBaseline(product: ProductItem, zoneFilteredPrices: PriceItem[]): string {
  const fromProd = normalizeZoneKey(product.group_name);
  if (fromProd) return fromProd;
  const wz = wheelProductPcZoneKind(product);
  const named = zoneFilteredPrices.filter((p) => p.group_name && String(p.group_name).trim() !== '');
  for (const p of named) {
    if (normalizePcZoneKind(p.group_name) === wz) return normalizeZoneKey(p.group_name);
  }
  if (named.length > 0) return normalizeZoneKey(named[0]!.group_name);
  return '';
}

/** Среди ступеней одной длительности — строка с максимальной опорной ₽/ч (стандартная почасовка vs колонка со скидкой). */
function pickPriceTierWithMaxHourlyRubForBaseline(tiers: PriceItem[]): PriceItem | null {
  let best: PriceItem | null = null;
  let bestRub = -1;
  for (const p of tiers) {
    const r = hourlyRubForPackageSavingBaseline(p);
    if (r != null && Number.isFinite(r) && r > bestRub) {
      bestRub = r;
      best = p;
    }
  }
  return best;
}

/**
 * Опорная строка для «листовой» ₽/ч по зоне: **максимум** {@link hourlyRubForPackageSavingBaseline} среди всех ступеней.
 * Раньше брали только 60→30 мин — оставалась низкая колонка `total_price` или не находилась строка с `price_price1`
 * на длинной ступени (~50% вместо ~75%). Каталожное масштабирование короткого пакета тогда подменяло почасовку.
 */
function pickMaxHourlyStickerTierForZoneBaseline(prices: PriceItem[], zoneKey: string): PriceItem | null {
  const zoned = priceTiersMatchingPcZone(prices, zoneKey);
  if (zoned.length === 0) return null;
  return pickPriceTierWithMaxHourlyRubForBaseline(zoned);
}

/** P_база = «цена простого часа» × (сессия в часах), без дешёвой средней с длинной ступени сетки. */
function hourlyBaselineTotalFromCanonicalZoneSticker(
  sessionMins: number,
  prices: PriceItem[],
  zoneKey: string,
): number | null {
  const ref = pickMaxHourlyStickerTierForZoneBaseline(prices, zoneKey);
  if (!ref) return null;
  const hourRub = hourlyRubForPackageSavingBaseline(ref);
  if (hourRub == null || hourRub <= 0) return null;
  return hourRub * (sessionMins / 60);
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
  const templateMins = catalogProductSessionMins(tier);
  const candidates =
    templateMins != null && templateMins > 0
      ? products.filter(
          (p) =>
            !isLikelyTopupOrDepositProduct(p) && catalogProductSessionMins(p) === templateMins,
        )
      : products.filter((p) => productTierSame(p, tier));
  if (candidates.length === 0) return null;
  const picked = pickProductPackageForZoneKind(candidates, pcZoneKindFromPc(pc));
  return picked ? { kind: 'product', item: picked } : null;
}

/**
 * Пакет 3 ч / 5 ч: строка каталога с `group_name` под зону ПК; без группы — если нет зонных строк.
 * Не подставляет пакет другой зоны (VIP vs GameZone).
 */
function pickBookingPackageForPc(pool: ProductItem[], pc: PcListItem): ProductItem | null {
  return pickProductPackageForZoneKind(pool, pcZoneKindFromPc(pc));
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
 * Стоимость по строке прайса для зоны ПК: если ступень совпадает с длительностью сессии —
 * цена блока из `total_price` (как у пакета в сетке), а не (₽/ч из `price_price1`) × минуты.
 */
export function priceBookingRubForResolvedTier(
  prices: PriceItem[],
  zoneResolvedTier: PriceItem,
  bookingMinutes: number,
): number {
  const matched = matchPriceTierToMinutes(prices, zoneResolvedTier, bookingMinutes);
  const tierMins = parseMinsFromPriceItem(matched, bookingMinutes);
  const block = parseRub(matched.total_price);
  if (tierMins === bookingMinutes && Number.isFinite(block) && block > 0) {
    return block;
  }
  const rate = hourlyRubPerMinuteFromPrice(matched);
  if (!Number.isFinite(rate) || rate <= 0) return NaN;
  return rate * bookingMinutes;
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
 * Пакет из каталога — цена пакета целиком (та же логика полей, что {@link productRubFromItem}).
 */
export function productPackagePriceRub(t: TariffChoice): number {
  if (t.kind !== 'product') return NaN;
  return productRubFromItem(t.item);
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

  /** Длительность из каталога `products` с сервера — цена по зоне ПК, не сетка `prices`. */
  if (shouldChargeViaCatalogProducts(products, bookingMinutes)) {
    const poolAll = products.filter((p) => catalogProductSessionMins(p) === bookingMinutes);
    if (poolAll.length === 0) return NaN;
    let sum = 0;
    for (const pc of selectedPcs) {
      const picked = pickBookingPackageForPc(poolAll, pc);
      if (!picked) return NaN;
      const flat = productRubFromItem(picked);
      if (!Number.isFinite(flat)) return NaN;
      sum += flat;
    }
    return sum;
  }

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
    if (!r || r.kind !== 'price') return NaN;
    const rub = priceBookingRubForResolvedTier(prices, r.item, bookingMinutes);
    if (!Number.isFinite(rub)) return NaN;
    sum += rub;
  }
  return sum;
}

function hourlyTotalAndPackageRub(
  product: ProductItem,
  prices: PriceItem[],
): { hourlyTotal: number; pkg: number } | null {
  if (!prices.length) return null;
  const sessionMins = parseMinsFromProduct(product, 0);
  if (!sessionMins || sessionMins <= 0) return null;
  const cands = hourlyCandidatesForSessionMins(prices, sessionMins);
  if (cands.length === 0) return null;
  const zoneKey = normalizeZoneKey(product.group_name);
  const hourly = pickByZone(cands, zoneKey);
  if (!hourly) return null;
  const rate = hourlyRubPerMinuteFromPrice(hourly);
  const pkg = productRubFromItem(product);
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(pkg) || pkg <= 0) return null;
  const hourlyTotal = rate * sessionMins;
  return { hourlyTotal, pkg };
}

/**
 * Если нет строки прайса «ровно под длительность пакета», сравниваем с почасовкой от короткой ступени
 * (60 → 30 → 90 → 120 мин) в той же зоне — в API часто нет ровно 60 мин, и выгода не считалась.
 */
/** Опорные короткие ступени из сетки (в API не всегда есть 60/30 мин в фиксированном виде). */
function distinctShortRefMinutesFromPrices(prices: PriceItem[], sessionMins: number): number[] {
  const extra = new Set<number>();
  for (const p of prices) {
    const m = parseMinsFromPriceItem(p, 0);
    if (m > 0 && m < sessionMins) extra.add(m);
  }
  const head = [60, 30, 90, 45, 120].filter((x) => x < sessionMins);
  const rest = [...extra].filter((x) => !head.includes(x)).sort((a, b) => a - b);
  return [...head, ...rest];
}

function hourlyTotalFrom60MinExtrapolation(product: ProductItem, prices: PriceItem[]): number | null {
  const sessionMins = parseMinsFromProduct(product, 0);
  if (!sessionMins || sessionMins <= 0 || !prices.length) return null;
  const zoneKey = zoneKeyForPackageHourlyBaseline(product, prices);

  const canon = hourlyBaselineTotalFromCanonicalZoneSticker(sessionMins, prices, zoneKey);
  if (canon != null && Number.isFinite(canon) && canon > 0) return canon;

  let bestTotal: number | null = null;
  for (const refMins of distinctShortRefMinutesFromPrices(prices, sessionMins)) {
    const cands = hourlyCandidatesForSessionMins(prices, refMins);
    if (cands.length === 0) continue;
    const hourly = pickBestHourlyStickerTierForBaseline(cands, zoneKey);
    if (!hourly) continue;
    const hourRub = hourlyRubForPackageSavingBaseline(hourly);
    if (hourRub == null || !Number.isFinite(hourRub) || hourRub <= 0) continue;
    const total = hourRub * (sessionMins / 60);
    if (bestTotal == null || total > bestTotal) bestTotal = total;
  }
  return bestTotal;
}

/** Ключ зоны для листовых строк выбранной зоны (подпись «выгоднее» от той зоны, где выбран ПК). */
function baselineZoneKeyFromPrices(zonePrices: PriceItem[], zone: PcZoneKind): string {
  if (zonePrices.length === 0) return '';
  const row =
    zonePrices.find((p) => normalizePcZoneKind(p.group_name) === zone) ?? zonePrices[0]!;
  const g = row.group_name?.trim();
  return g ? normalizeZoneKey(g) : normalizeZoneKey(zone);
}

/** База P_прив для подписи «выгоднее»: листовая почасовка выбранной зоны (₽/ч × часы). */
function hourlyTotalBaselineZoneListOnly(
  product: ProductItem,
  allPrices: PriceItem[],
  zone: PcZoneKind,
): number | null {
  const zonePrices = priceItemsForPcZoneKind(allPrices, zone);
  if (zonePrices.length === 0) return null;
  const sessionMins = parseMinsFromProduct(product, 0);
  if (!sessionMins || sessionMins <= 0) return null;
  const zoneKey = baselineZoneKeyFromPrices(zonePrices, zone);

  const canon = hourlyBaselineTotalFromCanonicalZoneSticker(sessionMins, zonePrices, zoneKey);
  if (canon != null && Number.isFinite(canon) && canon > 0) return canon;

  let bestTotal: number | null = null;
  for (const refMins of distinctShortRefMinutesFromPrices(zonePrices, sessionMins)) {
    const cands = hourlyCandidatesForSessionMins(zonePrices, refMins);
    if (cands.length === 0) continue;
    const hourly = pickBestHourlyStickerTierForBaseline(cands, zoneKey);
    if (!hourly) continue;
    const hourRub = hourlyRubForPackageSavingBaseline(hourly);
    if (hourRub == null || !Number.isFinite(hourRub) || hourRub <= 0) continue;
    const total = hourRub * (sessionMins / 60);
    if (bestTotal == null || total > bestTotal) bestTotal = total;
  }
  return bestTotal;
}

/**
 * Когда в ответе API нет строк `prices` (только каталог `products`), сравниваем длинный пакет
 * с коротким пакетом той же зоны (60 → 30 мин) линейным масштабированием — иначе процента не бывает.
 */
function hourlyTotalFromProductCatalogBench(product: ProductItem, catalog: ProductItem[]): number | null {
  if (!catalog.length) return null;
  const sessionMins = parseMinsFromProduct(product, 0);
  if (!sessionMins || sessionMins <= 0) return null;
  const zoneKey = normalizeZoneKey(product.group_name);

  const rub = (p: ProductItem) => productRubFromItem(p);

  const tryTier = (mins: number): number | null => {
    /** Без исключения текущего продукта пул мог содержать только его же → база = цена пакета → 0% выгоды. */
    const pool = catalog.filter(
      (p) => parseMinsFromProduct(p, 0) === mins && p.product_id !== product.product_id,
    );
    if (pool.length === 0) return null;
    const row = pickByZone(pool, zoneKey);
    if (!row) return null;
    const total = rub(row);
    if (!Number.isFinite(total) || total <= 0) return null;
    return total * (sessionMins / mins);
  };

  const fromShorterPackage =
    tryTier(60) ??
    tryTier(30) ??
    tryTier(90) ??
    tryTier(120) ??
    tryTier(180) ??
    tryTier(240) ??
    catalogBenchFromShortestSibling(product, catalog, sessionMins, rub);

  return fromShorterPackage;
}

/** Только длинные пакеты (3 ч / 4 ч / 5 ч): берём самый короткий другой пакет в зоне и линейно масштабируем. */
function catalogBenchFromShortestSibling(
  product: ProductItem,
  catalog: ProductItem[],
  sessionMins: number,
  rub: (p: ProductItem) => number,
): number | null {
  const rows = catalog
    .filter((p) => p.product_id !== product.product_id)
    .map((p) => ({ p, m: parseMinsFromProduct(p, 0), r: rub(p) }))
    .filter((x) => x.m > 0 && Number.isFinite(x.r) && x.r > 0);
  if (rows.length === 0) return null;
  const inZone = rows.filter((x) => zoneKeysFuzzyEqual(x.p.group_name, product.group_name));
  const pool = inZone.length > 0 ? inZone : rows;
  const ref = pool.reduce((a, b) => (a.m <= b.m ? a : b));
  return ref.r * (sessionMins / ref.m);
}

/**
 * База для «выгоды»: сколько бы стоила та же сессия по ставке с короткой ступени сетки (60→30→…),
 * т.е. ₽/час × часы — без завышения через max по другим ступеням/зонам.
 */
function hourlyBaselineRubForPackageSavings(
  product: ProductItem,
  prices: PriceItem[],
  catalog: ProductItem[],
): number | null {
  if (prices.length > 0) {
    const ex = hourlyTotalFrom60MinExtrapolation(product, prices);
    if (ex != null && Number.isFinite(ex) && ex > 0) return ex;
  }
  const fromCatalog = hourlyTotalFromProductCatalogBench(product, catalog);
  if (fromCatalog != null && Number.isFinite(fromCatalog) && fromCatalog > 0) return fromCatalog;
  return null;
}

/**
 * На сколько ₽ пакет дешевле той же длительности по почасовой строке сопоставимой зоны (если в `prices` есть ступень под эти минуты).
 */
export function packageSavingVsHourlyRub(product: ProductItem, prices: PriceItem[]): number | null {
  const r = hourlyTotalAndPackageRub(product, prices);
  if (!r) return null;
  const saving = r.hourlyTotal - r.pkg;
  return saving > 0.5 ? saving : null;
}

/**
 * Округление процента выгоды **вверх** до кратного 5 (73,3% → 75%; не «до ближайшего»).
 */
export function ceilPercentToMultipleOf5(rawPercent: number): number {
  if (!Number.isFinite(rawPercent) || rawPercent <= 0) return 0;
  return Math.ceil(rawPercent / 5) * 5;
}

/** @deprecated Используйте {@link ceilPercentToMultipleOf5} (теперь то же поведение — вверх до ×5). */
export const roundPercentNearestMultipleOf5 = ceilPercentToMultipleOf5;

/**
 * На сколько процентов пакет дешевле почасовки на ту же длительность:
 * 1) **P_прив** = цена за 1 час × число часов в пакете (приводим 1 ч к длительности пакета);
 * 2) сырой % = **(P_прив − P_пакет) / P_прив × 100**;
 * 3) в UI: {@link ceilPercentToMultipleOf5}.
 * P_прив берётся из опорной короткой ступени (60→30 мин, приоритет `price_price1`).
 */
export function packageSavingPercentVsHourly(
  product: ProductItem,
  prices: PriceItem[],
  catalog: ProductItem[] = [],
): number | null {
  const pkg = productRubFromItem(product);
  if (!Number.isFinite(pkg) || pkg <= 0) return null;

  const hourlyTotal = hourlyBaselineRubForPackageSavings(product, prices, catalog);
  if (hourlyTotal == null || !Number.isFinite(hourlyTotal) || hourlyTotal <= 0) return null;

  const saving = hourlyTotal - pkg;
  if (saving <= 0.5) return null;
  const rawPct = (saving / hourlyTotal) * 100;
  const pct = ceilPercentToMultipleOf5(rawPct);
  return pct > 0 ? pct : null;
}

/**
 * Опорная «короткая» ступень сетки: перебираем 60/30/… и все реальные длительности из `prices`, короче сессии.
 */
function pickBaselineShortTierForGrid(prices: PriceItem[], sessionMins: number): PriceItem | null {
  for (const refMins of distinctShortRefMinutesFromPrices(prices, sessionMins)) {
    const tpl = pickHourlyTemplateForSessionMins(prices, refMins);
    if (!tpl) continue;
    const refTier = matchPriceTierToMinutes(prices, tpl, refMins);
    const r = hourlyRubPerMinuteFromPrice(refTier);
    if (Number.isFinite(r) && r > 0) return refTier;
  }
  return null;
}

/**
 * Ступень длительности только из сетки `prices` (без `products`): на сколько % дешевле оплата по строке этой длительности,
 * чем если бы ту же сессию считали по минутной ставке короткой ступени (60 → 30 …). Если выгоды нет — null.
 */
export function gridPriceTierSavingPercentVsHourly(
  sessionMins: number,
  prices: PriceItem[],
): number | null {
  if (!prices.length || sessionMins < 60) return null;
  const tplLong = pickHourlyTemplateForSessionMins(prices, sessionMins);
  if (!tplLong) return null;
  const longTier = matchPriceTierToMinutes(prices, tplLong, sessionMins);
  const baselineTier = pickBaselineShortTierForGrid(prices, sessionMins);
  if (!baselineTier) return null;
  const rLong = hourlyRubPerMinuteFromPrice(longTier);
  const rBaseline = hourlyRubPerMinuteFromPrice(baselineTier);
  if (!Number.isFinite(rLong) || !Number.isFinite(rBaseline) || rLong <= 0 || rBaseline <= 0) return null;
  const payLong = rLong * sessionMins;
  const payIfShortTariff = rBaseline * sessionMins;
  if (payIfShortTariff <= payLong + 0.5) return null;
  const rawPct = ((payIfShortTariff - payLong) / payIfShortTariff) * 100;
  const pct = ceilPercentToMultipleOf5(rawPct);
  return pct > 0 ? pct : null;
}

/**
 * Опорная ₽/ч по сетке зоны: максимум среди всех ступеней (как {@link pickMaxHourlyStickerTierForZoneBaseline}),
 * чтобы не терять `price_price1` на строке 180 мин, когда нет 60/30.
 */
function pickGameZoneGridRefStickerRow(gzPrices: PriceItem[]): PriceItem | null {
  if (!gzPrices.length) return null;
  return pickPriceTierWithMaxHourlyRubForBaseline(gzPrices);
}

/**
 * Эффективная «цена за час» с короткой ступени: сначала `price_price1`, иначе из total/duration.
 */
function stickerHourlyRubFromGridRefRow(ref: PriceItem): number | null {
  const ph = parseRub(ref.price_price1);
  if (Number.isFinite(ph) && ph > 0) return ph;
  const tierMins = parseMinsFromPriceItem(ref, 0);
  const total = parseRub(ref.total_price);
  if (Number.isFinite(total) && total > 0 && tierMins > 0) return (total / tierMins) * 60;
  return null;
}

/**
 * Стоимость «простых» 60 минут по сетке: для строки ровно на 60 мин — `total_price` (цена слота часа),
 * для 30 мин — эквивалент 60 мин через total/duration.
 */
function simpleSixtyMinuteSlotRubFromRef(ref: PriceItem): number | null {
  const tierMins = parseMinsFromPriceItem(ref, 0);
  const total = parseRub(ref.total_price);
  if (tierMins === 60 && Number.isFinite(total) && total > 0) return total;
  if (tierMins === 30 && Number.isFinite(total) && total > 0) return (total / 30) * 60;
  return stickerHourlyRubFromGridRefRow(ref);
}

/**
 * Один «час» для сравнения с пакетом: сначала явная почасовка `price_price1`, иначе слот из `total_price`
 * (как {@link simpleSixtyMinuteSlotRubFromRef}). Иначе при разных total и ₽/ч занижалась база (~45% вместо ~75%).
 */
function hourlyRubForPackageSavingBaseline(ref: PriceItem): number | null {
  const ph = parseRub(ref.price_price1);
  if (Number.isFinite(ph) && ph > 0) return ph;
  return simpleSixtyMinuteSlotRubFromRef(ref);
}

/**
 * GameZone: **₽/ч внутри пакета** = `packageTotalRub / (sessionMins/60)`,
 * сравнение с **₽ за «простой» час** (строка 60 мин в сетке, иначе 30 → приведение к 60 мин).
 * Если пакет дешевле — та же формула, что {@link packageSavingPercentVsHourly}: (P_прив − P_факт) / P_прив × 100, затем {@link ceilPercentToMultipleOf5}.
 * Если сравнение возможно, но выгоды нет — **0** (в UI: «Выгоднее на 0%»).
 */
export function gameZonePerHourPackageSavingPercent(
  sessionMins: number,
  packageTotalRub: number,
  gzPrices: PriceItem[],
): number | null {
  if (!gzPrices.length || sessionMins < 60) return null;
  if (!Number.isFinite(packageTotalRub) || packageTotalRub <= 0) return null;
  const hours = sessionMins / 60;
  if (hours <= 0) return null;

  const ref = pickGameZoneGridRefStickerRow(gzPrices);
  if (!ref) return null;
  const simpleHourRub = hourlyRubForPackageSavingBaseline(ref);
  if (simpleHourRub == null || simpleHourRub <= 0) return null;

  const baseRub = simpleHourRub * hours;
  if (packageTotalRub + 0.5 >= baseRub) return 0;

  const rawPct = (1 - packageTotalRub / baseRub) * 100;
  const pct = ceilPercentToMultipleOf5(rawPct);
  return pct > 0 ? pct : 0;
}

/**
 * Сетка без `products`: цена блока из `total_price` ступени длительности сессии.
 * @deprecated имя оставлено для тестов; логика = {@link gameZonePerHourPackageSavingPercent}.
 */
export function gridGameZoneStickerHoursVsTierLumpPercent(
  sessionMins: number,
  gzPrices: PriceItem[],
): number | null {
  const tpl = pickHourlyTemplateForSessionMins(gzPrices, sessionMins);
  if (!tpl) return null;
  const lumpRow = matchPriceTierToMinutes(gzPrices, tpl, sessionMins);
  const lumpRub = parseRub(lumpRow.total_price);
  if (!Number.isFinite(lumpRub) || lumpRub <= 0) return null;
  return gameZonePerHourPackageSavingPercent(sessionMins, lumpRub, gzPrices);
}

/** Сетка GameZone: сначала стикер×часы vs lump, затем сравнение короткой/длинной поминутной ступени. */
export function gameZoneGridWheelSavingPercent(sessionMins: number, gzPrices: PriceItem[]): number | null {
  if (!gzPrices.length) return null;
  return (
    gridGameZoneStickerHoursVsTierLumpPercent(sessionMins, gzPrices) ??
    gridPriceTierSavingPercentVsHourly(sessionMins, gzPrices)
  );
}

/**
 * Экстраполяция от более коротких пакетов в зоне (и при необходимости по всему каталогу): «если бы платили как за короткий × длина».
 */
function percentFromLinearShorterPackages(product: ProductItem, catalog: ProductItem[]): number | null {
  const pkg = productRubFromItem(product);
  const M = parseMinsFromProduct(product, 0);
  if (!Number.isFinite(pkg) || pkg <= 0 || !M) return null;

  const benchFor = (allowAnyZone: boolean): number => {
    let bestBench = 0;
    for (const o of catalog) {
      if (o.product_id === product.product_id) continue;
      if (!allowAnyZone && !zoneKeysFuzzyEqual(o.group_name, product.group_name)) continue;
      const m2 = parseMinsFromProduct(o, 0);
      const p2 = productRubFromItem(o);
      if (!Number.isFinite(p2) || p2 <= 0 || m2 <= 0 || m2 >= M) continue;
      const bench = p2 * (M / m2);
      if (bench > bestBench) bestBench = bench;
    }
    return bestBench;
  };

  const tryPct = (bench: number): number | null => {
    if (bench - pkg <= 0.5) return null;
    const pct = ceilPercentToMultipleOf5(((bench - pkg) / bench) * 100);
    return pct > 0 ? pct : null;
  };

  return tryPct(benchFor(false)) ?? tryPct(benchFor(true));
}

/**
 * Любой другой пакет в каталоге, линейно доведённый до M минут; берём максимум как «альтернативу без этой цены».
 * Покрывает 3 ч / 4 ч / 5 ч, когда короче текущего пакета нет, но длиннее есть (масштаб вниз с 4 ч→3 ч и т.д.).
 */
function percentFromMaxLinearAlternativeAmongCatalog(product: ProductItem, catalog: ProductItem[]): number | null {
  const pkg = productRubFromItem(product);
  const M = parseMinsFromProduct(product, 0);
  if (!Number.isFinite(pkg) || pkg <= 0 || !M) return null;
  let maxBench = 0;
  for (const o of catalog) {
    if (o.product_id === product.product_id) continue;
    const m2 = parseMinsFromProduct(o, 0);
    const p2 = productRubFromItem(o);
    if (!Number.isFinite(p2) || p2 <= 0 || !m2 || m2 === M) continue;
    const bench = p2 * (M / m2);
    if (bench > maxBench) maxBench = bench;
  }
  if (maxBench - pkg <= 0.5) return null;
  const pct = ceilPercentToMultipleOf5(((maxBench - pkg) / maxBench) * 100);
  return pct > 0 ? pct : null;
}

/** Эталон для подписи «выгоднее»: пакет той же длительности в выбранной зоне ПК. */
export function wheelZoneProductForSavingLabel(
  product: ProductItem,
  catalog: ProductItem[],
  zone: PcZoneKind,
): ProductItem {
  const sessionMins = catalogProductSessionMins(product) ?? parseMinsFromProduct(product, 0);
  if (!sessionMins || sessionMins <= 0 || !catalog.length) return product;
  const pool = catalog.filter(
    (p) => !isLikelyTopupOrDepositProduct(p) && catalogProductSessionMins(p) === sessionMins,
  );
  if (pool.length === 0) return product;
  return pickProductPackageForZoneKind(pool, zone) ?? product;
}

/** @deprecated Используйте {@link wheelZoneProductForSavingLabel} с явной зоной. */
export function wheelGameZoneProductForSavingLabel(product: ProductItem, catalog: ProductItem[]): ProductItem {
  return wheelZoneProductForSavingLabel(product, catalog, 'GameZone');
}

/**
 * Процент для подписи в колесе: сравнение цены пакета с листовой почасовкой выбранной зоны.
 */
export function packageSavingPercentForWheel(
  product: ProductItem,
  prices: PriceItem[],
  catalog: ProductItem[] = [],
  zone: PcZoneKind = 'GameZone',
): number | null {
  const sessionMins = parseMinsFromProduct(product, 0);
  if (!sessionMins || sessionMins <= 0) return null;

  const ref = wheelZoneProductForSavingLabel(product, catalog, zone);
  const zonePrices = priceItemsForPcZoneKind(prices, zone);
  const zoneKey = zonePrices.length > 0 ? baselineZoneKeyFromPrices(zonePrices, zone) : '';
  const zoneCatalog = productItemsForPcZoneKind(catalog, zone);
  const catalogPool = zoneCatalog.length > 0 ? zoneCatalog : catalog;

  const pkg = productRubFromItem(ref);
  if (!Number.isFinite(pkg) || pkg <= 0) return null;

  const hasGridHourlyBaseline =
    zonePrices.length > 0 && pickMaxHourlyStickerTierForZoneBaseline(zonePrices, zoneKey) != null;

  if (zonePrices.length > 0) {
    const baseEx = hourlyTotalBaselineZoneListOnly(ref, prices, zone);
    if (baseEx != null && Number.isFinite(baseEx) && baseEx > 0) {
      if (pkg + 0.5 >= baseEx) return 0;
      const rawPct = (1 - pkg / baseEx) * 100;
      const pct = ceilPercentToMultipleOf5(rawPct);
      return pct > 0 ? pct : 0;
    }
    const perHourPct = gameZonePerHourPackageSavingPercent(sessionMins, pkg, zonePrices);
    if (perHourPct != null) return perHourPct;
  }

  /**
   * Если в `prices` уже есть строки с опорной ₽/ч, не подменяем почасовку масштабированием короткого пакета
   * из каталога — иначе получалось ~50% / ~20% вместо сравнения с «листом» ₽/ч × часы.
   */
  if (!hasGridHourlyBaseline) {
    const fromCatalogBench = hourlyTotalFromProductCatalogBench(ref, catalogPool);
    if (fromCatalogBench != null && Number.isFinite(fromCatalogBench) && fromCatalogBench > pkg + 0.5) {
      const pct = ceilPercentToMultipleOf5(((fromCatalogBench - pkg) / fromCatalogBench) * 100);
      if (pct > 0) return pct;
    }

    const lin = percentFromLinearShorterPackages(ref, catalogPool);
    if (lin != null) return lin;

    const anyLin = percentFromMaxLinearAlternativeAmongCatalog(ref, catalogPool);
    if (anyLin != null) return anyLin;
  }

  /**
   * Не используем {@link gameZoneGridWheelSavingPercent} здесь: там сравнение **ступени сетки** (lump `total_price`)
   * с почасовкой, без цены пакета из каталога — на экране получалось «50%» при (P_лист − P_блок_сетки)/P_лист,
   * хотя нужно (P_лист − P_пакет_каталога)/P_лист.
   */

  return null;
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
  bookingMinutes: number,
): BookingTariffApiIds | null {
  if (shouldChargeViaCatalogProducts(products, bookingMinutes)) {
    const pool = products.filter((p) => catalogProductSessionMins(p) === bookingMinutes);
    const picked = pickBookingPackageForPc(pool, pc);
    if (picked) return { kind: 'product', product_id: picked.product_id };
    return null;
  }
  const r = resolveTariffForPc(template, pc, prices, products);
  if (!r) return null;
  if (r.kind === 'product') return { kind: 'product', product_id: r.item.product_id };
  return { kind: 'price' };
}
