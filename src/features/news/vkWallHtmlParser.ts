/**
 * Парсинг публичной HTML-страницы стены VK (vk.com/club…, /wall-…).
 *
 * VK отдаёт в SSR блоки с `data-exec="…"` — внутри JSON, ключ
 * `PostContentContainer/init` и объект поста (текст, attachments).
 * Вёрстка меняется: перебираем несколько шаблонов и все подходящие `data-exec`.
 */

export type VkWallPostVideo = {
  ownerId: number;
  videoId: number;
  accessKey: string;
};

/** Один пост стены: текст и опционально вложенное видео (для встроенного плеера). */
export type VkWallPost = {
  key: string;
  postId: number;
  ownerId: number;
  dateUnix: number;
  text: string;
  previewUrl: string | null;
  video: VkWallPostVideo | null;
};

/** Жёстко заданные классы и порядок атрибутов (разные сборки фронта VK). */
const CONTAINER_DIV_RES: RegExp[] = [
  /<div class="PostContentContainer__root PostContentContainer" data-exec="([^"]*)">/g,
  /<div[^>]*\bPostContentContainer__root\b[^>]*\bPostContentContainer\b[^>]*data-exec="([^"]*)"/gi,
  /<div[^>]*\bPostContentContainer\b[^>]*data-exec="([^"]*)"/gi,
  /<div[^>]*data-exec="([^"]*)"[^>]*\bPostContentContainer\b[^>]*>/gi,
];

/** Любой тег с data-exec, если внутри явно есть разметка поста. */
const GENERIC_DATA_EXEC_RE = /\bdata-exec="([^"]*)"/g;

const SCRIPT_JSON_RE =
  /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;

function codePointFromEntity(n: number): string {
  return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
}

function decodeAttrEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => codePointFromEntity(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => codePointFromEntity(Number(n)));
}

function stripHtml(html: string): string {
  const noTags = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
  return noTags
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, num) => {
      const n = Number(num);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    })
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => {
      const n = parseInt(hex, 16);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    });
}

function normalizeImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim().replace(/&amp;/g, '&');
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `https://vk.com${trimmed}`;
  return null;
}

function pickPreview(images: { url?: string; width?: number }[] | undefined): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  for (const img of sorted) {
    const normalized = normalizeImageUrl(img.url);
    if (normalized) return normalized;
  }
  return null;
}

type VkInner = {
  item?: {
    text?: string;
    date?: number;
    id?: number;
    owner_id?: number;
    attachments?: Array<{
      type?: string;
      video?: {
        id?: number;
        owner_id?: number;
        access_key?: string;
        title?: string;
        date?: number;
        image?: { url?: string; width?: number }[];
      };
      photo?: {
        sizes?: { url?: string; width?: number }[];
      };
    }>;
  };
};

function collectExecPayloads(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const t = raw.trim();
    if (t.length < 40) return;
    const key = `${t.length}:${t.slice(0, 240)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  for (const re of CONTAINER_DIV_RES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      if (m[1]) push(m[1]);
    }
  }

  GENERIC_DATA_EXEC_RE.lastIndex = 0;
  let gm: RegExpExecArray | null;
  while ((gm = GENERIC_DATA_EXEC_RE.exec(html)) !== null) {
    const raw = gm[1];
    if (!raw || raw.length < 40) continue;
    if (!/PostContentContainer/i.test(raw)) continue;
    push(raw);
  }

  SCRIPT_JSON_RE.lastIndex = 0;
  let sm: RegExpExecArray | null;
  while ((sm = SCRIPT_JSON_RE.exec(html)) !== null) {
    const block = sm[1]?.trim();
    if (!block || !/PostContentContainer/i.test(block)) continue;
    push(block);
  }

  return out;
}

function mapItemToPost(item: NonNullable<VkInner['item']>): VkWallPost | null {
  const postId = item.id;
  const ownerId = item.owner_id;
  if (typeof postId !== 'number' || typeof ownerId !== 'number') return null;

  const dedupeKey = `${ownerId}_${postId}`;
  const text = typeof item.text === 'string' ? stripHtml(item.text) : '';
  const postDate = typeof item.date === 'number' ? item.date : 0;

  let video: VkWallPostVideo | null = null;
  let previewUrl: string | null = null;

  const attachments = item.attachments ?? [];
  for (const att of attachments) {
    if (att.type === 'video' && att.video) {
      const v = att.video;
      const vid = v.id;
      const oid = v.owner_id;
      const accessKey = v.access_key;
      if (typeof vid === 'number' && typeof oid === 'number' && typeof accessKey === 'string') {
        video = { ownerId: oid, videoId: vid, accessKey };
        previewUrl = pickPreview(v.image);
        break;
      }
    }
  }

  if (!previewUrl) {
    for (const att of attachments) {
      if (att.type === 'photo' && att.photo?.sizes?.length) {
        previewUrl = pickPreview(att.photo.sizes);
        if (previewUrl) break;
      }
    }
  }

  return {
    key: dedupeKey,
    postId,
    ownerId,
    dateUnix: postDate,
    text,
    previewUrl,
    video,
  };
}

function tryParseExecPayload(raw: string): VkWallPost | null {
  let parsed: Record<string, VkInner>;
  try {
    parsed = JSON.parse(decodeAttrEntities(raw)) as Record<string, VkInner>;
  } catch {
    return null;
  }
  const inner = parsed['PostContentContainer/init'];
  if (!inner?.item) return null;
  return mapItemToPost(inner.item);
}

export function parseVkWallPosts(html: string): VkWallPost[] {
  const payloads = collectExecPayloads(html);
  const out: VkWallPost[] = [];
  const seen = new Set<string>();

  for (const raw of payloads) {
    const post = tryParseExecPayload(raw);
    if (!post) continue;
    if (seen.has(post.key)) continue;
    seen.add(post.key);
    out.push(post);
  }

  return out;
}

export function vkWallHtmlLooksValid(html: string): boolean {
  if (!html || html.length < 500) return false;
  // Не использовать «wall_module» / «wall_post_» из i18n — они есть на любой странице VK без стены.
  // Страница /club{id} сейчас часто SPA без SSR постов; нужны признаки реальной ленты стены.
  const hasSignals =
    /PostContentContainer|id=["']page_wall_posts["']|page_wall_posts\s+class=|data-post-id=|feed_post_indicator/i.test(
      html,
    );
  return hasSignals;
}

export function buildVkVideoEmbedUrl(p: VkWallPostVideo): string {
  const oid = p.ownerId;
  const id = p.videoId;
  const h = encodeURIComponent(p.accessKey);
  return `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hash=${h}&hd=2&autoplay=1`;
}

const OWN_BLOCK_AVATAR_RE = /<img[^>]+class="ui_ownblock_img"[^>]*\s+src="(https?:\/\/[^"]+)"/i;
const OWN_BLOCK_AVATAR_RE_SRC_FIRST = /<img[^>]+src="(https?:\/\/[^"]+)"[^>]+class="ui_ownblock_img"/i;

/**
 * Аватар сообщества в SSR desktop-страницы стены: блок «шапка» стены, класс `ui_ownblock_img`.
 */
export function extractCommunityAvatarFromVkWallHtml(html: string): string | null {
  if (!html) return null;
  const m1 = OWN_BLOCK_AVATAR_RE.exec(html);
  if (m1?.[1]) return normalizeImageUrl(m1[1].replace(/&amp;/g, '&'));
  const m2 = OWN_BLOCK_AVATAR_RE_SRC_FIRST.exec(html);
  if (m2?.[1]) return normalizeImageUrl(m2[1].replace(/&amp;/g, '&'));
  return null;
}
