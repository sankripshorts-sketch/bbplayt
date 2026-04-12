import { icafeGetJsonWithAuth } from './icafeClient';
import { normalizeFlatIcafeBookingsList } from './normalizeAllBooks';
import type { MemberBookingRow } from './types';

/**
 * Все брони клуба (iCafe Cloud GET `/api/v2/cafe/{cafeId}/bookings`, опц. `pc_name`).
 * Без `pc_name` — полный список для проверки пересечений слотов.
 */
export async function fetchIcafeCafeBookings(cafeId: number): Promise<MemberBookingRow[]> {
  const raw = await icafeGetJsonWithAuth<unknown>(`api/v2/cafe/${cafeId}/bookings`);
  return normalizeFlatIcafeBookingsList(raw);
}
