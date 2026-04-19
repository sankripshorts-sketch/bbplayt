import { describe, expect, it } from 'vitest';
import type { AllBooksData, MemberBookingRow } from '../../src/api/types';
import { findOverlappingOutstandingBooking } from '../../src/features/booking/memberBookingsUtils';
import { combineServerISODateAndTime, plannedInterval } from '../../src/features/booking/bookingTimeUtils';

function row(
  from: string,
  to: string,
  overrides: Partial<MemberBookingRow> = {},
): MemberBookingRow {
  return {
    product_id: 1,
    product_pc_name: 'PC1',
    product_available_date_local_from: from,
    product_available_date_local_to: to,
    product_mins: 60,
    member_offer_id: 1,
    ...overrides,
  };
}

describe('findOverlappingOutstandingBooking', () => {
  const day = '2026-06-15';
  /** «Сейчас» — до начала брони, чтобы строка считалась upcoming. */
  const nowBeforeBookings = combineServerISODateAndTime(day, '09:00:00')!.getTime();

  it('не блокирует другой слот, если есть активная бронь на другое время (без пересечения)', () => {
    const data: AllBooksData = {
      '1': [row(`${day} 10:00:00`, `${day} 11:00:00`)],
    };
    const plan = plannedInterval(day, '14:00', 60);
    expect(plan).not.toBeNull();
    expect(findOverlappingOutstandingBooking(data, plan!, nowBeforeBookings)).toBeNull();
  });

  it('блокирует вторую бронь на тот же интервал времени (пересечение с предстоящей)', () => {
    const data: AllBooksData = {
      '1': [row(`${day} 10:00:00`, `${day} 11:00:00`)],
    };
    const plan = plannedInterval(day, '10:30', 60);
    expect(plan).not.toBeNull();
    const hit = findOverlappingOutstandingBooking(data, plan!, nowBeforeBookings);
    expect(hit).not.toBeNull();
    expect(hit!.icafeId).toBe('1');
  });

  it('игнорирует уже завершённую бронь при проверке пересечения', () => {
    const data: AllBooksData = {
      '1': [row(`${day} 10:00:00`, `${day} 11:00:00`)],
    };
    const plan = plannedInterval(day, '10:30', 60);
    expect(plan).not.toBeNull();
    const nowAfter = combineServerISODateAndTime(day, '12:00:00')!.getTime();
    expect(findOverlappingOutstandingBooking(data, plan!, nowAfter)).toBeNull();
  });
});
