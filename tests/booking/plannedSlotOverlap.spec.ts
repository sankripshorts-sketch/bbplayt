import { describe, expect, it } from 'vitest';
import type { PcListItem } from '../../src/api/types';
import {
  combineServerISODateAndTime,
  pcListItemBlocksPlannedSlot,
  plannedInterval,
} from '../../src/features/booking/bookingTimeUtils';

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

describe('pcListItemBlocksPlannedSlot', () => {
  it('блокирует слот при пересечении: чужая бронь 17:00–18:00, план 16:00 на 2 ч', () => {
    const plan = plannedInterval('2026-06-15', '16:00', 120);
    expect(plan).not.toBeNull();
    const p = basePc({
      is_using: false,
      start_date: '2026-06-15',
      start_time: '17:00:00',
      end_date: '2026-06-15',
      end_time: '18:00:00',
    });
    expect(pcListItemBlocksPlannedSlot(p, plan!)).toBe(true);
  });

  it('не блокирует при отсутствии пересечения', () => {
    const plan = plannedInterval('2026-06-15', '18:00', 60);
    expect(plan).not.toBeNull();
    const p = basePc({
      start_date: '2026-06-15',
      start_time: '16:00:00',
      end_date: '2026-06-15',
      end_time: '17:00:00',
    });
    expect(pcListItemBlocksPlannedSlot(p, plan!)).toBe(false);
  });

  it('границы строки ПК совпадают с проверяемым слотом и ПК свободен — не блокирует (метаданные find-window)', () => {
    const plan = plannedInterval('2026-06-15', '16:00', 120);
    expect(plan).not.toBeNull();
    const p = basePc({
      is_using: false,
      start_date: '2026-06-15',
      start_time: '16:00:00',
      end_date: '2026-06-15',
      end_time: '18:00:00',
    });
    expect(pcListItemBlocksPlannedSlot(p, plan!)).toBe(false);
  });

  it('широкий интервал (вся смена) в find-window: без флага пересечение считается занятостью; с findWindowListSemantics — свободен', () => {
    const plan = plannedInterval('2026-06-15', '16:00', 60);
    expect(plan).not.toBeNull();
    const p = basePc({
      is_using: false,
      start_date: '2026-06-15',
      start_time: '09:00:00',
      end_date: '2026-06-15',
      end_time: '23:00:00',
    });
    expect(pcListItemBlocksPlannedSlot(p, plan!)).toBe(true);
    expect(pcListItemBlocksPlannedSlot(p, plan!, undefined, { findWindowListSemantics: true })).toBe(false);
  });

  it('частичное пересечение с бронью — блокирует даже при findWindowListSemantics', () => {
    const plan = plannedInterval('2026-06-15', '16:00', 60);
    expect(plan).not.toBeNull();
    const p = basePc({
      is_using: false,
      start_date: '2026-06-15',
      start_time: '16:30:00',
      end_date: '2026-06-15',
      end_time: '18:00:00',
    });
    expect(pcListItemBlocksPlannedSlot(p, plan!, undefined, { findWindowListSemantics: true })).toBe(true);
  });

  it('те же границы, но ПК занят сессией — блокирует', () => {
    const plan = plannedInterval('2026-06-15', '16:00', 120);
    expect(plan).not.toBeNull();
    const p = basePc({
      is_using: true,
      start_date: '2026-06-15',
      start_time: '16:00:00',
      end_date: '2026-06-15',
      end_time: '18:00:00',
    });
    expect(pcListItemBlocksPlannedSlot(p, plan!)).toBe(true);
  });

  it('is_using без границ в ответе: занят только если выбранный слот пересекает «сейчас»', () => {
    const plan = plannedInterval('2026-06-15', '12:00', 60);
    expect(plan).not.toBeNull();
    const mid = plan!.start.getTime() + 30 * 60 * 1000;
    expect(pcListItemBlocksPlannedSlot(basePc({ is_using: true }), plan!, mid)).toBe(true);
    const before = plan!.start.getTime() - 3600_000;
    expect(pcListItemBlocksPlannedSlot(basePc({ is_using: true }), plan!, before)).toBe(false);
    const after = plan!.end.getTime() + 1000;
    expect(pcListItemBlocksPlannedSlot(basePc({ is_using: true }), plan!, after)).toBe(false);
  });
});

describe('plannedInterval Москва', () => {
  it('16:00 + 120 мин заканчивается в 18:00 МСК', () => {
    const plan = plannedInterval('2026-06-15', '16:00', 120);
    expect(plan).not.toBeNull();
    const end = combineServerISODateAndTime('2026-06-15', '18:00:00');
    expect(plan!.end.getTime()).toBe(end!.getTime());
  });
});
