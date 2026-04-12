import Constants from 'expo-constants';
import type { SessionUser } from '../api/types';
import { getApiBaseUrl } from './apiBaseUrl';

/** Запасной URL, если не задан ни API, ни topUpUrl (старый лендинг). */
const FALLBACK_TOP_UP_URL = 'https://bbgms.link/bbplay/ru';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * URL страницы пополнения:
 * 1. `EXPO_PUBLIC_TOP_UP_URL` — явный адрес;
 * 2. `app.config.js` → `extra.topUpUrl`, если непустой;
 * 3. **тот же хост, что `EXPO_PUBLIC_API_BASE_URL`** + путь `EXPO_PUBLIC_TOP_UP_PATH` (по умолчанию `bbplay/ru`),
 *    чтобы WebView шёл на ваш сервер и подхватывал Cookie/Bearer из сессии;
 * 4. запасной лендинг `bbgms.link`.
 */
export function getTopUpUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_TOP_UP_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return trimTrailingSlash(fromEnv.trim());
  }
  const extra = Constants.expoConfig?.extra as { topUpUrl?: string } | undefined;
  const fromExtra = extra?.topUpUrl != null ? String(extra.topUpUrl).trim() : '';
  if (fromExtra.length > 0) {
    return trimTrailingSlash(fromExtra);
  }

  const apiBase = getApiBaseUrl();
  if (apiBase) {
    try {
      const path = (process.env.EXPO_PUBLIC_TOP_UP_PATH || 'bbplay/ru').replace(/^\//, '');
      const base = apiBase.endsWith('/') ? apiBase : `${apiBase}/`;
      return trimTrailingSlash(new URL(path, base).href);
    } catch {
      /* неверный EXPO_PUBLIC_API_BASE_URL — не роняем экран брони */
    }
  }

  return FALLBACK_TOP_UP_URL;
}

/**
 * Добавляет в URL пополнения member_id и логин — страница ЛК может подхватить контекст.
 * Безопасно при отсутствии пользователя.
 */
export function buildTopUpUrlWithSession(baseUrl: string, user: SessionUser | null | undefined): string {
  try {
    const u = new URL(baseUrl);
    if (user?.memberId) u.searchParams.set('member_id', String(user.memberId));
    if (user?.memberAccount) u.searchParams.set('member_account', String(user.memberAccount));
    return u.toString();
  } catch {
    return baseUrl;
  }
}
