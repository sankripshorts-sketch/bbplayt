import { describe, expect, it } from 'vitest';
import { bookingRowLifecycleStatus } from '../../src/features/booking/memberBookingsUtils';
import { parseServerDateTimeString } from '../../src/datetime/mskTime';
import type { MemberBookingRow } from '../../src/api/types';

describe('bookingRowLifecycleStatus', () => {
  const rowApril11: MemberBookingRow = {
    product_id: 1,
    product_pc_name: 'PC01',
    product_available_date_local_from: '2026-04-11 18:00:00',
    product_available_date_local_to: '2026-04-11 20:00:00',
    product_mins: 120,
  };

  it('завершена, если nowMs после конца интервала (московский слот как UTC-момент)', () => {
    const afterEnd = parseServerDateTimeString('2026-04-11 20:01:00')!.getTime();
    expect(bookingRowLifecycleStatus(rowApril11, afterEnd)).toBe('ended');
  });

  it('предстоит, если nowMs до начала слота', () => {
    const beforeStart = parseServerDateTimeString('2026-04-11 17:00:00')!.getTime();
    expect(bookingRowLifecycleStatus(rowApril11, beforeStart)).toBe('upcoming');
  });

  it('активна между началом и концом', () => {
    const mid = parseServerDateTimeString('2026-04-11 19:00:00')!.getTime();
    expect(bookingRowLifecycleStatus(rowApril11, mid)).toBe('active');
  });
});
