import type { PriceItem, ProductItem } from '../../api/types';
import type { SavedTariffPreference } from '../../preferences/appPreferences';
import { normalizePcZoneKind, type PcZoneKind } from './pcZoneKind';

export type TariffChoice =
  | { kind: 'product'; item: ProductItem }
  | { kind: 'price'; item: PriceItem };

/**
 * Единственные длительности «по времени» в брони: 30 мин, 1 ч, 1.5 ч, 2 ч.
 * Ставка берётся из сетки `prices` (ответ сервера), в приложении — ступень + досчёт (₽/мин или блок).
 * Любая другая длительность — только пакет из каталога `products` с фиксированной ценой.
 */
export const HOURLY_GRID_DURATION_MINUTES: readonly number[] = [30, 60, 90, 120];

export function isHourlyGridDurationMins(m: number): boolean {
  return HOURLY_GRID_DURATION_MINUTES.includes(m);
}

/** В колесе отдельные строки «пакет» — только вне 30–120 мин (это выбирается пресетами «по времени»). */
export function isDistinctBookingPackageWheelDuration(mins: number): boolean {
  return !HOURLY_GRID_DURATION_MINUTES.includes(mins);
}

/** Убирает из списка пакетов для колеса строки на 30/60/90/120 мин (дубли почасовки из каталога iCafe). */
export function filterBookingWheelPackageProducts(products: ProductItem[]): ProductItem[] {
  return products.filter((p) => {
    if (isLikelyTopupOrDepositProduct(p)) return false;
    const m = catalogProductSessionMins(p);
    if (m == null) return false;
    return isDistinctBookingPackageWheelDuration(m);
  });
}

/** Не сессия: пополнение / баланс — не показываем в колесе длительности. */
export function isLikelyTopupOrDepositProduct(p: ProductItem): boolean {
  const blob = `${p.product_type ?? ''}\n${p.product_name ?? ''}`.toLowerCase();
  return /deposit|top\s*up|topup|\bwallet\b|balance|пополн|депозит|счёт|счет|^баланс/i.test(blob);
}

/**
 * Строка каталога `products` с разобранной длительностью (для логики тарифа / POST).
 * Для **колеса** длительности длинные пакеты отфильтровываются через {@link filterBookingWheelPackageProducts}.
 */
export function isCatalogSessionPackageWheelProduct(p: ProductItem): boolean {
  if (isLikelyTopupOrDepositProduct(p)) return false;
  return catalogProductSessionMins(p) != null;
}

/** Порядок зон для одной строки в колесе, если зона не задана явно: GameZone — прежний эталон. */
const WHEEL_PACKAGE_ZONE_PRIORITY: PcZoneKind[] = ['GameZone', 'BootCamp', 'VIP', 'Other'];

function wheelPackageZoneSortKeyFromProduct(p: ProductItem): number {
  const k = wheelProductPcZoneKind(p);
  const i = WHEEL_PACKAGE_ZONE_PRIORITY.indexOf(k);
  return i >= 0 ? i : 99;
}

/**
 * Зона пакета для сопоставления с прайсом ПК: `group_name` или хвост `<<<BC`/`GZ`/`VP` в имени.
 */
export function wheelProductPcZoneKind(p: ProductItem): PcZoneKind {
  const label = productZoneLabelForUi(p);
  return normalizePcZoneKind(label);
}

/**
 * Один пакет на длительность из списка кандидатов с той же длительностью: строка под зону VIP / BootCamp / GameZone.
 * Совпадает с подбором пакета к ПК на брони при зональных строках каталога.
 */
export function pickProductPackageForZoneKind(pool: ProductItem[], zone: PcZoneKind): ProductItem | null {
  if (pool.length === 0) return null;
  /** Зона строки: `group_name` / `product_group_name` (после нормализации) или хвост `<<<GZ>>>` в имени iCafe. */
  const zoneOf = (p: ProductItem) => wheelProductPcZoneKind(p);
  const exact = pool.filter((p) => zoneOf(p) === zone);
  if (exact.length > 0) {
    return [...exact].sort((a, b) => a.product_id - b.product_id)[0] ?? null;
  }
  const loose = pool.filter((p) => zoneOf(p) === 'Other');
  if (loose.length > 0) {
    return [...loose].sort((a, b) => a.product_id - b.product_id)[0] ?? null;
  }
  return null;
}

/**
 * Одна позиция на длительность: зональные пакеты не дублируем в UI.
 * При `preferredZone` в колесе показывается пакет этой зоны (как на сервере: отдельные product на 3 ч / 5 ч по тарифам).
 */
export function dedupeBookingWheelPackagesByDuration(
  packages: ProductItem[],
  preferredZone?: PcZoneKind | null,
): ProductItem[] {
  const byMin = new Map<number, ProductItem[]>();
  for (const p of packages) {
    const m = catalogProductSessionMins(p);
    if (m == null) continue;
    const list = byMin.get(m) ?? [];
    list.push(p);
    byMin.set(m, list);
  }
  const out: ProductItem[] = [];
  for (const list of byMin.values()) {
    let chosen: ProductItem | null = null;
    if (preferredZone != null && preferredZone !== undefined) {
      chosen = pickProductPackageForZoneKind(list, preferredZone);
    }
    if (!chosen) {
      const sorted = [...list].sort((a, b) => {
        const za = wheelPackageZoneSortKeyFromProduct(a);
        const zb = wheelPackageZoneSortKeyFromProduct(b);
        if (za !== zb) return za - zb;
        return a.product_id - b.product_id;
      });
      chosen = sorted[0] ?? null;
    }
    if (chosen) out.push(chosen);
  }
  return out.sort((a, b) => (catalogProductSessionMins(a) ?? 0) - (catalogProductSessionMins(b) ?? 0));
}

/** iCafe часто не шлёт `group_name`, но кодирует зону хвостом `<<<BC` / `<<<GZ` / `<<<VP` в `product_name`. */
const PRODUCT_NAME_TAIL_ZONE = /<<<([A-Z]{2})\s*$/i;

function productNameTailZoneCode(productName: string | undefined): string | undefined {
  const m = PRODUCT_NAME_TAIL_ZONE.exec(String(productName ?? '').trim());
  return m ? m[1].toUpperCase() : undefined;
}

function productZoneKindForWheelDedupe(p: ProductItem): string | undefined {
  const g = p.group_name?.trim();
  if (g) return g;
  const code = productNameTailZoneCode(p.product_name);
  if (!code) return undefined;
  const map: Record<string, string> = { BC: 'BootCamp', GZ: 'GameZone', VP: 'VIP' };
  return map[code] ?? code;
}

/**
 * Подпись зоны для UI: `group_name` или хвост `<<<BC`/`GZ`/`VP` в имени пакета.
 */
export function productZoneLabelForUi(p: ProductItem): string | undefined {
  const g = p.group_name?.trim();
  if (g) return g;
  const code = productNameTailZoneCode(p.product_name);
  if (!code) return undefined;
  const map: Record<string, string> = { BC: 'BootCamp', GZ: 'GameZone', VP: 'VIP' };
  return map[code] ?? code;
}

/**
 * Минуты для подписи колеса/фильтра: как в {@link catalogProductSessionMins}, иначе как в {@link parseMinsFromProduct}
 * — иначе две строки с разным разбором дают одинаковый «N ч/пакет».
 */
export function bookingPackageWheelDisplayMins(p: ProductItem, fallback: number): number {
  const c = catalogProductSessionMins(p);
  if (c != null && Number.isFinite(c) && c > 0) return c;
  return parseMinsFromProduct(p, fallback);
}

/**
 * Часы в начале витринного имени пакета (`3 часа/пакет…`, `5 часов/пакет…`) — приоритетнее полей
 * `duration_min` / `duration`: iCafe часто кладёт там 60 или дубликат 180 для всех позиций, иначе база для «выгоднее» = 1 ч.
 */
function bookingPackageLeadTitleMinutesFromName(productName: string | undefined): number | null {
  const name = String(productName ?? '').trim();
  if (!name) return null;
  const hourWord = String.raw`(?:час(?:а|ов)?|ч\.?|h(?:rs?)?)`;
  const hourWordEnd = String.raw`(?=\s*[/·]|(?=\s*<<<)|\s*$|\s+[^\d])`;
  const leadHours = new RegExp(String.raw`^(\d+(?:[.,]\d+)?)\s*${hourWord}${hourWordEnd}`, 'i').exec(name);
  if (!leadHours) return null;
  const v = parseFloat(leadHours[1].replace(',', '.'));
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.round(v * 60);
}

/**
 * Длительность сессии в минутах из **одной** строки каталога `products` (ответ `/all-prices-icafe`).
 * Только поля и имя с сервера; `null`, если извлечь нельзя.
 */
export function catalogProductSessionMins(p: ProductItem): number | null {
  const fromTitle = bookingPackageLeadTitleMinutesFromName(p.product_name);
  if (fromTitle != null) return fromTitle;

  if (p.duration_min != null && String(p.duration_min).trim() !== '') {
    const n = parseInt(String(p.duration_min), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const d = p.duration != null ? String(p.duration).trim() : '';
  if (d) {
    if (/^\d+$/.test(d)) {
      const digitMins = parseDigitOnlyDurationToMins(d);
      if (digitMins != null) return digitMins;
      const n = parseInt(d, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const mm = /(\d+)\s*(?:мин|min)/i.exec(d);
    if (mm) {
      const n = parseInt(mm[1], 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const hh = /(\d+(?:[.,]\d+)?)\s*(?:ч|h)/i.exec(d);
    if (hh) {
      const v = parseFloat(hh[1].replace(',', '.'));
      if (Number.isFinite(v) && v > 0) return Math.round(v * 60);
    }
  }
  const name = String(p.product_name ?? '').trim();
  const blob = `${name} ${d}`;
  /** `\b` в JS не даёт границу после кириллицы — конец слова задаём lookahead. */
  const hourWord = String.raw`(?:час(?:а|ов)?|ч\.?|h(?:rs?)?)`;
  const hourWordEnd = String.raw`(?=\s*[/·]|(?=\s*<<<)|\s*$|\s+[^\d])`;
  /** Маркеры в названии: `<<<180>>>` / `<<<300>>>` (минуты), `<<<5>>>` / `<<<3>>>` (часы 1…12), обрыв `<<<180<<<`. */
  const angleDigitsToMins = (n: number): number | null => {
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n >= 15 && n <= 48 * 60) return n;
    if (n >= 1 && n <= 12) return n * 60;
    if (n === 13 || n === 14) return n;
    return null;
  };
  const closed = /<<<(\d{1,4})>>>/i.exec(blob);
  if (closed) {
    const n = parseInt(closed[1], 10);
    const mins = angleDigitsToMins(n);
    if (mins != null) return mins;
  }
  const broken = /<<<(\d{1,4})<<</i.exec(blob);
  if (broken) {
    const n = parseInt(broken[1], 10);
    const mins = angleDigitsToMins(n);
    if (mins != null) return mins;
  }
  const hm = new RegExp(String.raw`(\d+(?:[.,]\d+)?)\s*${hourWord}${hourWordEnd}`, 'i').exec(blob);
  if (hm) {
    const v = parseFloat(hm[1].replace(',', '.'));
    if (Number.isFinite(v) && v > 0) return Math.round(v * 60);
  }
  return null;
}

/**
 * Для этой длительности брони есть строка в каталоге с сервера — считаем и шлём `product_id`, не почасовку.
 * Почасовые пресеты 30–120 мин всегда через `prices`, даже если в `products` случайно есть совпадение.
 */
export function shouldChargeViaCatalogProducts(products: ProductItem[], bookingMinutes: number): boolean {
  if (isHourlyGridDurationMins(bookingMinutes)) return false;
  return products.some((p) => catalogProductSessionMins(p) === bookingMinutes);
}

function formatRub(raw: string | undefined): string {
  if (!raw) return '—';
  const n = parseFloat(String(raw).replace(',', '.'));
  if (Number.isFinite(n)) return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2);
  return raw;
}

export function productCostLabel(p: ProductItem): string {
  return formatRub(p.product_price ?? p.total_price);
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
  const c = catalogProductSessionMins(p);
  if (c != null && Number.isFinite(c) && c > 0) return c;
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

/** Колонки «Условия и цены»: 1 ч, 2 ч, пакеты 3 ч и 5 ч (без 30 мин и 1,5 ч — компактная таблица). */
export const TERMS_MATRIX_DURATION_MINS = [60, 120, 180, 300] as const;

const TERMS_MATRIX_DURATION_SET = new Set<number>(TERMS_MATRIX_DURATION_MINS);

/** Без `Other` («Стандарт») — в витрине только игровые зоны/премиум. */
const TERMS_MATRIX_ZONE_ORDER: PcZoneKind[] = ['GameZone', 'BootCamp', 'VIP'];

/** Зона строки прайса для витрины: явная группа или имя тарифа (например Default → Other). */
export function priceItemZoneKindForTerms(p: PriceItem): PcZoneKind {
  const g = p.group_name?.trim();
  if (g) return normalizePcZoneKind(g);
  return normalizePcZoneKind(p.price_name);
}

/**
 * Стоимость сессии для строки `prices` на фиксированную длительность: сначала `total_price`, иначе ₽/ч × часы.
 */
export function priceItemSessionTotalRubLabel(p: PriceItem): string {
  const mins = parseMinsFromPriceItem(p, 0);
  const totalRaw = p.total_price;
  if (totalRaw != null && String(totalRaw).trim() !== '') {
    const n = parseFloat(String(totalRaw).replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return formatRub(totalRaw);
  }
  const hourlyRaw = p.price_price1;
  if (hourlyRaw != null && String(hourlyRaw).trim() !== '' && mins > 0) {
    const h = parseFloat(String(hourlyRaw).replace(',', '.'));
    if (Number.isFinite(h) && h > 0) {
      const r = h * (mins / 60);
      return r % 1 === 0 ? String(Math.round(r)) : r.toFixed(2);
    }
  }
  return formatRub(p.total_price ?? p.price_price1);
}

export type TermsTariffMatrixRow = {
  zoneKind: PcZoneKind;
  zoneTitle: string;
  /** Порядок совпадает с `TERMS_MATRIX_DURATION_MINS`: 60, 120, 180, 300 мин. */
  cells: (string | null)[];
};

/**
 * Таблица для «Условия»: 1 ч, 2 ч и пакеты 3 ч / 5 ч по зонам (без «Стандарт»), без дублей.
 * Сначала заполняются ячейки из `products`, затем пустые — из `prices`.
 */
export function buildTermsTariffMatrix(
  products: ProductItem[],
  prices: PriceItem[],
  zoneTitle: (z: PcZoneKind) => string,
): TermsTariffMatrixRow[] {
  const map = new Map<PcZoneKind, Partial<Record<number, string>>>();

  const put = (zone: PcZoneKind, mins: number, label: string, onlyIfEmpty: boolean) => {
    if (!TERMS_MATRIX_DURATION_SET.has(mins)) return;
    let row = map.get(zone);
    if (!row) {
      row = {};
      map.set(zone, row);
    }
    if (onlyIfEmpty && row[mins]) return;
    row[mins] = label;
  };

  for (const p of products) {
    if (isLikelyTopupOrDepositProduct(p)) continue;
    const m = catalogProductSessionMins(p);
    if (m == null || !TERMS_MATRIX_DURATION_SET.has(m)) continue;
    put(wheelProductPcZoneKind(p), m, `${productCostLabel(p)} ₽`, false);
  }

  for (const p of prices) {
    const m = parseMinsFromPriceItem(p, 0);
    if (!TERMS_MATRIX_DURATION_SET.has(m)) continue;
    put(priceItemZoneKindForTerms(p), m, `${priceItemSessionTotalRubLabel(p)} ₽`, true);
  }

  const rows: TermsTariffMatrixRow[] = [];
  for (const kind of TERMS_MATRIX_ZONE_ORDER) {
    const c = map.get(kind);
    if (!c) continue;
    const cells = TERMS_MATRIX_DURATION_MINS.map((mins) => c[mins] ?? null);
    if (cells.every((v) => v == null)) continue;
    rows.push({
      zoneKind: kind,
      zoneTitle: zoneTitle(kind),
      cells,
    });
  }
  return rows;
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

/** Сервисные имена вроде «Default» в UI не показываем (для API остаётся исходная строка). */
export function displayTariffName(raw: string | undefined | null): string {
  const s = sanitizeTariffDisplayName(raw);
  if (!s) return '';
  if (/^default$/i.test(s)) return '';
  return s;
}

/**
 * iCafe иногда добавляет служебные хвосты к `product_name`/`price_name` (`<<<...`).
 * Для пользовательского UI оставляем только читаемую часть до первого технического маркера.
 */
function sanitizeTariffDisplayName(raw: string | undefined | null): string {
  const source = String(raw ?? '').trim();
  if (!source) return '';
  const left = source.split('<<<')[0]?.trim() ?? '';
  if (!left) return '';
  return left.replace(/\s{2,}/g, ' ').replace(/[·\-–—:;,./\s]+$/g, '').trim();
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
/**
 * Фиксированные длительности из сетки `/all-prices-icafe` (`prices`), которых нет в почасовых пресетах
 * (например 180 / 210 / 300 мин), когда каталог `products` пуст — их всё равно нужно показывать в колесе.
 */
export function distinctPackageTierMinutesFromPrices(
  prices: PriceItem[],
  presetMinutes: readonly number[],
): number[] {
  const preset = new Set(presetMinutes);
  const seen = new Set<number>();
  for (const p of prices) {
    const m = parseMinsFromPriceItem(p, 0);
    if (m > 0 && !preset.has(m)) seen.add(m);
  }
  return [...seen].sort((a, b) => a - b);
}

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
  const name = displayTariffName(p.price_name);
  const hasHour = p.price_price1 != null && String(p.price_price1).trim() !== '';
  const rub = hasHour ? formatRub(p.price_price1) : priceCostLabel(p);
  const unit = hasHour ? '₽/час' : '₽/мин';
  const tierMins = parseMinsFromPriceItem(p, 0);
  const durPart = tierMins > 0 ? `${tierMins} мин` : String(p.duration ?? '').trim() || '—';
  const zone = tierSuffixIfDistinct(name, p.group_name);
  const core = `${durPart} · ${rub} ${unit}${zone}`;
  return name ? `«${name}» · ${core}` : core;
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
  const name = displayTariffName(p.price_name);
  const hasHour = p.price_price1 != null && String(p.price_price1).trim() !== '';
  const rub = hasHour ? formatRub(p.price_price1) : priceCostLabel(p);
  const unit = hasHour ? '₽/час' : '₽/мин';
  const zone = tierSuffixIfDistinct(name, p.group_name);
  const base = name ? `${name} — ${rub} ${unit}` : `${rub} ${unit}`;
  return `${base}${zone}`;
}

export function productTierLabel(p: ProductItem): string {
  const name = displayTariffName(p.product_name);
  const base = name ? `${name} — ${productCostLabel(p)} ₽` : `${productCostLabel(p)} ₽`;
  const zone = productZoneLabelForUi(p);
  return `${base}${tierSuffixIfDistinct(name, zone)}`;
}

/** Текст выгоды/акции: поле `package_hint` или фрагменты вида `<<<…>>>` в `product_name`. */
export function packageBenefitTextFromProduct(p: ProductItem): string | undefined {
  const hint = (p.package_hint ?? '').trim();
  if (hint) return hint;
  const name = p.product_name ?? '';
  const chunks = [...name.matchAll(/<<<([\s\S]*?)>>>/g)]
    .map((m) => m[1]?.trim())
    .filter((x): x is string => !!x && x.length > 0);
  if (chunks.length) return chunks.join(' · ');
  return undefined;
}

/** Заголовок группы почасовых строк в модалке «Тарифы» (без служебного «Default»). */
export function hourlyTariffGroupTitle(first: PriceItem | undefined): string {
  if (!first) return '';
  const disp = displayTariffName(first.price_name);
  const gn = first.group_name?.trim();
  if (disp && gn) return `«${disp}» · ${gn}`;
  if (disp) return `«${disp}»`;
  return gn ?? '';
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
