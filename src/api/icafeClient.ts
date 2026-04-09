import Constants from 'expo-constants';
import { ApiError } from './client';

/** База для iCafe-прокси: members, SMS, verify (как в доке + референсном клиенте). */
export function getIcafeBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_ICAFE_API_BASE_URL;
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string; icafeApiBaseUrl?: string } | undefined;
  const raw = (fromEnv || extra?.icafeApiBaseUrl || extra?.apiBaseUrl || '').replace(/\/$/, '');
  if (!raw) throw new ApiError('Задайте EXPO_PUBLIC_API_BASE_URL или EXPO_PUBLIC_ICAFE_API_BASE_URL', 0);
  return raw;
}

export type IcafeProxyResponse<T = unknown> = {
  code: number;
  message: string;
  private_key?: string;
  data?: T;
  member?: unknown;
  next_request_sms_time?: number;
  encoded_data?: string;
};

/** Коды успеха в стиле ProxyBBResponse (реф. Android). */
export function isIcafeProxySuccess(code: number, message: string): boolean {
  const m = (message || '').trim();
  if (code === 201) return true;
  if (code === 200 && m.toLowerCase() === 'success') return true;
  if (code === 3 && (m === 'Successful' || m === 'Succes')) return true;
  if (code === 2 && m === 'Award received') return true;
  return false;
}

export function assertIcafeSuccess(parsed: IcafeProxyResponse): void {
  if (isIcafeProxySuccess(parsed.code, parsed.message)) return;
  throw new ApiError(parsed.message || `Код ${parsed.code}`, 200, { code: parsed.code, message: parsed.message });
}

function buildUrl(path: string): string {
  const base = getIcafeBaseUrl();
  const p = path.startsWith('/') ? path.slice(1) : path;
  return base.endsWith('/') ? `${base}${p}` : `${base}/${p}`;
}

export async function icafePostJson<T = IcafeProxyResponse>(path: string, body: object): Promise<T> {
  const url = buildUrl(path);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(text || 'Некорректный JSON', res.status);
  }
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: string }).message)
        : res.statusText;
    throw new ApiError(msg, res.status);
  }
  return parsed as T;
}

export type MemberCreatedData = {
  member_id?: number | string;
};

export function extractMemberId(data: MemberCreatedData | undefined): string | null {
  if (!data || data.member_id === undefined || data.member_id === null) return null;
  return String(data.member_id);
}
