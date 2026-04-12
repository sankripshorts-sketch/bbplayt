import Constants from 'expo-constants';
import { applyServerTimeFromResponse } from '../datetime/serverBookingClock';
import type { VibeEnvelope } from './types';
import { ApiError } from './client';
import { getSession } from '../auth/sessionStorage';

function getBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return (fromEnv || extra?.apiBaseUrl || '').replace(/\/$/, '');
}

function buildUrl(path: string, searchParams?: Record<string, string | number | boolean | undefined>): string {
  const base = getBaseUrl();
  if (!base) throw new ApiError('Задайте EXPO_PUBLIC_API_BASE_URL (например https://vibe.blackbearsplay.ru)', 0);
  const url = new URL(path.startsWith('/') ? path.slice(1) : path, base.endsWith('/') ? base : `${base}/`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function extractVibeDataIfEnvelope<T>(parsed: unknown, httpStatus: number): T {
  if (
    parsed &&
    typeof parsed === 'object' &&
    parsed !== null &&
    'code' in parsed &&
    typeof (parsed as VibeEnvelope<unknown>).code === 'number'
  ) {
    const env = parsed as VibeEnvelope<T>;
    const msg = String(env.message ?? '');
    const ok =
      env.code === 0 ||
      (env.code === 3 &&
        (msg.trim() === '' ||
          /\bsuccess/i.test(msg) ||
          /^successful\.?$/i.test(msg.trim()) ||
          msg.trim().toLowerCase() === 'succes'));
    if (!ok) {
      throw new ApiError(env.message || `Код ${env.code}`, httpStatus, {
        code: env.code,
        message: env.message,
      });
    }
    return env.data as T;
  }

  return parsed as T;
}

export async function parseVibeBody<T>(response: Response): Promise<T> {
  applyServerTimeFromResponse(response);
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    throw new ApiError(text || 'Некорректный JSON', response.status);
  }

  if (!response.ok) {
    const msg =
      parsed && typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: string }).message)
        : response.statusText;
    throw new ApiError(msg, response.status);
  }

  return extractVibeDataIfEnvelope<T>(parsed, response.status);
}

async function authHeaders(): Promise<HeadersInit> {
  const h: Record<string, string> = {
    Accept: 'application/json',
  };
  const session = await getSession();
  if (session?.authToken) {
    h.Authorization = `Bearer ${session.authToken}`;
  }
  if (session?.cookie) {
    h.Cookie = session.cookie;
  }
  return h;
}

export async function vibeGet<T>(
  path: string,
  searchParams?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = buildUrl(path, searchParams);
  const res = await fetch(url, {
    method: 'GET',
    headers: await authHeaders(),
  });
  return parseVibeBody<T>(res);
}

export async function vibePostJson<T>(path: string, body: object): Promise<T> {
  const url = buildUrl(path);
  const headers = new Headers(await authHeaders());
  headers.set('Content-Type', 'application/json');
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return parseVibeBody<T>(res);
}

export async function vibePostForm<T>(path: string, fields: Record<string, string | number>): Promise<T> {
  const url = buildUrl(path);
  const headers = new Headers(await authHeaders());
  headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    body.set(k, String(v));
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: body.toString(),
  });
  return parseVibeBody<T>(res);
}

/** POST form с проверкой вложенного ответа iCafe (как для POST /booking). */
export async function vibePostFormCancel<T>(path: string, fields: Record<string, string | number>): Promise<T> {
  const url = buildUrl(path);
  const headers = new Headers(await authHeaders());
  headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    body.set(k, String(v));
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: body.toString(),
  });
  applyServerTimeFromResponse(res);
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
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
  assertIcafeNestedResponseOk(parsed, 'Отмена брони отклонена сервером iCafe');
  return extractVibeDataIfEnvelope<T>(parsed, res.status);
}

/**
 * Отмена брони по iCafe Cloud: `DELETE /api/v2/cafe/{cafeId}/bookings` + JSON `{ pc_name, member_offer_id }`, Bearer.
 * На шлюзе vibe `POST /booking-cancel` может быть отключён («Api not allowed»), этот путь обычно разрешён.
 */
export async function vibeDeleteIcafeBookings<T = unknown>(params: {
  icafeId: number;
  pc_name: string;
  member_offer_id: number;
}): Promise<T> {
  const url = buildUrl(`/api/v2/cafe/${params.icafeId}/bookings`);
  const headers = new Headers(await authHeaders());
  headers.set('Content-Type', 'application/json;charset=UTF-8');
  const body = JSON.stringify({
    pc_name: params.pc_name,
    member_offer_id: params.member_offer_id,
  });
  const res = await fetch(url, { method: 'DELETE', headers, body });
  applyServerTimeFromResponse(res);
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
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
  return parseBookingCancelDeleteResponse<T>(parsed, res.status);
}

function parseBookingCancelDeleteResponse<T>(parsed: unknown, httpStatus: number): T {
  if (!parsed || typeof parsed !== 'object' || parsed === null) {
    return parsed as T;
  }
  const o = parsed as Record<string, unknown>;
  const c = o.code;
  /** Ответ iCafe Cloud: `code: 200`, `data.error_count` / `results`. */
  if (c === 200 || c === '200') {
    const data = o.data;
    if (data && typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>;
      if (typeof d.error_count === 'number' && d.error_count > 0) {
        const errs = d.errors;
        let msg = 'Отмена брони отклонена сервером iCafe';
        if (Array.isArray(errs) && errs.length) {
          const first = errs[0];
          msg = typeof first === 'string' ? first : JSON.stringify(first);
        }
        throw new ApiError(msg, httpStatus);
      }
    }
    return (data ?? parsed) as T;
  }
  assertIcafeNestedResponseOk(parsed, 'Отмена брони отклонена сервером iCafe');
  return extractVibeDataIfEnvelope<T>(parsed, httpStatus);
}

function vibeOuterEnvelopeOk(code: number, message: unknown): boolean {
  const msg = String(message ?? '');
  return (
    code === 0 ||
    (code === 3 &&
      (msg.trim() === '' ||
        /\bsuccess/i.test(msg) ||
        /^successful\.?$/i.test(msg.trim()) ||
        msg.trim().toLowerCase() === 'succes'))
  );
}

/**
 * Вложенный ответ iCafe в теле прокси: при наличии `iCafe_response` проверяем успех, иначе полагаемся только на внешний `code`.
 */
function assertIcafeNestedResponseOk(parsed: unknown, fallbackMessage: string): void {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
  const o = parsed as Record<string, unknown>;
  const nested = o.iCafe_response ?? o.i_cafe_response ?? o.ICafe_response;
  if (nested == null || typeof nested !== 'object' || Array.isArray(nested)) return;
  const n = nested as Record<string, unknown>;
  const code = n.code;
  const ok =
    code === 200 ||
    code === '200' ||
    code === 0 ||
    code === '0' ||
    String(code) === '200';
  if (!ok) {
    const errMsg =
      typeof n.message === 'string' && n.message.trim()
        ? n.message
        : typeof n.msg === 'string' && n.msg.trim()
          ? n.msg
          : fallbackMessage;
    throw new ApiError(errMsg, 200);
  }
}

function assertIcafeBookingNestedSuccess(parsed: unknown): void {
  assertIcafeNestedResponseOk(parsed, 'Бронь отклонена сервером iCafe');
}

function parseBookingPostResponse(res: Response, parsed: unknown): unknown {
  applyServerTimeFromResponse(res);
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: string }).message)
        : res.statusText;
    throw new ApiError(msg, res.status);
  }
  assertIcafeBookingNestedSuccess(parsed);
  if (
    parsed &&
    typeof parsed === 'object' &&
    parsed !== null &&
    'code' in parsed &&
    typeof (parsed as VibeEnvelope<unknown>).code === 'number'
  ) {
    const env = parsed as VibeEnvelope<unknown>;
    if (!vibeOuterEnvelopeOk(env.code, env.message)) {
      throw new ApiError(env.message || `Код ${env.code}`, res.status, {
        code: env.code,
        message: env.message,
      });
    }
    return env.data;
  }
  return parsed;
}

/** POST /booking (application/json) — как `scripts/verify-booking-e2e.mjs` и iCafeCloud API. */
export async function vibePostJsonBooking(fields: Record<string, string | number>): Promise<unknown> {
  const url = buildUrl('/booking');
  const headers = new Headers(await authHeaders());
  headers.set('Content-Type', 'application/json;charset=UTF-8');
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(fields),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(text || 'Некорректный JSON', res.status);
  }
  return parseBookingPostResponse(res, parsed);
}

/**
 * POST /booking-batch — несколько ПК одним запросом (прокси vibe; тело см. `bookingFlowApi.createBookingBatch`).
 * При 404 на шлюзе вызывающий код может откатиться на несколько `POST /booking`.
 */
export async function vibePostJsonBookingBatch(body: Record<string, unknown>): Promise<unknown> {
  const url = buildUrl('/booking-batch');
  const headers = new Headers(await authHeaders());
  headers.set('Content-Type', 'application/json;charset=UTF-8');
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(text || 'Некорректный JSON', res.status);
  }
  return parseBookingPostResponse(res, parsed);
}

/**
 * Устаревший вариант `POST /booking` (form-urlencoded). В приложении используется `vibePostJsonBooking`.
 * Оставлен для совместимости со старыми прокси/скриптами.
 */
export async function vibePostFormBooking(fields: Record<string, string | number>): Promise<unknown> {
  const url = buildUrl('/booking');
  const headers = new Headers(await authHeaders());
  headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    body.set(k, String(v));
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: body.toString(),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(text || 'Некорректный JSON', res.status);
  }
  return parseBookingPostResponse(res, parsed);
}

/** Логин: отдельно читаем Set-Cookie и тело */
export async function vibeLogin(
  username: string,
  password: string
): Promise<{ data: Record<string, unknown>; setCookie: string | null }> {
  const url = buildUrl('/login');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    /** На vibe реально используется member_name; username оставляем для совместимости с ТЗ */
    body: JSON.stringify({ username, member_name: username, password }),
  });
  applyServerTimeFromResponse(res);
  const setCookie = res.headers.get('set-cookie');
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    throw new ApiError(text || 'Некорректный ответ логина', res.status);
  }
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: string }).message)
        : res.statusText;
    throw new ApiError(msg, res.status);
  }
  if (parsed && typeof parsed === 'object' && parsed !== null) {
    const o = parsed as Record<string, unknown>;
    /** Успешный логин iCafe/vibe: вложенный member, code часто 3, не 0 */
    if (o.member && typeof o.member === 'object' && o.member !== null) {
      const code = o.code;
      if (typeof code === 'number' && code !== 0 && code !== 3) {
        throw new ApiError(String(o.message ?? `Код ${code}`), res.status, {
          code,
          message: typeof o.message === 'string' ? o.message : undefined,
        });
      }
      const member = o.member as Record<string, unknown>;
      return {
        data: {
          ...member,
          private_key: o.private_key,
        },
        setCookie,
      };
    }
    if ('code' in o && typeof (o as VibeEnvelope<unknown>).code === 'number') {
      const env = parsed as VibeEnvelope<Record<string, unknown>>;
      if (env.code !== 0) {
        throw new ApiError(env.message || `Код ${env.code}`, res.status, {
          code: env.code,
          message: env.message,
        });
      }
      const inner = env.data;
      if (inner && typeof inner === 'object') {
        return { data: inner as Record<string, unknown>, setCookie };
      }
      throw new ApiError(
        typeof env.message === 'string' && env.message ? env.message : 'Неверный ответ логина',
        res.status
      );
    }
  }
  return { data: (parsed as Record<string, unknown>) ?? {}, setCookie };
}
