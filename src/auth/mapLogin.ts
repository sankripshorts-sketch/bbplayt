import type { SessionUser } from '../api/types';

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return '';
}

/**
 * Числовой `member_id` участника iCafe (как в ЛК «ID (member_id)»).
 * Не путать с `member_id_icafe_id`, `id` сессии и т.п.
 */
export function resolveMemberIdCanonical(data: Record<string, unknown>): string {
  const nested = data.member;
  if (nested && typeof nested === 'object' && nested !== null && !Array.isArray(nested)) {
    const r = nested as Record<string, unknown>;
    const v = r.member_id ?? r.memberId ?? r.memberID;
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  const v = data.member_id ?? data.memberId ?? data.memberID;
  if (v !== undefined && v !== null && String(v).trim() !== '') {
    return String(v).trim();
  }
  return '';
}

export function mapLoginData(
  data: Record<string, unknown>,
  fallbackUsername: string
): SessionUser {
  let memberId = resolveMemberIdCanonical(data);
  if (!memberId) {
    memberId = pickString(data, ['member_id', 'memberId', 'memberID']);
  }
  if (!memberId) {
    memberId = pickString(data, ['id', 'client_id']);
  }
  const memberAccount = pickString(data, [
    'member_account',
    'username',
    'account',
    'login',
    'name',
  ]);

  let balanceRub: number | undefined;
  const bal =
    data.balance ?? data.money ?? data.balance_rub ?? data.balanceRub ?? data.member_balance;
  if (typeof bal === 'number' && Number.isFinite(bal)) balanceRub = bal;
  else if (typeof bal === 'string') {
    const n = parseFloat(bal.replace(',', '.'));
    if (Number.isFinite(n)) balanceRub = n;
  }

  const account = memberAccount || fallbackUsername;
  const displayName =
    pickString(data, ['display_name', 'displayName', 'nickname']) || account;

  let privateKey = pickString(data, ['private_key', 'privateKey']);
  if (!privateKey && data.member && typeof data.member === 'object' && data.member !== null) {
    privateKey = pickString(data.member as Record<string, unknown>, ['private_key', 'privateKey']);
  }

  return {
    memberId,
    memberAccount: account,
    ...(privateKey ? { privateKey } : {}),
    balanceRub,
    displayName,
    raw: data,
  };
}

export function extractToken(data: Record<string, unknown>): string | undefined {
  const t = pickString(data, [
    'token',
    'access_token',
    'accessToken',
    'auth_token',
    'jwt',
  ]);
  return t || undefined;
}
