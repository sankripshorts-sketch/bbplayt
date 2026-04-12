import type { PriceItem, ProductItem } from '../../api/types';
import type { SavedTariffPreference } from '../../preferences/appPreferences';

export type TariffChoice =
  | { kind: 'product'; item: ProductItem }
  | { kind: 'price'; item: PriceItem };

function formatRub(raw: string | undefined): string {
  if (!raw) return '—';
  const n = parseFloat(String(raw).replace(',', '.'));
  if (Number.isFinite(n)) return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2);
  return raw;
}

export function productCostLabel(p: ProductItem): string {
  return formatRub(p.total_price ?? p.product_price);
}

export function priceCostLabel(p: PriceItem): string {
  return formatRub(p.total_price ?? p.price_price1);
}

/**
 * Чистое число в `duration` из iCafe: обычно минуты (30, 60, 90…), но встречается «1» = 1 ч
 * и 2…6 как часы — иначе подбор ступени к 60 мин даёт чужой `price_id` → «Product not found».
 */
function parseDigitOnlyDurationToMins(raw: string): number | null {
  const d = raw.trim();
  if (!/^\d+$/.test(d)) return null;
  const n = parseInt(d, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 7) return n;
  if (n === 1) return 60;
  if (n >= 2 && n <= 6) return n * 60;
  return n;
}

export function parseMinsFromProduct(p: ProductItem | null, fallback: number): number {
  const fb = Number.isFinite(fallback) && fallback > 0 ? Math.round(fallback) : 60;
  if (!p) return fb;
  if (p.duration_min != null && String(p.duration_min).length > 0) {
    const n = parseInt(String(p.duration_min), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const d = p.duration;
  if (d) {
    const ds = String(d).trim();
    if (/^\d+$/.test(ds)) {
      const asMins = parseDigitOnlyDurationToMins(ds);
      if (asMins != null) return asMins;
      const n = parseInt(ds, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const mm = /(\d+)\s*(?:мин|min)/i.exec(d);
    if (mm) return parseInt(mm[1], 10);
    const hh = /(\d+)\s*(?:ч|h)/i.exec(d);
    if (hh) return parseInt(hh[1], 10) * 60;
  }
  return fb;
}

/**
 * Почасовой тариф из `all-prices-icafe` → минуты.
 * В ответе vibe/iCafe чаще всего `duration` в минутах; реже — часы одной цифрой (см. выше).
 */
export function parseMinsFromPriceItem(p: PriceItem, fallback: number): number {
  const d = String(p.duration ?? '').trim();
  if (d) {
    const digitMins = parseDigitOnlyDurationToMins(d);
    if (digitMins != null) return digitMins;
    const mm = /(\d+)\s*(?:мин|min)/i.exec(d);
    if (mm) return parseInt(mm[1], 10);
    const hh = /(\d+)\s*(?:ч|h)/i.exec(d);
    if (hh) return parseInt(hh[1], 10) * 60;
  }
  return fallback;
}

export function tariffMins(t: TariffChoice | null, fallback: number): number {
  if (!t) return fallback;
  return t.kind === 'product'
    ? parseMinsFromProduct(t.item, fallback)
    : parseMinsFromPriceItem(t.item, fallback);
}

/**
 * После выбора строки каталога: длительность брони (мин) не должна цепляться к «1 мин» из ставки за минуту.
 * Для product оставляем длительность из пакета; для price — сохраняем уже введённые минуты или fallback.
 */
export function bookingMinsAfterTariffSelect(
  t: TariffChoice,
  previousMinsStr: string,
  fallback = 60,
): string {
  if (t.kind === 'product') {
    return String(parseMinsFromProduct(t.item, fallback));
  }
  const prev = Number(previousMinsStr);
  if (Number.isFinite(prev) && prev > 0) return String(prev);
  return String(fallback);
}

export function tariffCostLabel(t: TariffChoice | null): string {
  if (!t) return '—';
  if (t.kind === 'product') {
    return `${productCostLabel(t.item)} ₽`;
  }
  const p = t.item;
  if (p.price_price1 != null && String(p.price_price1).trim() !== '') {
    return `${formatRub(p.price_price1)} ₽/час`;
  }
  return `${priceCostLabel(p)} ₽/мин`;
}

export function tariffNameForApi(t: TariffChoice | null): string {
  if (!t) return '';
  return t.kind === 'product' ? t.item.product_name : t.item.price_name;
}

/** Только пакет (для отладки/логики): в POST /booking уходит `product_id`, не `price_id`. */
export function tariffBookingPriceId(t: TariffChoice | null): number | undefined {
  if (!t || t.kind !== 'product') return undefined;
  return t.item.product_id;
}

/** Одна ступень почасового тарифа: на бэкенде часто один `price_id` на все длительности. */
export function priceItemsEqual(a: PriceItem, b: PriceItem): boolean {
  if (a.price_id !== b.price_id) return false;
  if (String(a.group_name ?? '') !== String(b.group_name ?? '')) return false;
  if (String(a.total_price ?? '') !== String(b.total_price ?? '')) return false;
  const da = parseMinsFromPriceItem(a, 0);
  const db = parseMinsFromPriceItem(b, 0);
  if (da > 0 && db > 0 && da === db) return true;
  return String(a.duration ?? '') === String(b.duration ?? '');
}

/** Среди строк с тем же `price_id` и зоной выбирает ступень с ближайшим `duration` (мин) к запрошенной длительности сессии. */
export function matchPriceTierToMinutes(prices: PriceItem[], template: PriceItem, sessionMins: number): PriceItem {
  const sameFamily = prices.filter(
    (p) =>
      p.price_id === template.price_id &&
      String(p.group_name ?? '') === String(template.group_name ?? ''),
  );
  if (sameFamily.length === 0) return template;
  let best = sameFamily[0]!;
  let bestDiff = Infinity;
  for (const p of sameFamily) {
    const tierMins = parseMinsFromPriceItem(p, sessionMins);
    const diff = Math.abs(tierMins - sessionMins);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best;
}

/** Все строки почасового тарифа с той же «близостью» длительности к сессии (разные `group_name` / зоны). */
export function hourlyCandidatesForSessionMins(prices: PriceItem[], sessionMins: number): PriceItem[] {
  if (!prices.length) return [];
  const scored = prices.map((p) => ({
    p,
    diff: Math.abs(parseMinsFromPriceItem(p, sessionMins) - sessionMins),
  }));
  const bestDiff = Math.min(...scored.map((s) => s.diff));
  return scored.filter((s) => s.diff === bestDiff).map((s) => s.p);
}

/** Одна строка почасового тарифа под выбранную длительность (шаблон для сопоставления зон на ПК). */
export function pickHourlyTemplateForSessionMins(prices: PriceItem[], sessionMins: number): PriceItem | null {
  const pool = hourlyCandidatesForSessionMins(prices, sessionMins);
  if (pool.length === 0) return null;
  const preferred = pool.find((p) => /default/i.test(String(p.price_name ?? '').trim()));
  if (preferred) return preferred;
  /** Стабильный выбор при нескольких зонах: лексикографически по зоне, чтобы не «залипать» на одной строке каталога. */
  const sorted = [...pool].sort((a, b) =>
    String(a.group_name ?? '').localeCompare(String(b.group_name ?? ''), undefined, { sensitivity: 'base' }),
  );
  return sorted[0] ?? null;
}

/** Подпись почасовой ступени: имя, минуты строки тарифа, ставка (из API — чаще ₽/час), зона. */
export function priceHourlyStepLabel(p: PriceItem): string {
  const name = String(p.price_name ?? '').trim();
  const hasHour = p.price_price1 != null && String(p.price_price1).trim() !== '';
  const rub = hasHour ? formatRub(p.price_price1) : priceCostLabel(p);
  const unit = hasHour ? '₽/час' : '₽/мин';
  const tierMins = parseMinsFromPriceItem(p, 0);
  const durPart = tierMins > 0 ? `${tierMins} мин` : String(p.duration ?? '').trim() || '—';
  const zone = tierSuffixIfDistinct(name, p.group_name);
  return `«${name}» · ${durPart} · ${rub} ${unit}${zone}`;
}

function tierSuffixIfDistinct(primaryLabel: string, groupName: string | undefined): string {
  const g = groupName?.trim();
  if (!g) return '';
  const a = primaryLabel.trim().toLowerCase();
  const b = g.toLowerCase();
  if (a === b) return '';
  return ` · ${g}`;
}

export function priceTierLabel(p: PriceItem): string {
  const name = String(p.price_name ?? '').trim();
  const hasHour = p.price_price1 != null && String(p.price_price1).trim() !== '';
  const rub = hasHour ? formatRub(p.price_price1) : priceCostLabel(p);
  const unit = hasHour ? '₽/час' : '₽/мин';
  const zone = tierSuffixIfDistinct(name, p.group_name);
  const base = `${name} — ${rub} ${unit}`;
  return `${base}${zone}`;
}

export function productTierLabel(p: ProductItem): string {
  const name = String(p.product_name ?? '').trim();
  const base = `${name} — ${productCostLabel(p)} ₽`;
  return `${base}${tierSuffixIfDistinct(name, p.group_name)}`;
}

export function tariffToSaved(t: TariffChoice | null): SavedTariffPreference | null {
  if (!t) return null;
  if (t.kind === 'product') {
    return {
      kind: 'product',
      product_id: t.item.product_id,
      ...(t.item.group_name != null && String(t.item.group_name).length > 0
        ? { group_name: String(t.item.group_name) }
        : {}),
    };
  }
  return {
    kind: 'price',
    price_id: t.item.price_id,
    ...(t.item.group_name != null && String(t.item.group_name).length > 0
      ? { group_name: String(t.item.group_name) }
      : {}),
    ...(t.item.duration != null && String(t.item.duration).length > 0
      ? { duration: String(t.item.duration) }
      : {}),
  };
}

export function tariffFromSaved(
  saved: SavedTariffPreference,
  pricesList: PriceItem[],
  products: ProductItem[],
): TariffChoice | null {
  if (saved.kind === 'product') {
    const p = products.find(
      (x) =>
        x.product_id === saved.product_id &&
        String(x.group_name ?? '') === String(saved.group_name ?? ''),
    );
    return p ? { kind: 'product', item: p } : null;
  }
  const p = pricesList.find(
    (x) =>
      x.price_id === saved.price_id &&
      String(x.duration ?? '') === String(saved.duration ?? '') &&
      String(x.group_name ?? '') === String(saved.group_name ?? ''),
  );
  return p ? { kind: 'price', item: p } : null;
}
