import type { AllBooksData, AllPricesData, AvailablePcsData, MemberBookingRow, PcListItem, PriceItem, ProductItem } from '../api/types';

type Key = string | number;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function jsonEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!jsonEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!(key in b) || !jsonEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

export function shareArrayByKey<T>(
  oldItems: readonly T[] | undefined,
  newItems: readonly T[],
  getKey: (item: T) => Key,
): T[] {
  if (!oldItems?.length) return [...newItems];
  const oldByKey = new Map<Key, T>();
  for (const item of oldItems) oldByKey.set(getKey(item), item);

  let changed = oldItems.length !== newItems.length;
  const shared = newItems.map((item, idx) => {
    const old = oldByKey.get(getKey(item));
    const next = old && jsonEqual(old, item) ? old : item;
    if (next !== oldItems[idx]) changed = true;
    return next;
  });
  return changed ? shared : (oldItems as T[]);
}

function pcKey(item: PcListItem): string {
  return String(item.pc_name).trim().toLowerCase();
}

export function sharePcList(oldItems: PcListItem[] | undefined, newItems: PcListItem[]): PcListItem[] {
  return shareArrayByKey(oldItems, newItems, pcKey);
}

export const structuralSharePcList = (oldData: unknown, newData: unknown): unknown =>
  Array.isArray(newData) ? sharePcList(Array.isArray(oldData) ? oldData : undefined, newData as PcListItem[]) : newData;

export function shareAvailablePcsData(
  oldData: AvailablePcsData | undefined,
  newData: AvailablePcsData,
): AvailablePcsData {
  const pcList = sharePcList(oldData?.pc_list, newData.pc_list);
  if (oldData && oldData.time_frame === newData.time_frame && pcList === oldData.pc_list) return oldData;
  return { ...newData, pc_list: pcList };
}

export const structuralShareAvailablePcsData = (oldData: unknown, newData: unknown): unknown =>
  isPlainObject(newData) && Array.isArray(newData.pc_list)
    ? shareAvailablePcsData(
        isPlainObject(oldData) && Array.isArray(oldData.pc_list) ? (oldData as AvailablePcsData) : undefined,
        newData as AvailablePcsData,
      )
    : newData;

function bookingKey(row: MemberBookingRow): string {
  const id = row.member_offer_id ?? row.booking_id ?? row.product_id;
  return [
    id,
    row.product_pc_name,
    row.product_available_date_local_from,
    row.product_available_date_local_to,
  ].join('|');
}

export function shareBookingRows(
  oldRows: MemberBookingRow[] | undefined,
  newRows: MemberBookingRow[],
): MemberBookingRow[] {
  return shareArrayByKey(oldRows, newRows, bookingKey);
}

export const structuralShareBookingRows = (oldData: unknown, newData: unknown): unknown =>
  Array.isArray(newData)
    ? shareBookingRows(Array.isArray(oldData) ? oldData as MemberBookingRow[] : undefined, newData as MemberBookingRow[])
    : newData;

export function shareAllBooksData(oldData: AllBooksData | undefined, newData: AllBooksData): AllBooksData {
  if (!oldData) return newData;
  const oldKeys = Object.keys(oldData).sort();
  const newKeys = Object.keys(newData).sort();
  let changed = oldKeys.length !== newKeys.length || oldKeys.some((key, idx) => key !== newKeys[idx]);
  const out: AllBooksData = {};
  for (const key of newKeys) {
    const rows = shareBookingRows(oldData[key], newData[key] ?? []);
    out[key] = rows;
    if (rows !== oldData[key]) changed = true;
  }
  return changed ? out : oldData;
}

export const structuralShareAllBooksData = (oldData: unknown, newData: unknown): unknown =>
  isPlainObject(newData)
    ? shareAllBooksData(isPlainObject(oldData) ? oldData as AllBooksData : undefined, newData as AllBooksData)
    : newData;

function priceKey(item: PriceItem): string {
  return [
    item.price_id,
    item.duration ?? '',
    item.total_price ?? '',
    item.group_name ?? '',
  ].join('|');
}

function productKey(item: ProductItem): string {
  return [item.product_id, item.group_name ?? ''].join('|');
}

export function shareProducts(oldItems: ProductItem[] | undefined, newItems: ProductItem[]): ProductItem[] {
  return shareArrayByKey(oldItems, newItems, productKey);
}

export const structuralShareProducts = (oldData: unknown, newData: unknown): unknown =>
  Array.isArray(newData)
    ? shareProducts(Array.isArray(oldData) ? oldData as ProductItem[] : undefined, newData as ProductItem[])
    : newData;

export function shareAllPricesData(oldData: AllPricesData | undefined, newData: AllPricesData): AllPricesData {
  if (!oldData) return newData;
  const prices = shareArrayByKey(oldData.prices, newData.prices, priceKey);
  const products = shareProducts(oldData.products, newData.products);
  if (
    prices === oldData.prices &&
    products === oldData.products &&
    jsonEqual(oldData.time_tech_break, newData.time_tech_break) &&
    oldData.step_start_booking === newData.step_start_booking
  ) {
    return oldData;
  }
  return { ...newData, prices, products };
}

export const structuralShareAllPricesData = (oldData: unknown, newData: unknown): unknown =>
  isPlainObject(newData) && Array.isArray(newData.prices) && Array.isArray(newData.products)
    ? shareAllPricesData(
        isPlainObject(oldData) && Array.isArray(oldData.prices) && Array.isArray(oldData.products)
          ? (oldData as AllPricesData)
          : undefined,
        newData as AllPricesData,
      )
    : newData;
