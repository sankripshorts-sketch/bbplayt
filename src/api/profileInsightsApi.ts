import { ApiError } from './client';
import { icafeGetJsonWithAuth, icafePostJsonWithAuth } from './icafeClient';
import { vibeGet } from './vibeClient';

/** По умолчанию — пути прокси vibe (см. docs/API_VIBE_LOGIC.md). `1` = официальные пути iCafe Cloud (GET …/balanceHistory, GET …/memberSessionHistory). */
function useIcafeCloudInsightPaths(): boolean {
  return process.env.EXPO_PUBLIC_INSIGHTS_USE_ICAFE_CLOUD_PATHS === '1';
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Прокси иногда отвечает HTTP 200 с телом-ошибкой — не показывать это как «данные». */
function throwIfAccessDeniedPayload(parsed: unknown): void {
  if (!parsed || typeof parsed !== 'object') return;
  const msg = (parsed as { message?: unknown }).message;
  if (typeof msg !== 'string') return;
  if (
    /api not allowed/i.test(msg) ||
    /недоступен/i.test(msg) ||
    /not allowed/i.test(msg)
  ) {
    throw new ApiError(msg, 403);
  }
}

/**
 * История движений по счёту.
 * Прокси vibe: `GET .../memberBalanceHistory?member_id=&page=` (docs/API_VIBE_LOGIC.md).
 * Прямой iCafe Cloud: `GET .../members/{memberId}/balanceHistory?page=` — см. EXPO_PUBLIC_INSIGHTS_USE_ICAFE_CLOUD_PATHS.
 */
export async function fetchMemberBalanceHistory(
  cafeId: number,
  params: { memberId: string; page?: number }
): Promise<unknown> {
  const page = params.page ?? 1;
  const mid = String(params.memberId).trim();
  let data: unknown;
  if (useIcafeCloudInsightPaths()) {
    const enc = encodeURIComponent(mid);
    data = await icafeGetJsonWithAuth(`api/v2/cafe/${cafeId}/members/${enc}/balanceHistory`, { page });
  } else {
    data = await icafeGetJsonWithAuth(`api/v2/cafe/${cafeId}/memberBalanceHistory`, {
      member_id: mid,
      page,
    });
  }
  throwIfAccessDeniedPayload(data);
  return data;
}

/**
 * История игровых сессий участника.
 * Прокси vibe: `POST .../pcSessions` с телом `{ member_id, page }`.
 * Прямой iCafe Cloud: `GET .../pcSessions/{memberId}/memberSessionHistory?page=` — см. EXPO_PUBLIC_INSIGHTS_USE_ICAFE_CLOUD_PATHS.
 */
export async function fetchPcSessions(
  cafeId: number,
  params: { memberId: string; page?: number }
): Promise<unknown> {
  const page = params.page ?? 1;
  const mid = String(params.memberId).trim();
  let data: unknown;
  if (useIcafeCloudInsightPaths()) {
    const enc = encodeURIComponent(mid);
    data = await icafeGetJsonWithAuth(
      `api/v2/cafe/${cafeId}/pcSessions/${enc}/memberSessionHistory`,
      { page },
    );
  } else {
    data = await icafePostJsonWithAuth<Record<string, unknown>>(`api/v2/cafe/${cafeId}/pcSessions`, {
      member_id: mid,
      page,
    });
  }
  throwIfAccessDeniedPayload(data);
  return data;
}

/** Агрегаты профиля. `GET /customer-analysis` (vibe). */
export async function fetchCustomerAnalysis(memberAccount?: string): Promise<unknown> {
  const data = await vibeGet<unknown>('/customer-analysis', {
    memberAccount: memberAccount ?? undefined,
  });
  throwIfAccessDeniedPayload(data);
  return data;
}

/** Рейтинг клуба (URL или JSON). `GET .../members/action/rankingUrl` */
export async function fetchRankingPayload(cafeId: number): Promise<unknown> {
  const data = await icafeGetJsonWithAuth(`api/v2/cafe/${cafeId}/members/action/rankingUrl`);
  throwIfAccessDeniedPayload(data);
  return data;
}

/** Пытается извлечь URL для открытия в браузере. */
export function extractRankingUrl(payload: unknown): string | null {
  const r = asRecord(payload);
  if (!r) return null;
  const data = asRecord(r.data) ?? r;
  const candidates = [
    data.url,
    data.ranking_url,
    data.rankingUrl,
    r.url,
    (asRecord(data.result) ?? data)?.url,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//i.test(c.trim())) return c.trim();
  }
  return null;
}

/** Плоский список строк для отображения истории (массив или вложенный data). */
export function extractRowsForList(payload: unknown): unknown[] {
  const r = asRecord(payload);
  if (!r) return [];
  const inner = r.data !== undefined ? r.data : payload;
  if (Array.isArray(inner)) return inner;
  const bag = asRecord(inner);
  if (!bag) return [];
  const arr =
    bag.records ??
    bag.rows ??
    bag.list ??
    bag.history ??
    bag.logs ??
    bag.transactions ??
    bag.sessions ??
    bag.items ??
    bag.data;
  if (Array.isArray(arr)) return arr;
  return [];
}
