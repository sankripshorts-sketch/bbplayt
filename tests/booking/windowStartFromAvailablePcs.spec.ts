import { describe, expect, it } from 'vitest';
import { combineServerISODateAndTime, windowStartFromAvailablePcs } from '../../src/features/booking/bookingTimeUtils';
import type { AvailablePcsData } from '../../src/api/types';

describe('windowStartFromAvailablePcs', () => {
  it('time_frame только с часами: подставляет contextDateISO (как dateStart в запросе)', () => {
    const data: AvailablePcsData = {
      time_frame: '14:30 – 16:00',
      pc_list: [],
    };
    const got = windowStartFromAvailablePcs(data, '2026-04-16');
    const want = combineServerISODateAndTime('2026-04-16', '14:30:00');
    expect(want).not.toBeNull();
    expect(got?.getTime()).toBe(want!.getTime());
  });

  it('без contextDateISO и без pc_list — не угадывает день', () => {
    const data: AvailablePcsData = {
      time_frame: '14:30 – 16:00',
      pc_list: [],
    };
    expect(windowStartFromAvailablePcs(data)).toBeNull();
  });

  it('полная дата в time_frame — без contextDateISO', () => {
    const data: AvailablePcsData = {
      time_frame: '16.04.2026 14:30 – 16.04.2026 16:00',
      pc_list: [],
    };
    const got = windowStartFromAvailablePcs(data);
    const want = combineServerISODateAndTime('2026-04-16', '14:30:00');
    expect(want).not.toBeNull();
    expect(got?.getTime()).toBe(want!.getTime());
  });

  it('числовой time_frame (шаг сетки) + свободные ПК: берет старт из контекста запроса', () => {
    const data: AvailablePcsData = {
      time_frame: '30',
      pc_list: [
        {
          pc_name: 'PC09',
          pc_area_name: 'GameZone',
          pc_icafe_id: 1,
          is_using: false,
          start_date: null,
          start_time: null,
          end_date: null,
          end_time: null,
        },
      ],
    };
    const got = windowStartFromAvailablePcs(data, '2026-04-21', '11:00');
    const want = combineServerISODateAndTime('2026-04-21', '11:00:00');
    expect(want).not.toBeNull();
    expect(got?.getTime()).toBe(want!.getTime());
  });
});
