import Constants from 'expo-constants';
import { applyServerTimeFromResponse } from '../datetime/serverBookingClock';
import { getSession } from '../auth/sessionStorage';
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
  const low = m.toLowerCase();
  if (code === 201) return true;
  if (code === 200 && low === 'success') return true;
  /** Часть прокси/upstream отдаёт `code: 0` при успехе (в т.ч. пустое сообщение). */
  if (code === 0 && (m === '' || low === 'success' || low === 'ok')) return true;
  if (code === 3 && (m === 'Successful' || m === 'Succes')) return true;
  if (code === 2 && m === 'Award received') return true;
  return false;
}

export function assertIcafeSuccess(parsed: IcafeProxyResponse): void {
  if (isIcafeProxySuccess(parsed.code, parsed.message)) return;
  throw new ApiError(parsed.message || `Код ${parsed.code}`, 200, { code: parsed.code, message: parsed.message });
}

/**
 * HTTP 200, но тело с `code` неуспеха (прокси vibe / обёртка над iCafe).
 * Не трогаем ответы без поля `code` (сырой JSON upstream).
 */
export function rejectIcafeGatewayErrorBody(parsed: unknown): void {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
  const o = parsed as Record<string, unknown>;
  if (typeof o.code !== 'number') return;
  const message = typeof o.message === 'string' ? o.message : '';
  if (o.code === 0) return;
  if (isIcafeProxySuccess(o.code, message)) return;
  throw new ApiError(message || `Код ${o.code}`, 200, { code: o.code, message });
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
  applyServerTimeFromResponse(res);
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
  /** Как у GET/POST с авторизацией: при HTTP 200 тело может быть `{ code, message }` от прокси/upstream iCafe. */
  rejectIcafeGatewayErrorBody(parsed);
  return parsed as T;
}

/**
 * Прямой хост `*.icafecloud.com` по доке принимает `Authorization: Bearer {YOUR_AUTH_KEY}` — ключ API из лицензии.
 * Сессия после `POST /login` на vibe — для прокси BlackBears на том же хосте, что и логин.
 */
function shouldUseIcafeLicenseBearer(): boolean {
  const key = process.env.EXPO_PUBLIC_ICAFE_CLOUD_API_KEY?.trim();
  if (!key) return false;
  try {
    const host = new URL(getIcafeBaseUrl()).hostname;
    return /\.icafecloud\.com$/i.test(host);
  } catch {
    return false;
  }
}

async function icafeAuthHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    Accept: 'application/json',
  };
  if (shouldUseIcafeLicenseBearer()) {
    h.Authorization = `Bearer ${process.env.EXPO_PUBLIC_ICAFE_CLOUD_API_KEY!.trim()}`;
    return h;
  }
  const session = await getSession();
  const bearer = session?.authToken?.trim() || session?.user?.privateKey?.trim();
  if (bearer) {
    h.Authorization = `Bearer ${bearer}`;
  }
  if (session?.cookie) {
    h.Cookie = session.cookie;
  }
  return h;
}

function appendQuery(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
  let urlStr = buildUrl(path);
  if (!query) return urlStr;
  const u = new URL(urlStr);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/** GET без заголовка Authorization (регистрация и т.п.). Для путей с «requires authentication» в доке iCafe Cloud предпочтительнее `icafeGetJsonWithAuth`. */
export async function icafeGetJson<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const urlStr = appendQuery(path, query);
  const res = await fetch(urlStr, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  applyServerTimeFromResponse(res);
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
  rejectIcafeGatewayErrorBody(parsed);
  return parsed as T;
}

/** GET с Bearer/Cookie сессии (memberSelf, история, rankingUrl и т.д.). */
export async function icafeGetJsonWithAuth<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const urlStr = appendQuery(path, query);
  const headers = await icafeAuthHeaders();
  const res = await fetch(urlStr, {
    method: 'GET',
    headers,
  });
  applyServerTimeFromResponse(res);
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
  rejectIcafeGatewayErrorBody(parsed);
  return parsed as T;
}

/** POST с авторизацией (topup, pcSessions, …). */
export async function icafePostJsonWithAuth<T = IcafeProxyResponse>(path: string, body: object): Promise<T> {
  const url = buildUrl(path);
  const baseHeaders = await icafeAuthHeaders();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...baseHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  applyServerTimeFromResponse(res);
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
  rejectIcafeGatewayErrorBody(parsed);
  return parsed as T;
}

/** PUT с авторизацией (официальный iCafe Cloud: обновление участника). */
export async function icafePutJsonWithAuth<T = IcafeProxyResponse>(path: string, body: object): Promise<T> {
  const url = buildUrl(path);
  const baseHeaders = await icafeAuthHeaders();
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...baseHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  applyServerTimeFromResponse(res);
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
  rejectIcafeGatewayErrorBody(parsed);
  return parsed as T;
}

/**
 * Успех для POST iCafe в формате { code, message } (как в реф. Android ProxyBBResponse).
 */
export function ensureIcafePostSuccess(raw: IcafeProxyResponse | Record<string, unknown>): void {
  const o = raw as Record<string, unknown>;
  const code = typeof o.code === 'number' ? o.code : NaN;
  const message = typeof o.message === 'string' ? o.message : '';
  if (Number.isFinite(code) && isIcafeProxySuccess(code, message)) return;
  if (Number.isFinite(code)) {
    throw new ApiError(message || `Код ${code}`, 200, { code, message });
  }
  throw new ApiError(message || 'Ошибка ответа API', 200);
}

/**
 * POST/PUT: если в ответе есть конверт `{ code, message }` — проверяем как обычно;
 * иначе считаем успехом (например пустой JSON у REST PUT upstream).
 */
export function ensureIcafeWriteSuccess(raw: IcafeProxyResponse | Record<string, unknown>): void {
  const o = raw as Record<string, unknown>;
  if (typeof o.code === 'number') {
    ensureIcafePostSuccess(o);
    return;
  }
  const err =
    typeof o.error === 'string'
      ? o.error
      : o.error && typeof o.error === 'object' && o.error !== null && 'message' in o.error
        ? String((o.error as { message?: string }).message)
        : '';
  if (err.trim()) {
    throw new ApiError(err.trim(), 200);
  }
}

export type MemberCreatedData = {
  member_id?: number | string;
};

export function extractMemberId(data: MemberCreatedData | undefined): string | null {
  if (!data || data.member_id === undefined || data.member_id === null) return null;
  return String(data.member_id);
}
