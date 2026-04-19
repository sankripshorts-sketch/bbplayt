import type { AllBooksData } from '../api/types';
import { bookingRowLifecycleStatus, memberBookingRowStableKey } from '../features/booking/memberBookingsUtils';
import { intervalFromMemberRow } from '../features/booking/bookingTimeUtils';

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export type PendingVisitFeedback = {
  bookingKey: string;
  icafeId: string;
  clubAddress: string;
  pcName: string;
};

/** Самая свежая завершённая бронь за последние ~2 недели, по которой ещё не оставляли оценку. */
export function selectPendingVisitFeedback(
  data: AllBooksData | undefined,
  nowMs: number,
  handledKeys: Set<string>,
  addressByIcafe: Map<number, string>,
): PendingVisitFeedback | null {
  if (!data) return null;
  const candidates: { item: PendingVisitFeedback; endMs: number }[] = [];
  for (const [icafeId, rowsRaw] of Object.entries(data)) {
    const rows = Array.isArray(rowsRaw) ? rowsRaw : rowsRaw ? [rowsRaw] : [];
    for (const row of rows) {
      if (bookingRowLifecycleStatus(row, nowMs) !== 'ended') continue;
      const iv = intervalFromMemberRow(row);
      if (!iv) continue;
      const endMs = iv.end.getTime();
      if (nowMs - endMs > MAX_AGE_MS) continue;
      const key = memberBookingRowStableKey(icafeId, row);
      if (handledKeys.has(key)) continue;
      const nid = Number(icafeId);
      const clubAddress =
        Number.isFinite(nid) && addressByIcafe.has(nid) ? addressByIcafe.get(nid)! : `id ${icafeId}`;
      candidates.push({
        item: {
          bookingKey: key,
          icafeId,
          clubAddress,
          pcName: row.product_pc_name,
        },
        endMs,
      });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.endMs - a.endMs);
  return candidates[0]!.item;
}
