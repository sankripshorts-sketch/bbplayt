import Constants from 'expo-constants';
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

export async function parseVibeBody<T>(response: Response): Promise<T> {
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

  if (
    parsed &&
    typeof parsed === 'object' &&
    parsed !== null &&
    'code' in parsed &&
    typeof (parsed as VibeEnvelope<unknown>).code === 'number'
  ) {
    const env = parsed as VibeEnvelope<T>;
    if (env.code !== 0) {
      throw new ApiError(env.message || `Код ${env.code}`, response.status, {
        code: env.code,
        message: env.message,
      });
    }
    return env.data as T;
  }

  return parsed as T;
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
