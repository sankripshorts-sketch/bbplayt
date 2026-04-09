import type { SessionUser } from '../api/types';

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return '';
}

export function mapLoginData(
  data: Record<string, unknown>,
  fallbackUsername: string
): SessionUser {
  const memberId = pickString(data, [
    'member_id',
    'memberId',
    'id',
    'client_id',
    'memberID',
  ]);
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

  return {
    memberId,
    memberAccount: account,
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
    'private_key',
  ]);
  return t || undefined;
}
