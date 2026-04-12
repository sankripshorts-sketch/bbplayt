import { ApiError } from './client';
import { icafeGetJsonWithAuth } from './icafeClient';

/** Ответ GET /api/v2/cafe/{cafeId}/members (iCafe Cloud, см. dev.icafecloud.com/docs). */
type IcafeMembersEnvelope = {
  code?: number;
  message?: string;
  data?: {
    members?: unknown[];
    license_using_billing?: number;
    paging_info?: { page?: string; pages?: number; total_records?: number };
  };
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function extractMembersRows(raw: IcafeMembersEnvelope): unknown[] {
  const data = raw.data;
  if (!data || typeof data !== 'object') return [];
  const m = (data as { members?: unknown }).members;
  if (Array.isArray(m)) return m;
  /** Ответ iCafe Cloud может быть одним объектом участника без массива `members`. */
  if ('member_id' in data && !Array.isArray(data)) return [data];
  return [];
}

function parseMoney(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickMemberRow(
  members: unknown[],
  memberId: string,
  memberAccount: string
): Record<string, unknown> | null {
  const idNorm = memberId.trim();
  const accNorm = memberAccount.trim().toLowerCase();

  for (const m of members) {
    const row = asRecord(m);
    if (!row) continue;
    const mid = row.member_id != null ? String(row.member_id) : '';
    const acc = row.member_account != null ? String(row.member_account).toLowerCase() : '';
    if (mid === idNorm && acc === accNorm) return row;
  }
  for (const m of members) {
    const row = asRecord(m);
    if (!row) continue;
    const mid = row.member_id != null ? String(row.member_id) : '';
    if (mid === idNorm) return row;
  }
  for (const m of members) {
    const row = asRecord(m);
    if (!row) continue;
    const acc = row.member_account != null ? String(row.member_account).toLowerCase() : '';
    if (accNorm && acc === accNorm) return row;
  }
  return null;
}

/**
 * Баланс участника по GET `/api/v2/cafe/{cafeId}/members` с поиском (iCafe Cloud).
 * В доке метод требует `Authorization: Bearer`; при открытой сессии передаём тот же Bearer, что и для topup.
 * Использует search_field + search_text, чтобы не грузить все страницы списка.
 */
export async function fetchMemberBalanceIcafe(params: {
  cafeId: number;
  memberId: string;
  memberAccount: string;
}): Promise<{ balanceRub: number; bonusRub?: number }> {
  const { cafeId, memberId, memberAccount } = params;
  const path = `api/v2/cafe/${cafeId}/members`;

  const tryFetch = async (search_field: string, search_text: string): Promise<IcafeMembersEnvelope> => {
    return icafeGetJsonWithAuth<IcafeMembersEnvelope>(path, {
      search_field,
      search_text,
      page: 1,
    });
  };

  let raw: IcafeMembersEnvelope = { data: { members: [] } };
  let members: unknown[] = [];
  let row: Record<string, unknown> | null = null;

  if (memberAccount.trim()) {
    raw = await tryFetch('member_account', memberAccount.trim());
    members = extractMembersRows(raw);
    row = pickMemberRow(members, memberId, memberAccount);
  }

  if (!row) {
    raw = await tryFetch('member_id', memberId.trim());
    members = extractMembersRows(raw);
    row = pickMemberRow(members, memberId, memberAccount);
  }

  if (!row) {
    throw new ApiError('Участник не найден в ответе GET /members', 200);
  }

  const balanceRub = parseMoney(row.balance) ?? parseMoney(row.member_balance);
  if (balanceRub === undefined) {
    throw new ApiError('В карточке участника нет поля баланса', 200);
  }

  const bonusRub =
    parseMoney(row.bonus_balance) ??
    parseMoney(row.member_balance_bonus) ??
    parseMoney(row.member_bonus_balance);

  return { balanceRub, bonusRub };
}

/** Полная строка участника из GET `/api/v2/cafe/{cafeId}/members` (для профиля). */
export async function fetchMemberRowIcafe(params: {
  cafeId: number;
  memberId: string;
  memberAccount: string;
}): Promise<Record<string, unknown>> {
  const { cafeId, memberId, memberAccount } = params;
  const path = `api/v2/cafe/${cafeId}/members`;

  const tryFetch = async (search_field: string, search_text: string): Promise<IcafeMembersEnvelope> => {
    return icafeGetJsonWithAuth<IcafeMembersEnvelope>(path, {
      search_field,
      search_text,
      page: 1,
    });
  };

  let raw: IcafeMembersEnvelope = { data: { members: [] } };
  let members: unknown[] = [];
  let row: Record<string, unknown> | null = null;

  if (memberAccount.trim()) {
    raw = await tryFetch('member_account', memberAccount.trim());
    members = extractMembersRows(raw);
    row = pickMemberRow(members, memberId, memberAccount);
  }

  if (!row) {
    raw = await tryFetch('member_id', memberId.trim());
    members = extractMembersRows(raw);
    row = pickMemberRow(members, memberId, memberAccount);
  }

  if (!row) {
    throw new ApiError('Участник не найден в ответе GET /members', 200);
  }

  return row;
}
