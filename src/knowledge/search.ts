import type { KnowledgeEntry } from './types';

const STOP = new Set([
  'и',
  'в',
  'на',
  'как',
  'что',
  'это',
  'по',
  'из',
  'за',
  'не',
  'а',
  'то',
  'ли',
  'же',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export type RankedKnowledge = { entry: KnowledgeEntry; score: number };

/** Скоринг: приоритет формулировки вопроса и ключевых слов, не «размазывание» по тексту ответа. */
function scoreEntry(query: string, qTokens: string[], e: KnowledgeEntry): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const questionLower = e.question.toLowerCase();
  const kwHay = `${e.keywords.join(' ')}`.toLowerCase();
  const hayFull = `${e.question} ${e.keywords.join(' ')}`.toLowerCase();

  let score = 0;
  if (questionLower.includes(q)) score += 25;
  else if (hayFull.includes(q)) score += 12;

  for (const t of qTokens) {
    if (e.keywords.some((k) => k.includes(t) || t.includes(k))) score += 5;
    if (questionLower.includes(t)) score += 4;
  }

  return score;
}

export function rankKnowledge(query: string, entries: KnowledgeEntry[]): RankedKnowledge[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const qTokens = tokenize(q);
  return entries
    .map((e) => ({ entry: e, score: scoreEntry(q, qTokens, e) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Один лучший матч для ответа в чате (без склейки всех совпадений). */
export function bestKnowledgeEntry(query: string, entries: KnowledgeEntry[]): KnowledgeEntry | null {
  const ranked = rankKnowledge(query, entries);
  return ranked.length > 0 ? ranked[0].entry : null;
}

export function searchKnowledge(query: string, entries: KnowledgeEntry[]): KnowledgeEntry[] {
  return rankKnowledge(query, entries).map((x) => x.entry);
}
