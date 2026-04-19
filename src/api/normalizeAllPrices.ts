import type {
  AllPricesData,
  PriceItem,
  ProductItem,
  TimeTechBreakNormalized,
} from './types';

function coerceStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

/** Числовой id товара для POST /booking: `product_id`, иначе `order_product_id`, иначе суффикс из `p-123` (формат iCafe). */
function parseCatalogProductId(o: Record<string, unknown>): number | null {
  const raw = o.product_id ?? o.order_product_id ?? o.id;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    const n = Number(t);
    if (Number.isFinite(n) && n > 0) return n;
    const m = /^p-(\d+)$/i.exec(t);
    if (m) {
      const x = Number(m[1]);
      return Number.isFinite(x) && x > 0 ? x : null;
    }
  }
  return null;
}

/** Длительность сессии в каталоге: разные сборки iCafe/vibe кладут минуты в `duration`, `mins`, `session_mins` и т.д. */
function coerceProductDurationFields(o: Record<string, unknown>): { duration?: string; duration_min?: string } {
  const duration =
    coerceStr(o.duration) ??
    coerceStr(o.duration_min ?? o.durationMin) ??
    (typeof o.mins === 'number' && Number.isFinite(o.mins) && o.mins > 0 ? String(Math.floor(o.mins)) : undefined) ??
    (typeof o.mins === 'string' && /^\d+$/.test(o.mins.trim()) ? o.mins.trim() : undefined) ??
    (typeof o.session_mins === 'number' &&
    Number.isFinite(o.session_mins) &&
    o.session_mins > 0
      ? String(Math.floor(o.session_mins))
      : undefined) ??
    coerceStr(o.sessionMinutes ?? o.duration_minutes ?? o.session_duration_min);
  const duration_min =
    coerceStr(o.duration_min ?? o.durationMin ?? o.minutes ?? o.minute_duration) ?? duration;
  return {
    ...(duration ? { duration } : {}),
    ...(duration_min ? { duration_min } : {}),
  };
}

function normalizeProduct(raw: unknown): ProductItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const pec = o.product_enable_client;
  if (pec === 0 || pec === '0' || pec === false) return null;
  const product_id = parseCatalogProductId(o);
  if (product_id == null) return null;
  const product_name = coerceStr(o.product_name) ?? '';
  const group_name = coerceStr(
    o.group_name ?? o.group ?? o.pc_group_name ?? o.price_pc_group ?? o.product_group_name,
  );
  const product_type = coerceStr(o.product_type ?? o.productType ?? o.category);
  const dur = coerceProductDurationFields(o);
  const package_hint =
    coerceStr(
      o.package_hint ??
        o.benefit ??
        o.benefits ??
        o.product_benefit ??
        o.promo_text ??
        o.discount_hint ??
        o.product_info,
    )?.trim() ?? '';
  const row: ProductItem = {
    product_id,
    product_name,
    /** iCafe в разных инсталляциях шлёт цену в разных полях — без этого подпись «выгоднее» не считается. */
    product_price: coerceStr(o.product_price ?? o.price ?? o.product_sum),
    total_price: coerceStr(o.total_price ?? o.sum ?? o.amount ?? o.cost),
    ...(group_name ? { group_name } : {}),
    ...dur,
    ...(product_type ? { product_type } : {}),
  };
  if (package_hint && package_hint !== product_name.trim()) {
    row.package_hint = package_hint;
  }
  if (o.is_calc_duration !== undefined && o.is_calc_duration !== null) {
    row.is_calc_duration =
      typeof o.is_calc_duration === 'boolean'
        ? o.is_calc_duration
        : o.is_calc_duration === 'true' || o.is_calc_duration === 1;
  }
  return row;
}

function normalizePrice(raw: unknown): PriceItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const price_id = typeof o.price_id === 'number' ? o.price_id : Number(o.price_id);
  /** Строка прайса в UI; в POST /booking для почасовки `price_id` не используем (ошибка iCafe на vibe). */
  if (!Number.isFinite(price_id) || price_id <= 0) return null;
  const price_name = coerceStr(o.price_name) ?? '';
  const group_name = coerceStr(o.group_name ?? o.group ?? o.pc_group_name ?? o.price_pc_group);
  const price_price1 =
    coerceStr(o.price_price1) ??
    coerceStr(o.price1 ?? o.price_per_hour ?? o.hourly_price ?? o.rate_per_hour ?? o.rate);
  return {
    price_id,
    price_name,
    ...(price_price1 ? { price_price1 } : {}),
    total_price: coerceStr(o.total_price),
    ...(group_name ? { group_name } : {}),
    duration: coerceStr(o.duration ?? o.duration_min),
  };
}

/** `HH:MM` / `H:MM` → минуты от полуночи */
function parseTimeToMins(s: string): number {
  const t = s.trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (!m) return NaN;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return NaN;
  return h * 60 + min;
}

function normalizeTimeTechBreak(raw: unknown): TimeTechBreakNormalized | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const startStr = coerceStr(o.time_start ?? o.timeStart ?? o.start);
  const durRaw = o.mins ?? o.duration;
  const durationMins = typeof durRaw === 'number' ? durRaw : Number(durRaw);
  if (!Number.isFinite(durationMins) || durationMins <= 0) return null;
  if (!startStr) return null;
  const startMins = parseTimeToMins(startStr);
  if (!Number.isFinite(startMins)) return null;
  return { startMins, durationMins };
}

/**
 * iCafe отдаёт несколько строк с **одним** `price_id` (например "Default") и разными
 * `duration` / `total_price` — это разные почасовые ступени, а не дубликаты.
 */
function dedupePriceRows(items: PriceItem[]): PriceItem[] {
  const seen = new Set<string>();
  const out: PriceItem[] = [];
  for (const it of items) {
    const key = `${it.price_id}|${String(it.duration ?? '')}|${String(it.total_price ?? '')}|${String(it.group_name ?? '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function dedupeByProductId(items: ProductItem[]): ProductItem[] {
  const seen = new Set<string>();
  const out: ProductItem[] = [];
  for (const it of items) {
    const key = `${it.product_id}|${String(it.group_name ?? '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export function normalizeAllPricesData(raw: unknown): AllPricesData {
  const empty: AllPricesData = { prices: [], products: [] };
  /** iCafe: GET .../products иногда отдаёт `{ code, data: [ {...}, ... ] }` — массив товаров без обёртки `items`. */
  if (Array.isArray(raw)) {
    return {
      prices: [],
      products: dedupeByProductId(
        raw.map(normalizeProduct).filter((x): x is ProductItem => x != null),
      ),
    };
  }
  let root: unknown = raw;
  if (root && typeof root === 'object' && !Array.isArray(root)) {
    const inner = (root as Record<string, unknown>).data;
    if (Array.isArray(inner)) {
      return {
        prices: [],
        products: dedupeByProductId(
          inner.map(normalizeProduct).filter((x): x is ProductItem => x != null),
        ),
      };
    }
    if (inner != null && typeof inner === 'object' && !Array.isArray(inner)) {
      root = inner;
    }
  }
  if (!root || typeof root !== 'object' || Array.isArray(root)) return empty;
  const d = root as Record<string, unknown>;
  const pricesIn = d.prices;
  const rawProducts = d.products;
  const itemsIn = d.items;
  const altProducts = d.special_products ?? d.product_list ?? d.packages;
  const productsIn =
    Array.isArray(rawProducts) && rawProducts.length > 0
      ? rawProducts
      : Array.isArray(altProducts) && altProducts.length > 0
        ? altProducts
        : itemsIn;
  const prices: PriceItem[] = dedupePriceRows(
    Array.isArray(pricesIn)
      ? pricesIn.map(normalizePrice).filter((x): x is PriceItem => x != null)
      : [],
  );
  const products: ProductItem[] = dedupeByProductId(
    Array.isArray(productsIn)
      ? productsIn.map(normalizeProduct).filter((x): x is ProductItem => x != null)
      : [],
  );
  const stepRaw = d.step_start_booking ?? d.stepStartBooking;
  const step_start_booking =
    typeof stepRaw === 'number' && Number.isFinite(stepRaw) && stepRaw > 0
      ? Math.floor(stepRaw)
      : typeof stepRaw === 'string' && /^\d+$/.test(stepRaw.trim())
        ? Math.floor(Number(stepRaw))
        : undefined;
  const time_tech_break = normalizeTimeTechBreak(d.time_tech_break ?? d.timeTechBreak);
  const out: AllPricesData = { prices, products };
  if (step_start_booking != null) out.step_start_booking = step_start_booking;
  if (time_tech_break != null) out.time_tech_break = time_tech_break;
  return out;
}
