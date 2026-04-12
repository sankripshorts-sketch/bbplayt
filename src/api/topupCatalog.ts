import { bookingFlowApi } from './endpoints';
import type { ProductItem } from './types';

/**
 * Выбор строки каталога для пополнения баланса (BLACKBEARS / docs/api-spec.md):
 * `topup_ids` = `product_id` из `GET /all-prices-icafe`.
 */
export function pickTopupProductIdFromProducts(products: ProductItem[]): number | null {
  if (!products.length) return null;
  const score = (p: ProductItem): number => {
    const t = `${p.product_type ?? ''}\n${p.product_name ?? ''}`.toLowerCase();
    let s = 0;
    if (/deposit|top\s*up|topup|\bwallet\b|balance|пополн|депозит|счёт|счет|^баланс/i.test(t)) {
      s += 100;
    }
    if (/\b(hour|час|мин\b|min\b|session|pc\s*time|gaming)\b/i.test(t)) s -= 40;
    if (p.is_calc_duration === true) s -= 25;
    if (String(p.duration_min ?? p.duration ?? '').trim()) s -= 10;
    return s;
  };
  const best = [...products].sort((a, b) => score(b) - score(a) || a.product_id - b.product_id)[0];
  if (score(best) > 0) return best.product_id;
  return Math.min(...products.map((p) => p.product_id));
}

export async function fetchTopupProductIdForCafe(params: {
  cafeId: number;
  memberId?: string;
}): Promise<number> {
  const data = await bookingFlowApi.allPrices({
    cafeId: params.cafeId,
    ...(params.memberId?.trim() ? { memberId: params.memberId.trim() } : {}),
  });
  const id = pickTopupProductIdFromProducts(data.products);
  if (id == null) {
    throw new Error('NO_TOPUP_PRODUCT_IN_CATALOG');
  }
  return id;
}
