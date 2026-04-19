import type { ProductItem } from './types';
import { icafeGetJsonWithAuth } from './icafeClient';
import { normalizeAllPricesData } from './normalizeAllPrices';
import { isCatalogSessionPackageWheelProduct } from '../features/booking/tariffSelection';

function dedupeProductsByIdAndZone(items: ProductItem[]): ProductItem[] {
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

/**
 * GET `/api/v2/cafe/{cafeId}/products` (iCafe Cloud) — каталог пакетов для брони.
 * Требует сессию: `Authorization: Bearer` (private_key после логина).
 */
export async function fetchCafeBookingProducts(cafeId: number): Promise<ProductItem[]> {
  const raw = await icafeGetJsonWithAuth<unknown>(`api/v2/cafe/${cafeId}/products`);
  const { products } = normalizeAllPricesData(raw);
  return products;
}

/**
 * Пакеты для брони: при успешной загрузке с iCafe Cloud заменяем строки «пакетов» из `/all-prices-icafe`,
 * чтобы не смешивать их с почасовыми ступенями 3/4/5 ч из сетки `prices`.
 */
export function mergeBookingProductsCatalog(
  allPricesProducts: ProductItem[],
  cafeProducts: ProductItem[],
  useCafePackages: boolean,
): ProductItem[] {
  if (!useCafePackages || cafeProducts.length === 0) return allPricesProducts;
  const withoutVibeSessionPackages = allPricesProducts.filter((p) => !isCatalogSessionPackageWheelProduct(p));
  return dedupeProductsByIdAndZone([...withoutVibeSessionPackages, ...cafeProducts]);
}
