import { describe, expect, it } from 'vitest';
import type { MemberBookingRow, PcListItem } from '../../src/api/types';
import { busyUntilInstantForPcListItem } from '../../src/features/booking/memberBookingsUtils';
import { combineServerISODateAndTime, plannedInterval } from '../../src/features/booking/bookingTimeUtils';

function basePc(over: Partial<PcListItem>): PcListItem {
  return {
    pc_name: 'PC1',
    pc_area_name: 'A',
    pc_icafe_id: 1,
    is_using: false,
    start_date: null,
    start_time: null,
    end_date: null,
    end_time: null,
    ...over,
  };
}

function rowForPc(
  pc: string,
  from: string,
  to: string,
  overrides: Partial<MemberBookingRow> = {},
): MemberBookingRow {
  return {
    product_id: 1,
    product_pc_name: pc,
    product_available_date_local_from: from,
    product_available_date_local_to: to,
    product_mins: 90,
    member_offer_id: 1,
    ...overrides,
  };
}

describe('busyUntilInstantForPcListItem', () => {
  it('конец из брони клуба, пересекающей план', () => {
    const plan = plannedInterval('2026-06-15', '16:00', 120);
    expect(plan).not.toBeNull();
    const rows = [
      rowForPc('PC1', '2026-06-15 17:00:00', '2026-06-15 18:30:00'),
    ];
    const end = busyUntilInstantForPcListItem(basePc({ pc_name: 'PC1' }), plan!, rows, Date.now());
    const expected = combineServerISODateAndTime('2026-06-15', '18:30:00');
    expect(end).not.toBeNull();
    expect(expected).not.toBeNull();
    expect(end!.getTime()).toBe(expected!.getTime());
  });

  it('конец из полей available-pcs при пересечении с планом', () => {
    const plan = plannedInterval('2026-06-15', '16:00', 120);
    expect(plan).not.toBeNull();
    const p = basePc({
      start_date: '2026-06-15',
      start_time: '17:00:00',
      end_date: '2026-06-15',
      end_time: '18:00:00',
    });
    const end = busyUntilInstantForPcListItem(p, plan!, [], Date.now());
    const expected = combineServerISODateAndTime('2026-06-15', '18:00:00');
    expect(end).not.toBeNull();
    expect(expected).not.toBeNull();
    expect(end!.getTime()).toBe(expected!.getTime());
  });
});
