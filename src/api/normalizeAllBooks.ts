import type { AllBooksData, MemberBookingRow } from './types';

function coerceNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Склеивает дату и время из полей iCafe (`start_date` + `start_time`), если нет единой строки. */
function combineDateTimeFields(datePart: unknown, timePart: unknown): string {
  const ds = datePart != null ? String(datePart).trim() : '';
  if (!ds) return '';
  const ts = timePart != null ? String(timePart).trim() : '';
  if (!ts) return ds;
  if (ds.includes(' ') || ds.includes('T')) return ds;
  return `${ds} ${ts}`;
}

/** Приводит произвольный объект ответа API к одной строке брони или null. */
function coerceMemberBookingRow(x: unknown): MemberBookingRow | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  let product_id = coerceNumber(o.product_id, NaN);
  if (!Number.isFinite(product_id)) {
    product_id = coerceNumber(o.member_offer_id, NaN);
  }
  if (!Number.isFinite(product_id)) {
    product_id = coerceNumber(o.offer_id, NaN);
  }
  if (!Number.isFinite(product_id)) {
    product_id = coerceNumber(o.id, NaN);
  }
  if (!Number.isFinite(product_id)) return null;
  const catalogProductId = coerceNumber(o.product_id, NaN);
  const product_pc_name = String(
    o.product_pc_name ?? o.pc_name ?? o.pcName ?? o.product_name ?? '',
  );
  let rawFrom: unknown = o.product_available_date_local_from ?? o.available_from ?? o.date_from;
  if (rawFrom == null || String(rawFrom).trim() === '') {
    rawFrom =
      combineDateTimeFields(o.start_date, o.start_time) ||
      combineDateTimeFields(o.booking_date, o.booking_time) ||
      o.start_date;
  }
  const product_available_date_local_from = String(rawFrom ?? '');
  let rawTo: unknown = o.product_available_date_local_to ?? o.available_to ?? o.date_to;
  if (rawTo == null || String(rawTo).trim() === '') {
    rawTo = combineDateTimeFields(o.end_date, o.end_time) || o.end_date;
  }
  const product_available_date_local_to = String(rawTo ?? '');
  const product_mins = coerceNumber(o.product_mins ?? o.duration_mins ?? o.mins, 0);
  const row: MemberBookingRow = {
    product_id,
    product_pc_name,
    product_available_date_local_from,
    product_available_date_local_to,
    product_mins,
  };
  if (o.product_description != null) row.product_description = String(o.product_description);
  const explicitOffer = coerceNumber(o.member_offer_id, NaN);
  const bookingRef = coerceNumber(o.booking_id ?? o.offer_id, NaN);
  const idNum = coerceNumber(o.id, NaN);
  const offerForCancel = Number.isFinite(explicitOffer)
    ? explicitOffer
    : Number.isFinite(bookingRef)
      ? bookingRef
      : Number.isFinite(idNum) && idNum > 0 && idNum !== catalogProductId
        ? idNum
        : NaN;
  if (Number.isFinite(offerForCancel) && offerForCancel > 0) {
    row.member_offer_id = offerForCancel;
  }
  const bid = coerceNumber(o.booking_id, NaN);
  if (Number.isFinite(bid) && bid > 0) row.booking_id = bid;
  if (o.member_account != null) row.member_account = String(o.member_account);
  return row;
}

function normalizeRows(value: unknown): MemberBookingRow[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map(coerceMemberBookingRow).filter((r): r is MemberBookingRow => r !== null);
  }
  const one = coerceMemberBookingRow(value);
  return one ? [one] : [];
}

/**
 * Ответ GET all-books может отличаться от типа: значение по клубу не всегда массив.
 */
export function normalizeAllBooksData(raw: unknown): AllBooksData {
  const out: AllBooksData = {};
  if (raw == null) return out;

  let root: unknown = raw;
  if (root && typeof root === 'object' && !Array.isArray(root)) {
    const envelope = root as Record<string, unknown>;
    const inner = envelope.data;
    if (inner != null) {
      root = inner;
    }
  }

  if (Array.isArray(root)) {
    const byCafe: AllBooksData = {};
    for (const item of root) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const o = item as Record<string, unknown>;
      const cafeRaw = o.icafe_id ?? o.cafe_id ?? o.member_icafe_id ?? o.pc_icafe_id;
      const n = typeof cafeRaw === 'number' ? cafeRaw : typeof cafeRaw === 'string' ? parseFloat(cafeRaw) : NaN;
      const row = coerceMemberBookingRow(item);
      if (!row || !Number.isFinite(n)) continue;
      const k = String(Math.trunc(n));
      if (!byCafe[k]) byCafe[k] = [];
      byCafe[k]!.push(row);
    }
    if (Object.keys(byCafe).length) return byCafe;

    const rows = normalizeRows(root);
    if (rows.length) out['0'] = rows;
    return out;
  }

  if (typeof root !== 'object' || root === null) return out;

  const rootObj = root as Record<string, unknown>;
  const bookingsFlat =
    rootObj.bookings ??
    rootObj.member_bookings ??
    rootObj.member_books ??
    rootObj.items ??
    rootObj.list ??
    rootObj.records;
  if (Array.isArray(bookingsFlat) && bookingsFlat.length) {
    const nested = normalizeAllBooksData(bookingsFlat);
    if (Object.keys(nested).length) return nested;
  }

  const skipKeys = new Set(['message', 'code', 'status']);
  for (const [k, v] of Object.entries(root as Record<string, unknown>)) {
    if (skipKeys.has(k)) continue;
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'data' in (v as object)) {
      const nested = (v as Record<string, unknown>).data;
      const rows = normalizeRows(nested);
      if (rows.length) out[k] = rows;
      continue;
    }
    const rows = normalizeRows(v);
    if (rows.length) out[k] = rows;
  }

  return out;
}

/**
 * Плоский список броней из GET iCafe `api/v2/cafe/{id}/bookings` (массив в корне или в `data` / `bookings`).
 */
export function normalizeFlatIcafeBookingsList(raw: unknown): MemberBookingRow[] {
  if (raw == null) return [];
  let root: unknown = raw;
  if (root && typeof root === 'object' && !Array.isArray(root)) {
    const envelope = root as Record<string, unknown>;
    if (envelope.data != null) root = envelope.data;
  }
  if (Array.isArray(root)) return normalizeRows(root);
  if (root && typeof root === 'object' && !Array.isArray(root)) {
    const o = root as Record<string, unknown>;
    const flat = o.bookings ?? o.items ?? o.records ?? o.list;
    if (Array.isArray(flat)) return normalizeRows(flat);
  }
  return [];
}
