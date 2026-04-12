import { describe, expect, it } from 'vitest';
import { intervalFromMemberRow } from '../../src/features/booking/bookingTimeUtils';
import { parseServerDateTimeString } from '../../src/datetime/mskTime';
import type { MemberBookingRow } from '../../src/api/types';

describe('intervalFromMemberRow', () => {
  it('интерпретирует YYYY-MM-DD HH:mm как Europe/Moscow (как POST /booking), не как локальные часы устройства', () => {
    const row: MemberBookingRow = {
      product_id: 1,
      product_pc_name: 'PC01',
      product_available_date_local_from: '2026-06-15 14:30:00',
      product_available_date_local_to: '2026-06-15 15:30:00',
      product_mins: 60,
    };
    const iv = intervalFromMemberRow(row);
    const a = parseServerDateTimeString('2026-06-15 14:30:00');
    const b = parseServerDateTimeString('2026-06-15 15:30:00');
    expect(iv).not.toBeNull();
    expect(iv!.start.getTime()).toBe(a!.getTime());
    expect(iv!.end.getTime()).toBe(b!.getTime());
  });
});
