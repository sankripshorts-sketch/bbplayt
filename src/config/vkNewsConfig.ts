/**
 * Новости VK: публичная стена сообщества без WebView всей группы.
 *
 * Идентификатор группы (положительное число) — из ссылки vk.com/bbplay__tmb или club221562447.
 * Переопределение: EXPO_PUBLIC_VK_GROUP_ID.
 */
export function getVkGroupId(): number {
  const raw = process.env.EXPO_PUBLIC_VK_GROUP_ID;
  if (raw && /^\d+$/.test(raw.trim())) return Number.parseInt(raw.trim(), 10);
  return 221562447;
}

export function getVkWallUrl(offset: number): string {
  const id = getVkGroupId();
  const q = offset > 0 ? `?offset=${offset}` : '';
  return `https://vk.com/wall-${id}${q}`;
}

/** Запасной вариант (иногда отдаёт более стабильную вёрстку для парсера). */
export function getVkWallUrlMobile(offset: number): string {
  const id = getVkGroupId();
  const q = offset > 0 ? `?offset=${offset}` : '';
  return `https://m.vk.com/wall-${id}${q}`;
}

/** Страница сообщества — часто стабильнее для парсера, чем /wall-{id}. */
export function getVkClubUrl(offset: number): string {
  const id = getVkGroupId();
  const q = offset > 0 ? `?offset=${offset}` : '';
  return `https://vk.com/club${id}${q}`;
}

export function getVkClubUrlMobile(offset: number): string {
  const id = getVkGroupId();
  const q = offset > 0 ? `?offset=${offset}` : '';
  return `https://m.vk.com/club${id}${q}`;
}

/**
 * Полный URL ленты (если задан) — иначе перебираем типичные пути VK.
 * EXPO_PUBLIC_VK_FEED_CUSTOM_URL=https://vk.com/club123?w=wall-123_...
 */
export function getVkFeedCustomUrl(): string | undefined {
  const u = process.env.EXPO_PUBLIC_VK_FEED_CUSTOM_URL?.trim();
  if (u && /^https?:\/\//i.test(u)) return u;
  return undefined;
}

/**
 * URL для WebView: мобильная стена сообщества (устойчивее, чем парсинг HTML / прямой fetch — VK часто отдаёт 418 ботам).
 * Переопределение: EXPO_PUBLIC_VK_M_URL=https://m.vk.com/club123 или https://m.vk.com/screen_name
 */
export function getVkNewsWebViewUrl(): string {
  const custom = process.env.EXPO_PUBLIC_VK_M_URL?.trim();
  if (custom && /^https?:\/\//i.test(custom)) return custom;
  const fromFeed = getVkFeedCustomUrl();
  if (fromFeed) return fromFeed.replace(/^https?:\/\/(www\.)?vk\.com/i, 'https://m.vk.com');
  const id = getVkGroupId();
  return `https://m.vk.com/club${id}`;
}

/** Прямая ссылка на запись стены (для «Открыть в VK»). */
export function getVkWallPostUrl(ownerId: number, postId: number): string {
  return `https://vk.com/wall${ownerId}_${postId}`;
}

/**
 * Обход CORS (web) или блокировок: прокси GET, который подставляет целевой URL.
 * Пример: EXPO_PUBLIC_VK_WALL_PROXY_TEMPLATE=https://your.api/fetch-vk?url={{url}}
 * Плейсхолдер {{url}} заменяется на encodeURIComponent(исходный URL vk.com/…).
 */
export function applyVkWallFetchProxyTemplate(canonicalUrl: string): string {
  const tmpl = process.env.EXPO_PUBLIC_VK_WALL_PROXY_TEMPLATE?.trim();
  if (tmpl && tmpl.includes('{{url}}')) {
    return tmpl.replace('{{url}}', encodeURIComponent(canonicalUrl));
  }
  return canonicalUrl;
}
