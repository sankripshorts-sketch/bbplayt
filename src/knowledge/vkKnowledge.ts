import { getVkNewsWebViewUrl } from '../config/vkNewsConfig';
import type { VkWallPost } from '../features/news/vkWallHtmlParser';
import type { KnowledgeEntry } from './types';

const MAX_DIGEST_CHARS = 1600;
const MAX_POSTS_IN_DIGEST = 5;
const VK_SOURCE_URL = 'https://vk.com/bbplay__tmb';

/**
 * Пытаемся вытащить из текста публикаций интеравал работы (API клуба сейчас график не отдаёт).
 */
export function extractVkScheduleHint(combinedText: string): string | null {
  const t = combinedText.replace(/\s+/g, ' ').trim();
  if (!t) return null;

  if (/круглосуточн|24\s*\/\s*7|24\s*час|24ч\b/u.test(t)) {
    return 'В публикациях сообщества встречается «круглосуточно» или 24/7. Если пользователь спрашивает про сегодня, для точного ответа нужен конкретный филиал.';
  }

  const m1 =
    /(?:^|[\s,.;!])(?:с\s+)?(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})(?:[\s,.;!]|$)/u.exec(t);
  if (m1) {
    const a = m1[1].replace('.', ':');
    const b = m1[2].replace('.', ':');
    return `В публикациях ВК встречается интервал ${a} – ${b}. Если пользователь спрашивает про конкретную дату, для точного ответа нужен филиал и день посещения.`;
  }

  const m2 = /(?:график|работаем|время)\s*работ[^.]{0,40}(\d{1,2}[:.]\d{2})/iu.exec(t);
  if (m2) {
    return `В тексте публикаций есть привязка ко времени (${m2[1].replace('.', ':')}). Если пользователь спрашивает про сегодня, для точного ответа нужен филиал.`;
  }

  return null;
}

function trimPost(s: string, max: number): string {
  const x = s.replace(/\s+/g, ' ').trim();
  if (x.length <= max) return x;
  return x.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Подмешивание к базе знаний, если в API нет аналогов: график (эвристика) и свежий контент со стены.
 * Не перетирает карточки, собранные из API (id не совпадают), кроме `club-hours` — общая карточка.
 */
export function buildVkSupplement(args: { posts: VkWallPost[] | null; vkGroupId: number }): KnowledgeEntry[] {
  const { posts, vkGroupId } = args;
  if (!posts?.length) return [];

  const wallUrl = getVkNewsWebViewUrl(vkGroupId);

  const digestParts: string[] = [];
  let total = 0;
  for (const p of posts.slice(0, MAX_POSTS_IN_DIGEST)) {
    if (total >= MAX_DIGEST_CHARS) break;
    const line = trimPost(p.text, 400);
    if (!line) continue;
    const chunk = `— ${line}`;
    if (total + chunk.length + 1 > MAX_DIGEST_CHARS) break;
    digestParts.push(chunk);
    total += chunk.length + 1;
  }
  const digest = digestParts.join('\n');

  const out: KnowledgeEntry[] = [];

  if (digest) {
    out.push({
      id: 'promo-vk-recent',
      category: 'club',
      question: 'Акции, скидки, новости клуба (даджест публикаций)',
      answer:
        `Дополнительные публикации BBplay из VK (${VK_SOURCE_URL}), которые не приходят из API приложения:\n` +
        `${digest}\n\n` +
        `Ссылка на ленту: ${wallUrl}`,
      keywords: [
        'акци',
        'скидк',
        'промо',
        'новост',
        'розыгрыш',
        'конкурс',
        'публикац',
        'вк',
        'сообществ',
        'тамбов',
        'bbplay',
      ],
    });
  }

  return out;
}
