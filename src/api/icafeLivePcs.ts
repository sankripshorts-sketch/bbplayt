import { ApiError } from './client';
import { icafeGetJsonWithAuth } from './icafeClient';
import type { PcListItem } from './types';
import { normalizeAvailablePcsData } from './normalizeAvailablePcs';

/**
 * Текущее онлайн-состояние ПК клуба (занятость «сейчас»).
 * `GET /api/v2/cafe/{cafeId}/pcs` — полный список ПК (iCafe Cloud).
 */
export async function fetchLiveCafePcs(cafeId: number): Promise<PcListItem[]> {
  const raw = await icafeGetJsonWithAuth<unknown>(`api/v2/cafe/${cafeId}/pcs`);
  return normalizeAvailablePcsData(raw).pc_list;
}

/**
 * Вариант iCafe Cloud: список ПК в контексте текущего участника.
 * `GET /api/v2/cafe/{cafeId}/pcs/action/member_pcs` (Bearer).
 */
export async function fetchLiveMemberPcs(cafeId: number): Promise<PcListItem[]> {
  const raw = await icafeGetJsonWithAuth<unknown>(`api/v2/cafe/${cafeId}/pcs/action/member_pcs`);
  return normalizeAvailablePcsData(raw).pc_list;
}

function shouldFallbackLivePcs(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  if (e.status === 404 || e.status === 403) return true;
  return /not allowed|forbidden/i.test(e.message);
}

/**
 * Оверлей «занят сейчас» для UI: сначала `member_pcs`, при недоступности шлюза — `pcs`.
 * Не путать с выбором слота брони — для слота только vibe `GET /available-pcs-for-booking` (`bookingFlowApi.availablePcs`).
 */
export async function fetchLivePcsForUi(cafeId: number): Promise<PcListItem[]> {
  try {
    return await fetchLiveMemberPcs(cafeId);
  } catch (e) {
    if (!shouldFallbackLivePcs(e)) throw e;
    return fetchLiveCafePcs(cafeId);
  }
}

/**
 * Наложить поля «живого» списка на список из available-pcs.
 * Не использовать для UI выбора слота брони: live — занятость «сейчас», available-pcs — прогноз на `dateStart`/`timeStart`/`mins`;
 * merge искажает слот (см. `docs/API_VIBE_LOGIC.md`).
 */
export function mergePcListWithLive(avail: PcListItem[], live: PcListItem[] | null | undefined): PcListItem[] {
  if (!live?.length) return avail;
  const liveMap = new Map(live.map((p) => [String(p.pc_name).trim().toLowerCase(), p]));
  return avail.map((p) => {
    const key = String(p.pc_name).trim().toLowerCase();
    const L = liveMap.get(key);
    if (!L) return p;
    return {
      ...p,
      is_using: L.is_using,
      start_date: L.start_date ?? p.start_date,
      start_time: L.start_time ?? p.start_time,
      end_date: L.end_date ?? p.end_date,
      end_time: L.end_time ?? p.end_time,
    };
  });
}
