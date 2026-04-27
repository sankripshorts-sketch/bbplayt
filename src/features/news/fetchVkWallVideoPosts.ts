import { Platform } from 'react-native';
import {
  applyVkWallFetchProxyTemplate,
  getVkClubUrl,
  getVkClubUrlMobile,
  getVkFeedCustomUrl,
  getVkGroupId,
  getVkWallUrl,
  getVkWallUrlMobile,
} from '../../config/vkNewsConfig';
import {
  extractCommunityAvatarFromVkWallHtml,
  parseVkWallPosts,
  vkWallHtmlLooksValid,
  type VkWallPost,
} from './vkWallHtmlParser';

export type VkWallFetchResult = {
  posts: VkWallPost[];
  nextOffset: number | null;
  /** URL аватара сообщества; только для первой страницы (offset 0) или null */
  communityAvatarUrl?: string | null;
};

/** На странице стены VK обычно по 20 записей. */
const PAGE_STEP = 20;

/**
 * Только десктопный Chrome/Chromium. Mobile Safari / Android Chrome / okhttp / ReactNative
 * получают от VK «лёгкую» SPA без SSR постов (~110 KB) — парсеру нечего разбирать.
 */
const FETCH_PROFILES: Record<string, string>[] = [
  {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    Referer: 'https://vk.com/feed',
    'Cache-Control': 'max-age=0',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    Referer: 'https://vk.com/',
    'Upgrade-Insecure-Requests': '1',
  },
  {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    Referer: 'https://vk.com/',
  },
];

function decodeHtmlBody(buf: ArrayBuffer, contentType: string | null): string {
  const m = contentType && /charset\s*=\s*([^;]+)/i.exec(contentType);
  let label = (m?.[1] ?? 'utf-8').trim().replace(/^["']|["']$/g, '');
  if (label.toLowerCase() === 'utf8') label = 'utf-8';
  try {
    return new TextDecoder(label).decode(buf);
  } catch {
    return new TextDecoder('utf-8').decode(buf);
  }
}

function wallHasMorePages(html: string, currentOffset: number, gid: number): boolean {
  const nextOff = currentOffset + PAGE_STEP;
  return (
    html.includes(`wall-${gid}?offset=${nextOff}`) ||
    html.includes(`wall-${gid}?offset=${nextOff}&`) ||
    html.includes(`offset=${nextOff}`)
  );
}

async function fetchWallHtml(url: string, headers: Record<string, string>): Promise<string> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = new Error(`HTTP_${res.status}`);
    if (res.status === 418) {
      (err as Error & { code?: string }).code = 'VK_BLOCKED';
    }
    throw err;
  }
  const buf = await res.arrayBuffer();
  return decodeHtmlBody(buf, res.headers.get('content-type'));
}

/**
 * На Android/iOS `fetch` иногда уходит через стек, который подставляет okhttp/ReactNative UA
 * и игнорирует наш User-Agent. XMLHttpRequest чаще отдаёт заголовки как задано.
 */
function fetchWallHtmlViaXhr(url: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === 'undefined') {
      reject(new Error('NO_XHR'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'text';
    xhr.onerror = () => reject(new Error('XHR_NETWORK'));
    xhr.onload = () => {
      if (xhr.status === 418) {
        const err = new Error('HTTP_418');
        (err as Error & { code?: string }).code = 'VK_BLOCKED';
        reject(err);
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`HTTP_${xhr.status}`));
        return;
      }
      resolve(xhr.responseText ?? '');
    };
    xhr.open('GET', url);
    for (const [k, v] of Object.entries(headers)) {
      try {
        xhr.setRequestHeader(k, v);
      } catch {
        /* Sec-Fetch-* может быть запрещён на части платформ */
      }
    }
    xhr.send();
  });
}

async function fetchWallHtmlAnyProfile(url: string): Promise<string> {
  const resolvedUrl = applyVkWallFetchProxyTemplate(url);
  let lastErr: Error | null = null;
  let lastHtml: string | null = null;

  for (const h of FETCH_PROFILES) {
    try {
      const html = await fetchWallHtml(resolvedUrl, h);
      if (vkWallHtmlLooksValid(html)) return html;
      lastHtml = html;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (Platform.OS !== 'web') {
    const primary = FETCH_PROFILES[0];
    try {
      const viaXhr = await fetchWallHtmlViaXhr(resolvedUrl, primary);
      if (vkWallHtmlLooksValid(viaXhr)) return viaXhr;
      if (!lastHtml || viaXhr.length > lastHtml.length) lastHtml = viaXhr;
    } catch (e) {
      if (!lastErr) lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (lastHtml !== null) return lastHtml;
  throw lastErr ?? new Error('FETCH_FAILED');
}

/**
 * Порядок важен: публичная стена `/wall-{id}` по-прежнему отдаёт SSR с PostContentContainer;
 * страница `/club{id}` часто грузит стену только в SPA — парсеру там нечего разбирать.
 */
function candidateUrls(offset: number, vkGroupId: number): string[] {
  const custom = getVkFeedCustomUrl();
  const list: string[] = [];
  if (custom && offset === 0) {
    list.push(custom);
  }
  list.push(
    getVkWallUrl(offset, vkGroupId),
    getVkClubUrl(offset, vkGroupId),
    getVkClubUrlMobile(offset, vkGroupId),
    getVkWallUrlMobile(offset, vkGroupId),
  );
  return list;
}

export async function fetchVkWallVideoPage(
  offset: number,
  options?: { vkGroupId?: number },
): Promise<VkWallFetchResult> {
  const vkGroupId = options?.vkGroupId ?? getVkGroupId();
  let html = '';
  let lastErr: Error | null = null;
  for (const url of candidateUrls(offset, vkGroupId)) {
    try {
      html = await fetchWallHtmlAnyProfile(url);
      if (vkWallHtmlLooksValid(html)) break;
      lastErr = new Error('VK_WALL_PARSE');
      (lastErr as Error & { code?: string }).code = 'VK_WALL_PARSE';
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (!vkWallHtmlLooksValid(html)) {
    if (!html.trim() && lastErr) {
      throw lastErr;
    }
    const err = new Error('VK_WALL_PARSE');
    (err as Error & { code?: string }).code = 'VK_WALL_PARSE';
    throw err;
  }

  const posts = parseVkWallPosts(html);
  const hasMore = wallHasMorePages(html, offset, vkGroupId);
  const nextOffset = hasMore ? offset + PAGE_STEP : null;
  const communityAvatarUrl = offset === 0 ? extractCommunityAvatarFromVkWallHtml(html) : null;

  return { posts, nextOffset, communityAvatarUrl };
}
