import type { AvailablePcsData, CafeItem } from '../../api/types';
import { bookingFlowApi } from '../../api/endpoints';
import { windowStartFromAvailablePcs } from './bookingTimeUtils';

export type CrossClubCandidate = {
  cafe: CafeItem;
  data: AvailablePcsData;
  windowStart: Date;
};

export type CrossClubSearchParams = {
  dateStart: string;
  timeStart: string;
  mins: number;
  priceName?: string;
};

/**
 * Параллельный запрос available-pcs по всем клубам; возвращает кандидатов с валидным окном, по возрастанию времени.
 */
export async function findNearestAcrossClubs(
  cafes: CafeItem[],
  params: CrossClubSearchParams,
): Promise<CrossClubCandidate[]> {
  const settled = await Promise.allSettled(
    cafes.map(async (cafe) => {
      const data = await bookingFlowApi.availablePcs({
        cafeId: cafe.icafe_id,
        dateStart: params.dateStart,
        timeStart: params.timeStart,
        mins: params.mins,
        isFindWindow: true,
        priceName: params.priceName,
      });
      return { cafe, data };
    }),
  );

  const out: CrossClubCandidate[] = [];
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    const { cafe, data } = r.value;
    const windowStart = windowStartFromAvailablePcs(data);
    if (!windowStart) continue;
    const hasFree = (data.pc_list ?? []).some((p) => !p.is_using);
    if (!hasFree) continue;
    out.push({ cafe, data, windowStart });
  }

  out.sort((a, b) => a.windowStart.getTime() - b.windowStart.getTime());
  return out;
}
