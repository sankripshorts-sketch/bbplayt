import type { CafeItem, StructRoomsData } from '../api/types';
import type { KnowledgeEntry } from './types';

function label(c: CafeItem): string {
  return (c.name?.trim() || c.address).trim();
}

/**
 * Снимок /struct-rooms-icafe: зоны и число ПК (для справки «какие залы / вип / тренирочка»).
 */
export function buildStructKnowledge(
  cafes: CafeItem[],
  structs: (StructRoomsData | null)[],
): KnowledgeEntry[] {
  if (cafes.length === 0) return [];
  const out: KnowledgeEntry[] = [];
  const summaryLines: string[] = [];
  const splitAddr = (c: CafeItem) =>
    c.address
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 3);

  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    const data = structs[i];
    if (!data?.rooms?.length) continue;

    const byArea = new Map<string, number>();
    for (const room of data.rooms) {
      const name = (room.area_name ?? 'Зал').trim() || 'Зал';
      const n = room.pcs_list?.length ?? 0;
      byArea.set(name, (byArea.get(name) ?? 0) + n);
    }
    const parts = [...byArea.entries()].map(([area, n]) => (n > 0 ? `${area} — ${n} ПК` : area));

    if (parts.length === 0) continue;

    summaryLines.push(`${label(cafe)} (${cafe.address}):\n${parts.map((p) => `• ${p}`).join('\n')}`);

    const kw = new Set<string>([
      'зона',
      'зоны',
      'зал',
      'вип',
      'мест',
      'пк',
      'схема',
      'карта зала',
      'территор',
      'этаж',
      ...splitAddr(cafe),
    ]);
    for (const a of byArea.keys()) {
      a
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .forEach((w) => kw.add(w));
    }

    out.push({
      id: `club-rooms-icafe-${cafe.icafe_id}`,
      category: 'club',
      question: `${label(cafe)}: зоны зала, сколько ПК в зонах`,
      answer:
        `По схеме зала для ${label(cafe)} (${cafe.address}):\n` +
        `${parts.map((p) => `• ${p}`).join('\n')}\n` +
        'Точные номера столов — в брони на схеме зала.',
      keywords: [...kw],
    });
  }

  if (summaryLines.length > 0) {
    out.unshift({
      id: 'club-rooms-icafe-all',
      category: 'club',
      question: 'Какие зоны и сколько ПК в клубах (общий зал, VIP, тренирочка)',
      answer:
        'Залы и число ПК по клубам:\n' +
        summaryLines.join('\n\n') +
        '\n\nНомер конкретного стола — в «Бронь» на схеме.',
      keywords: ['зона', 'зоны', 'вип', 'тренироч', 'тренирочк', 'общий зал', 'сколько пк', 'схема', 'карта зала'],
    });
  }

  return out;
}
