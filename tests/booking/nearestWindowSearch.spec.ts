import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookingFlowApi } from '../../src/api/endpoints';
import type { CafeItem } from '../../src/api/types';
import { combineServerISODateAndTime } from '../../src/features/booking/bookingTimeUtils';
import { findNearestClubWindows } from '../../src/features/booking/nearestWindowSearch';

const cafe: CafeItem = {
  address: 'Test club',
  icafe_id: 1,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('findNearestClubWindows', () => {
  it('aligns fallback nearest windows to a 10-minute booking grid', async () => {
    const availableSpy = vi.spyOn(bookingFlowApi, 'availablePcs').mockResolvedValue({
      time_frame: '30',
      pc_list: [
        {
          pc_name: 'PC09',
          pc_area_name: 'GameZone',
          pc_group_name: 'GameZone',
          pc_icafe_id: 1,
          price_name: 'GameZone',
          is_using: false,
          start_date: null,
          start_time: null,
          end_date: null,
          end_time: null,
        },
      ],
    });

    const bookingNowMs = new Date('2026-04-16T13:53:21.000Z').getTime();
    const results = await findNearestClubWindows(
      cafe,
      {
        mins: 60,
        partySize: 1,
        zoneFilter: { mode: 'any' },
      },
      {
        maxSlots: 1,
        bookingNowMs,
        stepAdvanceMins: 10,
      },
    );

    expect(availableSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cafeId: 1,
        dateStart: '2026-04-16',
        timeStart: '17:00:00',
        mins: 60,
        isFindWindow: true,
      }),
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.windowStart.getTime()).toBe(
      combineServerISODateAndTime('2026-04-16', '17:00:00')!.getTime(),
    );
  });
});
